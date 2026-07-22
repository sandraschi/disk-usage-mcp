# disk-usage-mcp: User Guide

## Getting Started

disk-usage-mcp wraps dua-cli and czkawka_cli to analyze disk usage and find duplicate files across your drives.

### Install Prerequisites

```powershell
winget install Byron.dua-cli
winget install qarmin.czkawka
```

### Run the Server

```powershell
# stdio (for Claude Desktop)
uv run python src/disk_usage_mcp/server.py

# HTTP (for webapp)
uv run python src/disk_usage_mcp/server.py --mode http --port 11114
```

## Common Use Cases

### "Show me my drive allocation"

```
get_drive_overview_tool(paths=["D:\\", "E:\\", "F:\\", "G:\\"])
```

### "What's taking up space on D:?"

```
scan_path_tool(path="D:\\Media", max_depth=2)
```

### "Find files larger than 5GB"

```
find_large_files_tool(path="D:\\", min_size_gb=5.0)
```

### "Any duplicates across my backups?"

```
find_duplicates_tool(search_paths=["D:\\Media", "E:\\Backup"])
```

## Multi-Drive Strategy

For a 20TB library with multiple 5TB/2.5TB backup spinners:

1. Run `get_drive_overview_tool` across all drives
2. Note which drives are near capacity
3. Scan near-full drives with `scan_path_tool` at depth 2
4. Run `find_large_files_tool` at min_size_gb=10
5. Run `find_duplicates_tool` between primary and backup drives
