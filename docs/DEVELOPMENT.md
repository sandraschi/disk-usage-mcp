# Development — disk-usage-mcp

## Setup

```powershell
uv sync
cd web_sota; bun install; cd ..
.\start.ps1            # full stack (backend :11114, frontend :11115)
```

## Gates

```powershell
just certify          # ruff + format check + pytest + webapp typecheck
just coverage         # pytest with coverage floor (currently 40)
```

- Python: `uv run ruff check src/ run_server.py`, `uv run ruff format`, `uv run pyright src/`
- Web: `bun run typecheck`, `bun run biome:ci`, `bun run build`
- E2E: `bun run e2e` (spins backend + frontend via playwright webServer)

## Adding an MCP tool

1. Implement in `src/disk_usage_mcp/tools/<name>.py` — Annotated+Field params,
   `## Return Format` + `## Examples` docstring, dialogic `{success, message, ...}` return.
2. Register in `src/disk_usage_mcp/server.py` with `readOnlyHint` + `output_schema`.
3. Add to `TOOL_DEFS` in `http_app.py`, `manifest.json`, `llms-full.txt`, `docs/TOOLS.md`.

## Adding a REST endpoint

Add the route in `http_app.py`, list it in the `/api/capabilities` endpoint map,
cover it in `tests/test_round2.py`, and add a client in `web_sota/src/lib/api.ts`
if the frontend needs it.

## Adding a page

Create `web_sota/src/pages/<Name>.tsx` (loading + error-retry + empty states,
≥3 `data-testid`), register the route in `App.tsx` and nav in `Sidebar.tsx`.

## Pre-commit

`.pre-commit-config.yaml` runs ruff + biome. Install hooks with `just bootstrap`
(`pre-commit install`). Never commit `.env`, `*.bak`, `reports/`, e2e artifacts.
