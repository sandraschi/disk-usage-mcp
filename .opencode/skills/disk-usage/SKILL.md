---
name: disk-usage
description: Disk usage analysis and duplicate detection across multi-drive setups
---

# Disk Usage Skill

Use this skill when analyzing disk usage, finding duplicates, or exploring storage allocation across drives.

## Available Tools

- `scan_path(path, max_depth)` - JSON hierarchy via dua-cli
- `get_drive_overview(paths)` - aggregate stats across drives
- `find_duplicates(paths, min_size_mb)` - duplicate detection via czkawka_cli
- `find_large_files(path, min_size_gb)` - space-hogging file finder
- `disk_usage(operation, ...)` - portmanteau: scan/tree/drive_overview
- `parse_dj_database(path?)` - VirtualDJ/Serato track metadata
- `server_help(topic?)` - tool + endpoint listing

## Before starting work:

1. Run `get_drive_overview(paths=["D:\\", "E:\\", "F:\\", "G:\\"])` to see high-level allocation
2. Scan suspicious drives with `scan_path(path="D:\\", max_depth=2)`

## At end of work:

- Report total reclaimable space found
- Suggest if duplicates warrant a full czkawka run overnight
