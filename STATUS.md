# Disk Usage MCP — Status

**Last updated:** 2026-07-22  
**Version:** 0.1.0  
**SOTA:** FastMCP 3.4.4, React 19, Vite 6, Tailwind v4

---

## Done

| Area | What | Status |
|------|------|--------|
| **MCP Server** | 5 tools: scan_path, find_large_files, get_drive_overview, find_duplicates, disk_usage (portmanteau) | Done |
| **Async runner** | Subprocess wrappers for dua-cli + czkawka_cli, timeout handling, error recovery | Done |
| **FastAPI REST** | /health, /api/v1/diagnostics, /api/scan, /api/duplicates, /api/large-files, snapshot CRUD | Done |
| **MCP streamable HTTP** | /mcp mounted on FastAPI app | Done |
| **CORS** | Tauri, Tailscale, LAN regex | Done |
| **Web dashboard** | React 19 + Vite 6 + Tailwind v4 + Zustand + Framer Motion + recharts. Pages: Dashboard, Drives (treemap), Duplicates, Settings | Done |
| **Session injection** | .claude-plugin + hooks/hooks.json with tool-awareness prompt | Done |
| **Skills** | disk-usage SKILL.md | Done |
| **Testing** | 10 pytest tests (HTTP smoke, config, imports) | Done |
| **Lint** | ruff check + format clean | Done |
| **Git** | Initialized, committed, push-ready | Done |
| **Packaging** | .mcpbignore, pyproject.toml, run_server.py, glama.json, llms.txt, llms-full.txt | Done |
| **Docs** | README.md, llms.txt, llms-full.txt, glama.json | Done |
| **Startup** | start.ps1 (zombie clear + poll + auto-open), start.bat | Done |
| **Ports** | 11114/11115 registered in WEBAPP_PORTS.md | Done |

## In Progress / Not Started

| Area | What | Status |
|------|------|--------|
| **Model duplicate detection** | Cross-directory dedup (GGUF, .safetensors, .bin) across Ollama/Pinokio/HF download dirs | Not started |
| **Backup duplicate detection** | Find redundant archive copies across multiple spinners | Not started |
| **Media library scan** | Media-type breakdown — video/audio/image archive sizes | Not started |
| **CLI binary auto-install** | Winget/cargo install dua + czkawka in start.ps1 if missing | Not started |
| **Scheduled snapshots** | Cron/Windows Task Scheduler for periodic drive snapshots | Not started |
| **Diff view** | Compare two snapshots to show delta (growth/shrinkage) | Not started |
| **Prefab UI cards** | @mcp.tool(app=True) for in-chat drive cards | Not started |
| **Tauri NSIS build** | Native desktop installer (stretch goal) | Not started |
| **Playwright E2E** | Frontend browser tests | Not started |
| **CUA smoke test** | NSIS install → launch → verify flow | Not started |
| **GitHub remote** | `gh repo create` + push | Not started |

## Known Issues

| Issue | Workaround |
|-------|------------|
| dua/czkawka not on PATH | Install manually: `winget install dua-cli` / `cargo install dua-cli` |
| Web dashboard shows "Offline" | Backend not running — run `.\start.ps1` or `just mcp-http` |

## Next Up

1. Model duplicate detection — scan Ollama dirs + Pinokio downloads + HF cache for overlapping GGUF/safetensor files
2. Scheduled snapshot via Windows Task Scheduler
3. Snapshot diff view in dashboard
