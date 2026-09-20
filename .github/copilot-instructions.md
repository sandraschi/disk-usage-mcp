# Copilot instructions — disk-usage-mcp

This repo is a FastMCP 3.4 + FastAPI disk-usage analysis server with a React/Vite dashboard.

- Tools: `scan_path`, `find_large_files`, `get_drive_overview`, `find_duplicates`, `disk_usage` (portmanteau: scan/tree/drive_overview), `parse_dj_database`, `server_help` — all in `src/disk_usage_mcp/tools/`
- All tool returns are dialogic: `{"success": bool, "message": str, ...}` — always include `message`
- Tool list single source of truth: `TOOL_DEFS` in `src/disk_usage_mcp/http_app.py` — keep `manifest.json` and `llms-full.txt` in sync
- MCP mount: `mcp.http_app(path="/")` at `/mcp` (never bare `http_app()` under a mount); extend the combined lifespan in `server.py`
- Ports 11114/11115 come from config/env, never hardcoded; run gates with `just certify`
