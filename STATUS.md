# Disk Usage MCP — Status

**Last updated:** 2026-09-27
**Version:** 0.1.0
**SOTA:** FastMCP 3.4.4, React 19, Vite 6, Tailwind v4, pyright clean

---

## Done

| Area | What | Status |
|------|------|--------|
| **MCP Server** | 12 tools (+list_connected_drives, cloud_status, verify_folders_with_bc) | Done |
| **Prompts/Resources** | reclaim-plan, snapshot-compare; drive://list, skill://disk-usage | Done |
| **Async runner** | dua + czkawka wrappers, timeouts, missing-binary dialogic errors (no more 500s) | Done |
| **FastAPI REST** | health/status/capabilities/skills/logs/setup/fleet; drives; cloud/status; peers/status + peers/bc/compare; scan/duplicates/large-files; snapshot take/list/get/diff/delete; LLM discover/providers/models/chat/stream; diagnostics; shutdown; /docs | Done |
| **MCP streamable HTTP** | /mcp via disk_usage_mcp.server:app (fleet target fixed — raw http_app:app had NO mount, 404 in prod) | Done |
| **Local LLM** | Ollama + LM Studio proxy, no keys, SSE streaming, GPU note | Done |
| **Web dashboard** | 12 pages (+Cloud): Dashboard, Drives (connected overview + treemap), Cloud, Duplicates (safety rule + BC verify), Inbox, Tools, Skills, Chat, Logs, Apps, Settings, Help — shortcuts, zoom, modals, dark theme, a11y pass | Done |
| **Crossconnects** | beyondcompare-mcp WIRED (vendored base + MCP-transport adapter, PeerBadge); google-docs + multi-backup documented PLANNED; registry entry | Done |
| **Session injection** | .claude-plugin + hooks, .cursorrules, .windsurfrules, copilot, opencode + antigravity skills | Done |
| **Skills** | disk-usage SKILL.md: HW map, rotation realities, classical-music rule, BC-confirms division | Done |
| **Testing** | 47 pytest (floor 40), tsc, pyright, Biome, Playwright: API-level green here, 6 browser tests need interactive shell (chromium cannot launch from sandboxed agent shell — env limitation, not app bug) | Done |
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
