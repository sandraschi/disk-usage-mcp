# Onboarding — disk-usage-mcp

First-timer path from zero to a working dashboard. No accounts, no API keys,
no money — everything here is free and local.

## What this is for

Disk Usage MCP scans your drives (dua-cli), finds duplicates (czkawka) and
tracks growth over time (snapshots). The Chat page answers questions with a
local LLM. If you only want one thing: scan D:\ at depth 2 and look at the
biggest rectangles.

## Prerequisites

- Windows 10/11, Python 3.12+ (via `uv`), bun (install from https://bun.sh)
- dua-cli: `winget install Byron.dua-cli`
- czkawka: `winget install qarmin.czkawka.cli` (binary lands as `windows_czkawka_cli`)
- Optional for Chat: Ollama (`winget install Ollama.Ollama`, then `ollama pull llama3.1`) or LM Studio with a loaded model

## Pitfalls

- Install the binaries BEFORE starting the backend, or restart it after —
  PATH is read at startup. `GET /api/setup/status` tells you what's missing.
- czkawka on a full multi-TB spinner takes a long time. Start with min 500 MB.
- The dashboard shows MOCK-badged sample KPIs until the binaries are detected;
  they clear automatically once setup is ready.

## Sanity check

1. `uv sync` + `cd web_sota; bun install`
2. `.\start.ps1` → frontend opens, topbar dot goes green (Connected)
3. Drives → scan `D:\` depth 2 → treemap renders
4. Inbox → Take snapshot → snapshot appears in the list
5. Help → onboarding section → Mark onboarding complete
