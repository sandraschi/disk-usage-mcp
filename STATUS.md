# Disk Usage MCP — Status

**Last updated:** 2026-09-21
**Version:** 0.1.0
**SOTA:** FastMCP 3.4.4, React 19, Vite 6, Tailwind v4, pyright clean

---

## Done

| Area | What | Status |
|------|------|--------|
| **MCP Server** | 9 tools: scan_path, find_large_files, get_drive_overview, find_duplicates, disk_usage, parse_dj_database, server_help, show_drives_card, show_duplicates_card | Done |
| **Prompts/Resources** | reclaim-plan, snapshot-compare; drive://list, skill://disk-usage | Done |
| **Async runner** | dua + czkawka wrappers, timeouts, logger.exception paths | Done |
| **FastAPI REST** | health/status/capabilities/skills/logs/setup/fleet; scan/duplicates/large-files; snapshot take/list/get/diff/delete; LLM discover/providers/models/chat/stream; diagnostics; shutdown; /docs | Done |
| **MCP streamable HTTP** | /mcp mounted with path="/" + merged lifespan (live-verified) | Done |
| **Local LLM** | Ollama + LM Studio proxy, no keys, SSE streaming, GPU note | Done |
| **Web dashboard** | 11 pages: Dashboard, Drives, Duplicates, Inbox, Tools, Skills, Chat, Logs, Apps, Settings, Help — shortcuts, zoom, modals, dark theme, a11y pass | Done |
| **Session injection** | .claude-plugin + hooks, .cursorrules, .windsurfrules, copilot, opencode + antigravity skills | Done |
| **Skills** | disk-usage SKILL.md served via resource + REST + page | Done |
| **Testing** | 33 pytest (cov 46%, floor 40), tsc, pyright, Biome, Playwright e2e 4/4 | Done |
| **Lint** | ruff (T20) + format + pyright clean | Done |
| **Git** | Committed, pushed (CI file local-only: needs workflow scope) | Done |
| **Packaging** | 3-4-100 prompts, wipe+recopy pack recipe, pack + validate green | Done |
| **Docs** | README + docs/ suite + llms + CHANGELOG + ONBOARDING | Done |
| **Startup** | Fleet launcher, zombie clear, /health probe, Tauri listen + poll | Done |
| **Ports** | 11114/11115 registered in WEBAPP_PORTS.md | Done |
| **Onboarding** | docs/ONBOARDING.md, under-hero cue, MOCK-until-ready, setup/status | Done |

## In Progress / Not Started

| Area | What | Status |
|------|------|--------|
| **Model duplicate detection** | Cross-directory GGUF/safetensors dedup across Ollama/Pinokio/HF dirs | Not started |
| **Scheduled snapshots** | Task Scheduler recipe exists in prompts; no installer yet | Not started |
| **Prefab cards in chat clients** | Server side done; client rendering depends on host | Done (server) |
| **CI on GitHub** | Workflow file ready locally; push blocked — OAuth token lacks `workflow` scope, both SSH keys unauthorized on the account. Only a scoped push (Sandra) can land it | Blocked (scope) |
| **MCPB smoke launch** | Proven 2026-09-21: bundle unpacked to clean dir, fresh venv + pip install, server booted — 9 tools + 2 prompts + drive resource + live scan all green | Done |

## Known Issues

| Issue | Workaround |
|-------|------------|
| dua/czkawka not on PATH | `winget install` both; setup/status names the missing one |
| Web dashboard shows "Offline" | Run `.\start.ps1`; topbar backoff retries automatically |
| Chat says no LLM | Start Ollama (`ollama serve`) or load an LM Studio model |
