# AGENTS.md — disk-usage-mcp

Quick-ref for IDE agents working in this repo.

- Stack: FastMCP 3.4 + FastAPI + uvicorn; React 19 + Vite 6 + Tailwind v4 + Zustand (web_sota/)
- Ports: backend 11114, frontend 11115 (fleet registry + fleet-start.config.ps1)
- Run: `.\start.ps1` (full stack) or `uv run python -m disk_usage_mcp.server` (stdio)
- Gates: `just certify` (ruff + format check + pytest + tsc)
- Tools live in `src/disk_usage_mcp/tools/`; keep `TOOL_DEFS` in http_app.py, manifest.json, and llms-full.txt in sync when adding tools
- Returns are dialogic: always include `message` alongside `success`
- Mount rule: `mcp.http_app(path="/")` mounted at `/mcp`; extend `combined_lifespan` in server.py, never overwrite `router.lifespan_context` with a single lifespan
