import asyncio
import json
import logging
import re
import shutil
import tempfile
from pathlib import Path

from disk_usage_mcp.config import CZKAWKA_BIN

logger = logging.getLogger(__name__)

# Winget installs the binary as windows_czkawka_cli, cargo as czkawka_cli.
_CZKAWKA_CANDIDATES = ("czkawka_cli", "windows_czkawka_cli")

# dua 2.x aggregate table row: "<size:>10 b <indent><name>", indent = 2 spaces per level.
_DUA_ROW = re.compile(r"^ *(\d+) b (.*)$")


def _resolve_binary(name: str, fallbacks: tuple[str, ...] = ()) -> str:
    """Resolve a CLI binary via PATH, trying fallbacks (winget vs cargo names)."""
    seen: list[str] = []
    for candidate in (name, *fallbacks):
        if candidate in seen:
            continue
        seen.append(candidate)
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    logger.warning("Binary %s not found on PATH (tried %s) - tool calls will fail", name, ", ".join(seen))
    return name


async def _run(cmd: list[str], timeout: int = 120) -> tuple[str, str, int]:
    """Run a subprocess asynchronously and return (stdout, stderr, returncode)."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace"), proc.returncode or 0
    except TimeoutError:
        proc.kill()
        await proc.wait()
        msg = f"Command timed out after {timeout}s: {' '.join(cmd)}"
        logger.exception(msg)
        return "", msg, -1


def _parse_dua_tree(output: str, root_name: str) -> dict:
    """Parse `dua aggregate --format bytes -d N` text tree into a JSON hierarchy.

    Row shape is "<size:>10 b <indent><name>" with 2-space indent per level.
    Directories are nodes that gain children; leaves are files. The trailing
    "total" summary line is dropped. Sizes are disk usage in bytes.
    """
    top: list[dict] = []
    stack: list[tuple[int, dict]] = []  # (level, node)
    lines = [ln for ln in output.splitlines() if ln.strip()]
    for index, line in enumerate(lines):
        m = _DUA_ROW.match(line)
        if not m:
            continue
        size = int(m.group(1))
        rest = m.group(2)
        indent = len(rest) - len(rest.lstrip(" "))
        name = rest.strip()
        if not name:
            continue
        level = indent // 2
        if level == 0 and name == "total" and index == len(lines) - 1:
            continue  # dua's trailing summary line, not a real entry
        node: dict = {"name": name, "size": size}
        while stack and stack[-1][0] >= level:
            stack.pop()
        if stack:
            parent = stack[-1][1]
            parent.setdefault("children", []).append(node)
        else:
            top.append(node)
        stack.append((level, node))
    return {"name": root_name, "size": sum(n["size"] for n in top), "children": top}


async def run_dua(path: str, max_depth: int = 3) -> dict:
    """Run dua 2.x aggregate and return the parsed hierarchy."""
    binary = _resolve_binary("dua")
    cmd = [binary, "aggregate", "--format", "bytes", "-d", str(max_depth), path]
    stdout, stderr, rc = await _run(cmd, timeout=300)
    if rc != 0:
        return {"success": False, "error": stderr.strip() or f"dua exited with code {rc}"}
    try:
        return {"success": True, "data": _parse_dua_tree(stdout, path)}
    except Exception as e:
        return {"success": False, "error": f"Failed to parse dua output: {e}"}


async def run_dua_tree(path: str, max_depth: int = 3) -> dict:
    """Run dua 2.x aggregate with human-readable tree output."""
    binary = _resolve_binary("dua")
    cmd = [binary, "aggregate", "-d", str(max_depth), path]
    stdout, stderr, rc = await _run(cmd, timeout=300)
    if rc != 0:
        return {"success": False, "error": stderr.strip() or f"dua exited with code {rc}"}
    return {"success": True, "output": stdout}


def _normalize_czkawka_json(data: dict) -> list[dict]:
    """Normalize czkawka 12 compact JSON ({size: [[{path,size,hash}]]}) to groups."""
    groups: list[dict] = []
    if not isinstance(data, dict):
        return groups
    for _size_key, buckets in data.items():
        if not isinstance(buckets, list):
            continue
        for bucket in buckets:
            if not isinstance(bucket, list) or not bucket:
                continue
            files = [f.get("path", "") for f in bucket if isinstance(f, dict) and f.get("path")]
            if len(files) < 2:
                continue
            first = bucket[0]
            size = first.get("size", 0) if isinstance(first, dict) else 0
            file_hash = first.get("hash", "") if isinstance(first, dict) else ""
            groups.append({"hash": file_hash, "size": size, "files": files})
    return groups


async def run_czkawka_dups(paths: list[str], min_size_mb: int = 100) -> dict:
    """Run czkawka 12 dup (JSON via temp file) and return normalized groups."""
    binary = _resolve_binary(CZKAWKA_BIN, _CZKAWKA_CANDIDATES)
    min_bytes = str(min_size_mb * 1024 * 1024)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", prefix="czkawka-")
    tmp_path = tmp.name
    tmp.close()
    try:
        cmd = [binary, "dup"] + [arg for p in paths for arg in ("-d", p)] + ["-m", min_bytes, "-C", tmp_path]
        _stdout, stderr, rc = await _run(cmd, timeout=600)
        try:
            data = json.loads(Path(tmp_path).read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            # No usable result file: now the exit code matters.
            if rc != 0:
                return {"success": False, "error": stderr.strip() or f"czkawka exited with code {rc}"}
            return {"success": False, "error": f"Failed to read czkawka result file: {e}"}
        if rc not in (0, 11):
            # czkawka 12 uses non-zero status codes on success (e.g. 11 = hits found).
            logger.debug("czkawka exited with status %s; result file parsed OK", rc)
        files = _normalize_czkawka_json(data)
        total_size = sum(g["size"] for g in files)
        return {"success": True, "files": files, "total_size": total_size}
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except OSError:
            pass


async def run_find_large(path: str, min_size_gb: float = 1.0, limit: int = 50) -> dict:
    """Find large files using a fast filesystem traversal (dua or direct)."""
    binary = _resolve_binary("dua")
    cmd = [binary, "aggregate", "--format", "bytes", "-d", "1", path]
    stdout, stderr, rc = await _run(cmd, timeout=120)
    if rc != 0:
        return {"success": False, "error": stderr.strip() or f"dua exited with code {rc}"}
    return {"success": True, "raw": stdout}
