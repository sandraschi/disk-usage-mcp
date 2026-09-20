# CLAUDE.md — disk-usage-mcp

Disk usage analysis MCP server (dua-cli + czkawka_cli + VDJ/Serato parsers) with FastAPI REST backend and React/Vite dashboard.

## Entry points

- `src/disk_usage_mcp/server.py` — FastMCP server, `build_app()` (REST + `/mcp`), `main()` dual transport (`MCP_PORT` → HTTP, else stdio)
- `src/disk_usage_mcp/http_app.py` — FastAPI app, REST routes, `TOOL_DEFS` (single source of truth for tool list)
- `run_server.py` — PyInstaller sidecar entry (same `build_app()`)
- `web_sota/` — Vite React dashboard (backend :11114, frontend :11115)
- `native/` — Tauri shell + backend.rs sidecar manager

## Standards

- Fleet-wide rules: `D:\Dev\repos\mcp-central-docs\standards\AGENT_PROTOCOLS.md`
- Tool design: Annotated+Field params, `## Return Format` + `## Examples` docstrings, dialogic `{success, message, ...}` returns, `readOnlyHint` annotations
- Mount pattern: `mcp.http_app(path="/")` at `/mcp` with merged lifespan (see STARLETTE_NO_PYDANTIC_STANDARD.md)
- Never hardcode ports (11114/11115 via config/env); never commit `.env`, `*.bak`, reports/

## Key files

- `fleet-start.config.ps1` — launcher ports + HealthPath `/health`
- `pyproject.toml` — ruff (E,F,I,W,UP,T20), pytest asyncio_mode=auto
- `justfile` — `serve`, `lint`, `fmt`, `test`, `certify`, `mcpb-pack`, `build-native`, `cua-nsis-test`
- `tests/` — pytest HTTP smoke + config + imports + runner + dj
