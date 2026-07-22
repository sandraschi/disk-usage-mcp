"""Disk Usage MCP Server — FastMCP 3.4+ with FastAPI REST backend."""

import asyncio
import logging
import os

from fastmcp import FastMCP

from disk_usage_mcp.tools.disk_usage import disk_usage
from disk_usage_mcp.tools.duplicates import find_duplicates
from disk_usage_mcp.tools.overview import get_drive_overview
from disk_usage_mcp.tools.scan import find_large_files, scan_path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("disk-usage-mcp")

mcp = FastMCP(
    "disk-usage-mcp",
    version="0.1.0",
)

mcp.tool(name="scan_path", annotations={"readonly": True})(scan_path)
mcp.tool(name="find_large_files", annotations={"readonly": True})(find_large_files)
mcp.tool(name="get_drive_overview", annotations={"readonly": True})(get_drive_overview)
mcp.tool(name="find_duplicates", annotations={"readonly": True})(find_duplicates)
mcp.tool(name="disk_usage", annotations={"readonly": True})(disk_usage)


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

    from disk_usage_mcp.http_app import app as fastapi_app

    fastapi_app.mount("/mcp", app=mcp.http_app())

    logger.info("Starting HTTP server on %s:%s", host, port)
    uvicorn.run(fastapi_app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
