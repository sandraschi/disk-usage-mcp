# Tools — disk-usage-mcp

All MCP tools return dialogic `{success, message, ...}` and carry
`readOnlyHint` annotations with an object output schema.

## MCP tools

| Tool | What |
|------|------|
| `scan_path(path, max_depth)` | dua-cli JSON hierarchy of space usage |
| `find_large_files(path, min_size_gb, limit)` | Space-hogging files, biggest first |
| `get_drive_overview(paths)` | Depth-1 aggregate across drives + grand total |
| `find_duplicates(search_paths, min_size_mb)` | czkawka duplicate groups (reports progress via ctx) |
| `disk_usage(operation, ...)` | Portmanteau: `scan` / `tree` / `drive_overview` |
| `parse_dj_database(path?)` | VirtualDJ database.xml / Serato database-v2 track metadata |
| `server_help(topic?)` | Tool + live REST route listing |
| `list_connected_drives()` | All connected drives + stats (no scanner needed) |
| `cloud_status()` | OneDrive + Google sync-folder state (local detection, no OAuth) |
| `verify_folders_with_bc(left, right)` | BC authoritative verdict (soft-degrades when peer down) |
| `show_drives_card()` | Prefab in-chat drives card (`app=True`) |
| `show_duplicates_card(search_paths, min_size_mb)` | Prefab in-chat duplicates card (`app=True`) |

## Prompts

- `reclaim-plan(drives, min_size_gb)` — step-by-step reclamation plan.
- `snapshot-compare(older, newer)` — snapshot growth analysis plan.

## Resources

- `drive://list` — drive letters with usage stats.
- `skill://disk-usage` — bundled skill content.

## REST (see Capabilities for the live map)

Health/status/capabilities/skills/logs/setup/fleet; drives (connected list); cloud/status (OneDrive+Google);
peers/status (companion reachability); peers/bc/compare (BC folder verdict proxy);
scan/duplicates/large-files; snapshot take/list/get/diff/delete;
snapshot take/list/get/diff/delete; local LLM discover/providers/models/chat/stream;
`/api/v1/diagnostics`; `POST /api/shutdown` (orderly exit for the fleet launcher);
`/mcp` (MCP streamable HTTP, mounted with `path="/"`).

## Dashboard

Pages: Dashboard (hero + KPIs + onboarding cue), Drives (connected overview + treemap), Cloud
(OneDrive + Google sync state), Duplicates (with safety rule + BC verify panel), Inbox (snapshots take/diff/delete), Tools (capability runner), Skills, Chat
(skill-first, 5 personalities, streaming, 100-msg localStorage, export),
Logs, Apps (fleet hub), Settings (local LLM), Help (onboarding + endpoints).
