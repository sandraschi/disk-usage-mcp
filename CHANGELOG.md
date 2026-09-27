# Changelog — disk-usage-mcp

## 2026-09-27 — crossconnects C1+C2+C3 live

- C1 beyondcompare-mcp (WIRED, live-proven both verdicts): verify flow + PeerBadge;
  BC-side fixes landed in beyondcompare-mcp@d008f21 (/mcp mount, drop `script-exit`,
  report-parsed verdicts) after trial-expiry banner spotted (license grace ~6 days)
- C2 google-docs-mcp (WIRED): `google_drive_state` + `/api/peers/google/state` (account +
  mount; quota has no upstream op — honestly null); Cloud page account badge
- C3 multi-backup-mcp (WIRED, read-only): `backup_preflight` + `/api/peers/backup/*` +
  Drives preflight panel; ranks peer dests first, then alternatives (500 GB → N:\,
  configured Desktop dest on full C: flagged unfit)
- Tests: 56 pytest green; Playwright API-level tests green, browser legs need interactive shell

- Scanner reliability: `_resolve_binary` also checks `%LOCALAPPDATA%\Microsoft\WinGet\Links`
  (stale-shell proof); `/api/setup/status` uses the same resolver (was `shutil.which`-only)
- dua 2.44 parsing: parse-FIRST on nonzero exit (drive roots always exit 1 on locked system
  files), `<N IO Error(s)>` marker stripping (singular + plural), child-size rollup into
  parents (dua prints own-sizes; treemap was all zeros), `total <N IO Errors>` summary dropped
- Boot-path fix: fleet launcher now serves `disk_usage_mcp.server:app` (module-level built app);
  raw `http_app:app` had NO /mcp mount — HTTP MCP 404'd in production while smoke tests passed
- Crossconnect C1: beyondcompare-mcp verify flow (vendored base + MCP-transport adapter,
  `/api/peers/*`, `verify_folders_with_bc`, Duplicates verify panel + PeerBadge, skill division)
- Pages: Drives connected-overview, new Cloud page; Duplicates safety banner (classical-music rule)
- Findings for BC's own assfix (not patched here): broken fastmcp venv (reinstalled env-only),
  missing /mcp mount (`from_fastapi` never mounted — POST /mcp 404s on :10841)
- Tests: 47 pytest green; Playwright API-level test green, browser tests need interactive shell

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
