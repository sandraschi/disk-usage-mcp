# Disk Usage MCP — User Guide

## Overview

Disk Usage MCP analyzes disk space across your Windows drives. It wraps dua-cli (fast Rust disk scanner) for structured JSON scans and czkawka_cli for duplicate file detection. It is designed for Sandra's multi-drive media library (20+ TB across 5 TB and 2.5 TB spinners) but works on any Windows system.

## Prerequisites

```powershell
# Install the two CLI tools
winget install Byron.dua-cli       # or: cargo install dua-cli
winget install qarmin.czkawka       # or: cargo install czkawka

# Install Python deps
cd disk-usage-mcp
uv sync
```

## Running the Server

### stdio mode (Claude Desktop / Cursor)
```powershell
uv run python -m disk_usage_mcp.server
```

### HTTP mode (webapp)
```powershell
$env:MCP_PORT="11114"; $env:MCP_HOST="127.0.0.1"
uv run python -m disk_usage_mcp.server
# Open http://127.0.0.1:11115 in browser (via start.ps1)
```

### Full stack
```powershell
.\start.ps1
# Opens backend on :11114, frontend on :11115, browser auto-launches
```

## Tutorials

### Tutorial 1: Fast Drive Health Check

Goal: See all your drives at a glance in under 10 seconds.

```
get_drive_overview(paths=["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"])
```

This runs `dua` at depth=1 on each drive. Returns total size per drive and grand total. The dua scan takes <3s per drive even at 5 TB because it only lists one directory level.

**What to look for:**
- Drives over 80% — these need attention
- Drives under 20% — candidate for consolidation
- Discrepancies between expected and actual sizes

### Tutorial 2: Find What's Eating Your Drive

Goal: Identify the top space consumers on a specific drive.

Step 1 — Top-level breakdown:
```
scan_path(path="D:\\", max_depth=2)
```

Review the result. If a single directory dominates (e.g. "Media" at 8 TB), step into it.

Step 2 — Drill into the big directory:
```
scan_path(path="D:\\Media", max_depth=3)
```

Step 3 — Find individual large files:
```
find_large_files(path="D:\\Media", min_size_gb=10, limit=20)
```

This does a deep walk (depth 10) and returns individual files >10 GB. Each result includes the full path and size. Sort by size to find the worst offenders.

### Tutorial 3: Reclaim Space from Large Files

Goal: Find and evaluate candidates for deletion.

Start aggressive and tighten the threshold:
```
# Find the worst offenders first
find_large_files(path="D:\\", min_size_gb=50)
# If none, try
find_large_files(path="D:\\", min_size_gb=10)
# Then
find_large_files(path="D:\\", min_size_gb=5)
```

For each result, consider:
- Is this an old installer or ISO that can be deleted?
- Is this a VM image that is no longer needed?
- Is this a model file duplicated elsewhere (see Tutorial 5)?
- Is this media that has been watched and can be re-ripped?

### Tutorial 4: Find Duplicate Files Across Drives

Goal: Find wasted space from duplicate files across primary and backup drives.

**Important warning:** This scans every file in the given paths. For multi-TB drives, this takes 5-60+ minutes. The disk will be under heavy read load. Run overnight if possible.

Quick scan (high threshold, fast):
```
find_duplicates(paths=["D:\\Media", "E:\\Backup1"], min_size_mb=500)
```

Deep scan (low threshold, slow):
```
find_duplicates(paths=["D:\\Media", "E:\\Backup1", "F:\\Backup2"], min_size_mb=50)
```

The result includes each duplicate group with its total size. Groups with 3+ copies across different drives are the highest-value targets — you can delete 2 copies and keep 1.

### Tutorial 5: Audit AI Model Downloads (Space Recovery)

Goal: Find duplicated model files across tool directories. This is a common problem — Ollama, Pinokio, HuggingFace Cache, and manual downloads can all contain the same 10 GB model.

Step 1 — Check each model directory:
```
scan_path(path="D:\\Pinokio\\models", max_depth=2)
scan_path(path="D:\\ollama\\models", max_depth=2)
scan_path(path="D:\\hf-cache", max_depth=2)
```

Step 2 — Find duplicates across model dirs:
```
find_duplicates(paths=["D:\\Pinokio\\models", "D:\\ollama\\models", "D:\\hf-cache"], min_size_mb=1000)
```

Step 3 — Identify model files by extension across all drives:
```
find_large_files(path="D:\\", min_size_gb=1, limit=100)
```
Then filter results mentally for GGUF, .safetensors, .bin extensions. Note: a future tool will do this automatically.

### Tutorial 6: Track Space Over Time

Goal: Monitor how drive usage changes over weeks.

Take a baseline snapshot:
```
# Via MCP — call the snapshot endpoint
POST /api/snapshot/take with {"paths": ["C:\\", "D:\\", "E:\\"], "label": "2026-07-baseline"}
```

Snapshots are stored as JSON in `data/snapshots/`. Compare with a later snapshot to see:
- Which drives grew most
- Which directories are trending up
- Whether cleanup efforts actually reclaimed space

The dashboard has a Snapshots section for browsing and comparing.

### Tutorial 7: Using the Portmanteau Tool

The `disk_usage` tool consolidates three operations:

```
# Same as scan_path
disk_usage(operation="scan", path="D:\\Media", max_depth=3)

# Same as tree output (human-readable, not JSON)
disk_usage(operation="tree", path="D:\\", max_depth=2)

# Same as get_drive_overview
disk_usage(operation="drive_overview", paths=["C:\\", "D:\\", "E:\\"])
```

Use the portmanteau when you want a unified interface. Use the standalone tools when you want explicit naming for MCP tool discovery.

## Sandra's 20 TB Setup

Her drive layout (approximate):

| Drive | Size | Content |
|-------|------|---------|
| C: | 1 TB NVMe | OS, apps, projects |
| D: | 5 TB | Media library (Plex, Calibre), models, downloads |
| E: | 5 TB | Backup 1 (primary media) |
| F: | 2.5 TB | Backup 2 (documents, configs, smaller media) |
| G: | 2.5 TB | Backup 3 (rotating — cold spare) |

Common space-waste patterns on this setup:
1. Downloaded model files in Pinokio/ollama/hf-cache that duplicate each other
2. Old installer ISOs and ZIPs in Downloads that were never cleaned up
3. Multiple backup copies of the same media files across E: and F:
4. Temp/extract artifacts from unpacking large archives

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "dua: command not found" | dua-cli not installed | `winget install Byron.dua-cli` |
| "czkawka_cli: command not found" | czkawka not installed | `winget install qarmin.czkawka` |
| MCP tool returns timeout | Path too large, depth too deep | Reduce depth, scan a subdirectory |
| Webapp shows "Offline" | Backend not running on :11114 | Run `just mcp-http` or `.\start.ps1` |
| Duplicate scan hangs | I/O contention, spinning disk | Run overnight, reduce path count |
