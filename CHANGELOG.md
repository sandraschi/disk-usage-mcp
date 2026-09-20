# Changelog — disk-usage-mcp

## 2026-09-21 — assfix pass

- REST: added `/health` alias (fleet launcher probe), `/api/status`, `/api/capabilities`, `/api/skills`, `POST /api/shutdown`, `/api/duplicates`, `/api/large-files` (frontend-called routes that were missing)
- MCP transport: fixed `http_app()` double-prefix (now `path="/"`), merged MCP + REST lifespans (no more clobbered snapshot init), replaced deprecated `@app.on_event` with `lifespan=`
- Tool annotations corrected to `readOnlyHint`; added `server_help` tool; `## Examples` on all tools; dialogic `message` key on all tool returns; `ctx` progress reporting in `find_duplicates`
- Corrected `tool_count` (3 → 7) and full tool list in diagnostics
- Hardened snapshot read path (path traversal guard, `success` envelope on errors)
- Hygiene: ruff `T20` enforced, `.gitignore`/`.mcpbignore` cover `*.bak`, removed 19 `.bak` dross files, `.gitattributes` LF normalization
- Docs synced: llms.txt / llms-full.txt now match actual tool + endpoint surface; manifest tool list complete
- Added CHANGELOG, CLAUDE.md, AGENTS.md, session-injection files, CI workflow, `just certify`

## 0.1.0

- Initial release: dua-cli + czkawka_cli wrappers, snapshot system, React/Vite dashboard, Tauri shell
