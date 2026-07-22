---
name: disk-usage
description: Disk usage analysis and duplicate detection across multi-drive setups
---

# Disk Usage Skill

Use this skill when analyzing disk usage, finding duplicates, or exploring storage allocation across drives.

## Before starting work:
1. Run `get_drive_overview_tool(paths=["D:\\", "E:\\", "F:\\", "G:\\"])` to see high-level allocation
2. Scan suspicious drives with `scan_path_tool(path="D:\\", max_depth=2)`

## At end of work:
- Report total reclaimable space found
- Suggest if duplicates warrant a full czkawka run overnight
