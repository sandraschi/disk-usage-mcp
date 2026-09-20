# Changelog — disk-usage-mcp

## 2026-09-21 — assfix round 2 (fix-all)

- Backend: prompts (reclaim-plan, snapshot-compare), skill:// resource, Prefab cards
  (show_drives_card, show_duplicates_card), output_schema on all tools
- REST: logs ring, skill content, snapshot diff + delete, setup status, fleet apps,
  local LLM proxy (discover/providers/models/chat/SSE stream)
- Webapp: Inbox, Tools, Skills, Chat, Logs, Apps, Help pages; Settings LLM cards;
  Dashboard hero + onboarding cue + MOCK badges; Tauri listen + backoff poll;
  logger/help modals; Ctrl+K/L/H shortcuts; zoom hook; font contrast pass
- Quality: pyright clean, coverage floor 40, Biome gate, Playwright e2e (4 green),
  pre-commit, renovate, .agents skills, MCPB 3-4-100 prompts, pack+validate green
- Docs: docs/ suite (CONFIGURATION/DEVELOPMENT/TOOLS/TROUBLESHOOTING/ONBOARDING)

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
