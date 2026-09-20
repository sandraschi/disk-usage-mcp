"""Disk Usage MCP Server - FastMCP 3.4+ with FastAPI REST backend."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastmcp import FastMCP
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

mcp.tool(name="scan_path", annotations=_READONLY)(scan_path)
mcp.tool(name="find_large_files", annotations=_READONLY)(find_large_files)
mcp.tool(name="get_drive_overview", annotations=_READONLY)(get_drive_overview)
mcp.tool(name="find_duplicates", annotations=_READONLY)(find_duplicates)
mcp.tool(name="disk_usage", annotations=_READONLY)(disk_usage)
mcp.tool(name="parse_dj_database", annotations=_READONLY)(parse_dj_database)


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


mcp.tool(name="server_help", annotations=_READONLY)(server_help)


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
