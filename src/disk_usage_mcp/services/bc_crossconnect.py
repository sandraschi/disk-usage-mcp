"""Beyond Compare crossconnect: disk-usage suspects, BC confirms.

Division of labour (see skills/disk-usage/SKILL.md): dua/czkawka find
* candidates (big trees, hash-dupe groups); Beyond Compare gives the
authoritative byte-level verdict before anything is quarantined or deleted.

Transport note: beyondcompare-mcp exposes NO REST for folder comparison
(its HTTP surface is gateway-only: /api/v1/health, /api/v1/logs,
/api/capabilities). So this adapter speaks MCP — fastmcp.Client over
streamable HTTP at /mcp — instead of the CrossconnectPeer REST base.
Same contract: dialogic returns, soft degradation, env-overridable URL,
tool discovery instead of hardcoded tool names.
"""

import asyncio
import json
import logging
import os

logger = logging.getLogger(__name__)

BC_PEER_NAME = "beyondcompare-mcp"
BC_MCP_URL = os.getenv("BEYONDCOMPARE_MCP_URL", "http://127.0.0.1:10841")
BC_MCP_PATH = os.getenv("BEYONDCOMPARE_MCP_PATH", "/mcp")
BC_REPO_URL = "https://github.com/sandraschi/beyondcompare-mcp"

# Compare on multi-TB trees takes minutes; 15s would misreport slow-but-fine
# as unreachable (pattern rule 4). Matches runner.py's dua timeout.
BC_COMPARE_TIMEOUT = float(os.getenv("BEYONDCOMPARE_COMPARE_TIMEOUT", "300"))
BC_STATUS_TIMEOUT = 5.0


def _mcp_url() -> str:
    return f"{BC_MCP_URL.rstrip('/')}{BC_MCP_PATH}"


def _unreachable(detail: str) -> dict:
    return {
        "success": False,
        "reachable": False,
        "message": (
            f"{BC_PEER_NAME} not reachable at {_mcp_url()} ({detail}). "
            f"Start it, or set BEYONDCOMPARE_MCP_URL. Repo: {BC_REPO_URL}"
        ),
        "error": str(detail),
    }


async def bc_status() -> dict:
    """Probe BC over MCP: reachable + which compare tools it exposes. Fast."""
    from fastmcp import Client

    async def _probe() -> dict:
        async with Client(_mcp_url()) as client:
            tools = await client.list_tools()
            names = [t.name for t in tools]
            return {
                "success": True,
                "reachable": True,
                "message": f"{BC_PEER_NAME} reachable ({len(names)} tools)",
                "tools": names,
            }

    try:
        return await asyncio.wait_for(_probe(), timeout=BC_STATUS_TIMEOUT)
    except Exception as e:
        logger.warning("BC status probe failed: %s", e)
        out = _unreachable(e)
        out["tools"] = []
        return out


def _pick_compare_tool(names: list[str]) -> str | None:
    """Never hardcode what the peer can tell you live: discover the compare tool."""
    if "compare_folders" in names:
        return "compare_folders"
    for n in names:
        low = n.lower()
        if "compare" in low and "folder" in low:
            return n
    return None


def _tool_text(result: object) -> str:
    """Extract human/JSON text from a fastmcp CallToolResult, defensively."""
    try:
        content = getattr(result, "content", None) or []
        parts = []
        for block in content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        structured = getattr(result, "structured_content", None)
        if structured and not parts:
            return json.dumps(structured, default=str)
        return "\n".join(parts) if parts else json.dumps(structured, default=str)
    except Exception:
        return str(result)


async def bc_compare_folders(left_path: str, right_path: str, include_subfolders: bool = True) -> dict:
    """Authoritative BC folder comparison. Local paths are validated first (fast fail)."""
    if not left_path or not os.path.isdir(left_path):
        err = f"Left path not found: {left_path}"
        return {"success": False, "reachable": True, "message": err, "error": err}
    if not right_path or not os.path.isdir(right_path):
        err = f"Right path not found: {right_path}"
        return {"success": False, "reachable": True, "message": err, "error": err}

    from fastmcp import Client

    async def _compare() -> dict:
        async with Client(_mcp_url()) as client:
            tools = await client.list_tools()
            tool = _pick_compare_tool([t.name for t in tools])
            if tool is None:
                err = f"{BC_PEER_NAME} exposes no folder-compare tool (has: {len(tools)} others)"
                return {"success": False, "reachable": True, "message": err, "error": err}
            result = await client.call_tool(
                tool,
                {
                    "left_path": left_path,
                    "right_path": right_path,
                    "include_subfolders": include_subfolders,
                },
            )
            text = _tool_text(result)
            try:
                data = json.loads(text)
            except (json.JSONDecodeError, TypeError):
                data = {"report": text}
            return {
                "success": True,
                "reachable": True,
                "message": f"BC compared {left_path} vs {right_path}",
                "tool": tool,
                "data": data,
            }

    try:
        return await asyncio.wait_for(_compare(), timeout=BC_COMPARE_TIMEOUT)
    except TimeoutError:
        err = f"{BC_PEER_NAME} compare timed out after {BC_COMPARE_TIMEOUT:g}s — it may still be working; check BC directly"
        logger.warning(err)
        return {"success": False, "reachable": True, "message": err, "error": err}
    except Exception as e:
        logger.warning("BC compare failed: %s", e)
        return _unreachable(e)
