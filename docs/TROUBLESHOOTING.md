# Troubleshooting — disk-usage-mcp

## Dashboard shows Offline

Backend not running. Run `.\start.ps1` (or `just mcp-http` for backend only).
The topbar retries with exponential backoff (1s → 16s). Check `GET /health`
returns 200; if not, a zombie may hold :11114 — `start.ps1` clears it.

## Scan fails: binary not found

Install the scanners and restart the backend so PATH picks them up:

```powershell
winget install Byron.dua-cli
winget install qarmin.czkawka
```

`GET /api/setup/status` reports exactly which binary is missing.

## Duplicates page stays empty / slow

czkawka takes minutes on multi-TB trees. Raise min size (500+ MB) to narrow,
or run overnight. The page shows a progress state while scanning.

## Chat says no LLM

Start Ollama (`ollama serve` + `ollama pull llama3.1`) or load a model in
LM Studio. `GET /api/llm/discover` shows what the backend sees. No accounts
or API keys exist in this product — local providers only.

## Logs

Open with Ctrl+L (Logger modal) or the Logs page; filter by level/text;
export to .txt. Server keeps the last 500 entries in memory (`GET /api/logs`).

## E2E failures

`bun run e2e` needs Playwright browsers once: `bun run e2e:install`.
The playwright webServer blocks reuse running dev servers locally but start
fresh ones in CI.

## Build failures

- `tsc` errors → `bun run typecheck` in web_sota.
- `biome check` errors → `bunx biome check --write src/` (safe fixes only).
- `pyright` errors → `uv run pyright src/`.
- CSS under ~5 kB after build → Tailwind plugin missing (see vite.config.ts).
