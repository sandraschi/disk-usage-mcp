"""PyInstaller entry point — dual transport."""
import os
import sys

# Eager-load stdlib C extensions that PyInstaller may miss
import _datetime  # noqa: F401
import _strptime  # noqa: F401

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

port = os.environ.get("MCP_PORT") or os.environ.get("PORT")
if port:
    import uvicorn
    from disk_usage_mcp.http_app import app

    host = os.environ.get("MCP_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=int(port), log_level="info")
else:
    from disk_usage_mcp.server import mcp
    mcp.run()
