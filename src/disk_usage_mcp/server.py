"""Disk Usage MCP Server - FastMCP 3.4+ with FastAPI REST backend."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastmcp import Context, FastMCP
from fastmcp.tools import ToolResult
from prefab_ui.app import PrefabApp
from pydantic import Field

from disk_usage_mcp.tools.disk_usage import disk_usage
from disk_usage_mcp.tools.dj import parse_dj_database
from disk_usage_mcp.tools.duplicates import find_duplicates
from disk_usage_mcp.tools.overview import get_drive_overview
from disk_usage_mcp.tools.scan import find_large_files, scan_path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("disk-usage-mcp")

mcp = FastMCP(
    "disk-usage-mcp",
    version="0.1.0",
)

_READONLY = {"readOnlyHint": True}
_OBJECT_SCHEMA: dict = {"type": "object", "required": ["success", "message"]}

mcp.tool(name="scan_path", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(scan_path)
mcp.tool(name="find_large_files", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(find_large_files)
mcp.tool(name="get_drive_overview", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(get_drive_overview)
mcp.tool(name="find_duplicates", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(find_duplicates)
mcp.tool(name="disk_usage", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(disk_usage)
mcp.tool(name="parse_dj_database", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(parse_dj_database)


async def server_help(
    topic: Annotated[str | None, Field(description="Optional topic: tools, rest, snapshots, dj")] = None,
) -> dict:
    """List available tools and REST endpoints for this server.

    ## Return Format
    {"success": bool, "message": str, "tools": [...], "endpoints": [...]}

    ## Examples
    await server_help()
    await server_help(topic="snapshots")
    """
    from disk_usage_mcp.http_app import TOOL_DEFS
    from disk_usage_mcp.http_app import app as fastapi_app

    routes = sorted({r.path for r in fastapi_app.routes if hasattr(r, "path") and r.path.startswith("/api")})
    tools = TOOL_DEFS
    if topic == "snapshots":
        routes = [r for r in routes if "snapshot" in r]
    elif topic == "dj":
        tools = [t for t in tools if "dj" in t["name"]]
    return {
        "success": True,
        "message": f"disk-usage-mcp: {len(tools)} tools, {len(routes)} REST routes",
        "tools": tools,
        "endpoints": routes,
    }


mcp.tool(name="server_help", annotations=_READONLY, output_schema=_OBJECT_SCHEMA)(server_help)


@mcp.prompt(name="reclaim-plan", description="Plan a disk-space reclamation pass across drives.")
def reclaim_plan_prompt(
    drives: Annotated[str, Field(description="Comma-separated drive roots, e.g. D:\\,E:\\")] = "D:\\",
    min_size_gb: Annotated[float, Field(description="Large-file threshold in GB")] = 5.0,
) -> str:
    """Build a step-by-step reclamation plan prompt for the agent."""
    return (
        f"Plan a disk-space reclamation pass over these drives: {drives}.\n"
        "Steps:\n"
        "1. Call get_drive_overview for the drives to rank them by usage.\n"
        f"2. Call find_large_files on the fullest drive with min_size_gb={min_size_gb}.\n"
        "3. Call find_duplicates across the drives (min_size_mb=100).\n"
        "4. Summarize reclaimable space: large files total + duplicate groups total.\n"
        "5. Recommend what to delete, move, or dedupe first. Never delete without asking."
    )


@mcp.prompt(name="snapshot-compare", description="Compare two snapshots to explain disk growth.")
def snapshot_compare_prompt(
    older: Annotated[str, Field(description="Older snapshot filename")] = "",
    newer: Annotated[str, Field(description="Newer snapshot filename")] = "",
) -> str:
    """Build a snapshot-comparison prompt for the agent."""
    return (
        "Compare two disk-usage snapshots and explain what grew.\n"
        f"Older: {older or '<pick from /api/snapshots>'}\n"
        f"Newer: {newer or '<pick from /api/snapshots>'}\n"
        "Steps:\n"
        "1. Fetch both via GET /api/snapshot/{filename} (or the snapshots tool).\n"
        "2. Use GET /api/snapshot/diff?from=<older>&to=<newer> for per-path deltas.\n"
        "3. Report the top growers in GB and percent, and suggest causes."
    )


@mcp.resource("drive://list", name="drives", description="List available drives.")
async def list_drives() -> str:
    """List available drive letters with usage stats."""
    import shutil

    drives = []
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        try:
            path = f"{letter}:\\"
            usage = shutil.disk_usage(path)
            drives.append(
                {
                    "drive": path,
                    "total_gb": round(usage.total / (1024**3), 1),
                    "used_gb": round((usage.total - usage.free) / (1024**3), 1),
                    "free_gb": round(usage.free / (1024**3), 1),
                    "percent_used": round((1 - usage.free / usage.total) * 100, 1) if usage.total else 0,
                }
            )
        except Exception:
            continue
    return "\n".join(f"{d['drive']}: {d['used_gb']}/{d['total_gb']} GB ({d['percent_used']}%)" for d in drives)


def _skills_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "skills"


def _read_skill(name: str) -> str | None:
    if not name or "/" in name or "\\" in name or ".." in name:
        return None
    skill_file = _skills_dir() / name / "SKILL.md"
    if not skill_file.is_file():
        return None
    return skill_file.read_text(encoding="utf-8")


@mcp.resource("skill://disk-usage", name="skill-disk-usage", description="Disk usage analysis skill content.")
async def skill_disk_usage() -> str:
    """Serve the bundled disk-usage skill as an MCP resource."""
    content = _read_skill("disk-usage")
    return content or "Skill 'disk-usage' not found."


@mcp.tool(app=True)
async def show_drives_card(ctx: Context) -> ToolResult:
    """Show available drives as a rich Prefab card.

    ## Return Format
    ToolResult with human-readable text + PrefabApp structured content.

    ## Examples
    await show_drives_card()
    """
    from prefab_ui.components import Card, CardContent, Column, Grid, Heading, Muted, Separator

    drives_text = await list_drives()
    rows = []
    for line in drives_text.splitlines():
        drive, _, rest = line.partition(":")
        rows.append((drive.strip() + ":", rest.strip()))

    with Column(gap=4, cssClass="p-4") as view:
        Heading("Disk Usage - Drives")
        Separator()
        with Grid(columns=3, gap=3):
            for drive, rest in rows:
                with Card(), CardContent(cssClass="pt-4"):
                    Muted(drive)
                    Heading(rest)

    await ctx.info(f"Rendered drives card with {len(rows)} drives")
    return ToolResult(
        content=f"Available drives ({len(rows)}):\n{drives_text}",
        structured_content=PrefabApp(view=view, title="Disk Usage - Drives"),
    )


@mcp.tool(app=True)
async def show_duplicates_card(
    ctx: Context,
    search_paths: Annotated[list[str], Field(description="Directories or drive roots to scan")] = [],
    min_size_mb: Annotated[int, Field(description="Minimum file size in MB", ge=1)] = 100,
) -> ToolResult:
    """Show duplicate-file groups as a rich Prefab card.

    ## Return Format
    ToolResult with human-readable text + PrefabApp structured content.

    ## Examples
    await show_duplicates_card(search_paths=["D:\\", "E:\\"])
    """
    from prefab_ui.components import Card, CardContent, Column, Grid, Heading, Muted, Separator

    if not search_paths:
        return ToolResult(
            content="No search paths given. Pass search_paths, e.g. ['D:\\', 'E:\\'].",
            structured_content=PrefabApp(title="Duplicates - no input"),
        )
    result = await find_duplicates(search_paths=search_paths, min_size_mb=min_size_mb, ctx=ctx)
    groups = result.get("duplicates", []) if result.get("success") else []

    with Column(gap=4, cssClass="p-4") as view:
        Heading(f"Duplicates - {len(groups)} groups")
        Separator()
        with Grid(columns=2, gap=3):
            for group in groups[:12]:
                files = group.get("files", [])
                with Card(), CardContent(cssClass="pt-4"):
                    Muted(f"{group.get('size_mb', 0)} MB x {len(files)}")
                    Heading(str(files[0]) if files else "(no path)")

    text = result.get("message", "Duplicate scan finished.")
    if groups:
        text += "\n" + "\n".join(
            f"- {g.get('size_mb', 0)} MB: {', '.join(g.get('files', [])[:3])}" for g in groups[:10]
        )
    return ToolResult(content=text, structured_content=PrefabApp(view=view, title="Duplicates"))


def build_app():
    """Build the combined FastAPI app: REST routes + MCP streamable HTTP at /mcp.

    Uses the canonical fleet pattern: ``mcp.http_app(path="/")`` mounted at
    ``/mcp`` (avoids the BUG-008 double prefix) with the sub-app lifespan
    entered inside the parent lifespan (BUG-038), preserving http_app's own
    lifespan (snapshot-dir init).
    """
    from disk_usage_mcp.http_app import app as fastapi_app
    from disk_usage_mcp.http_app import lifespan as http_lifespan

    mcp_http = mcp.http_app(path="/")

    @asynccontextmanager
    async def combined_lifespan(parent):
        async with mcp_http.router.lifespan_context(parent):
            async with http_lifespan(parent):
                yield

    fastapi_app.router.lifespan_context = combined_lifespan
    fastapi_app.mount("/mcp", app=mcp_http)
    return fastapi_app


def main():
    port = os.environ.get("MCP_PORT") or os.environ.get("PORT")
    if port:
        _run_http(int(port))
    else:
        asyncio.run(mcp.run_stdio_async())


def _run_http(port: int):
    """Start the FastAPI HTTP server (REST + MCP streamable HTTP)."""
    host = os.environ.get("MCP_HOST", "127.0.0.1")
    import uvicorn

    fastapi_app = build_app()

    logger.info("Starting HTTP server on %s:%s", host, port)
    uvicorn.run(fastapi_app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
