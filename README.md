# Disk Usage MCP

FastMCP server for disk usage analysis, duplicate detection, and multi-drive visualization. Wraps `dua-cli` and `czkawka_cli` for fast, offline filesystem analysis.

Designed for multi-TB media libraries spread across backup spinners — understand your allocation, find duplicates, and reclaim space.

## Features

- **Drive Scanning** — Scan any path with `dua-cli` for structured JSON hierarchy
- **Multi-Drive Overview** — Aggregate usage across all your drives
- **Large File Finder** — Find space-hogging files above a threshold
- **Duplicate Detection** — Find redundant files with `czkawka_cli`
- **Snapshot System** — Periodically snapshot drive state to track growth
- **Visual Dashboard** — React/Vite frontend with treemap visualization
- **Dual Transport** — stdio (Claude Desktop) and HTTP (webapp)

## Prerequisites

- Python 3.12+
- [dua-cli](https://github.com/Byron/dua-cli) — `winget install Byron.dua-cli`
- [czkawka_cli](https://github.com/qarmin/czkawka) — `winget install qarmin.czkawka`

## Quick Start

```powershell
# Install Python deps
uv sync

# Run MCP server (stdio mode — for Claude Desktop)
uv run python src/disk_usage_mcp/server.py

# Run full stack (backend + frontend)
.\start.ps1
```

## MCP Tools (Claude Desktop)

| Tool | Description |
|------|-------------|
| `scan_path_tool` | Scan a drive with dua-cli, return JSON hierarchy |
| `find_large_files_tool` | Find files above size threshold |
| `get_drive_overview_tool` | Aggregate across multiple drives |
| `find_duplicates_tool` | Find duplicates with czkawka_cli |

## REST API (Webapp)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health |
| `/api/v1/diagnostics` | GET | Diagnostics for smoke tests |
| `/api/scan` | POST | Scan a path with optional depth |
| `/api/snapshot/take` | POST | Take a usage snapshot |
| `/api/snapshots` | GET | List saved snapshots |
| `/api/snapshot/{file}` | GET | Get snapshot data |

## Stack

- Backend: Python 3.12+, FastMCP 3.4, FastAPI + uvicorn, httpx, prefab-ui
- Frontend (`web_sota/`): React 19, Vite 6, TailwindCSS v4, Lucide icons, Framer Motion, Zustand, d3 + recharts
- Scanners: dua-cli, czkawka_cli (external binaries, see docs/ONBOARDING.md)
- Native: Tauri 2 + PyInstaller sidecar (`native/`)
- Gates: ruff (incl. T20), pyright, pytest + coverage, tsc, Biome, Playwright e2e

## Docs

- [docs/README.md](./docs/README.md) — doc index
- [docs/ONBOARDING.md](./docs/ONBOARDING.md) — first-time setup
- [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) — env, ports, snapshots, fleet
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — gates, adding tools/endpoints/pages
- [docs/TOOLS.md](./docs/TOOLS.md) — tool/prompt/resource reference
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) — common failures
- [llms-full.txt](./llms-full.txt) — LLM-oriented reference
- [CHANGELOG.md](./CHANGELOG.md) — release history

## Ports

- Backend (FastAPI): 11114
- Frontend (Vite dev): 11115

## License

MIT
