---
name: disk-usage
description: Disk usage analysis and duplicate detection across Sandra's multi-drive media setup
---

# Disk Usage Skill

Use this skill when analyzing disk usage, finding duplicates, or exploring storage allocation across drives.

## Sandra's hardware reality (Goliath, Windows 11)

A beautiful mess — never assume a fixed drive map. Always start with
`list_connected_drives` (or `GET /api/drives`) to see what is actually plugged in right now.

- **NVMe (fast, internal):** C (system, chronically near-full), D, N ("1.8TB NVME SSD").
- **Large internal spinners:** E ("Anime"), F ("Video"), K ("Media 4"), L ("Media 3"),
  I ("5TB Media 3"), J ("5TB Anime"), G ("5TB Media 4"), M ("4TB Media 4" — usually the
  only one with real headroom). These run full to the brim — 90%+ is normal, not an exception.
  F has hit 100.0% before (under 1 GB free). Volume labels are the reliable identity —
  letters can shift when BYOD disks rotate.
- **BYOD 5 TB 2.5" spinners:** rotated constantly. Some old, some unsynced, some full.
  A `removable` kind in the drive list usually means one of these just got plugged in.
- **Offsite / cold:** a few spinners live in the attic or at brother Steve's.
  They are NOT visible to any scan. Any "where is my file?" answer must consider them.
- **3-2-1 rotation:** exists as an aspiration, not a practice. Do not assume any
  drive has a current backup. Verify before recommending deletion.
- **Cloud:** OneDrive syncs to `%USERPROFILE%\OneDrive` (lives on C: — which itself is
  near-full, so OneDrive sync pressure and C: pressure are the same problem). Google Drive
  for Desktop is a VIRTUAL mount labeled "Google Drive" (H:\ on Goliath — NOT a physical
  disk; do not treemap-scan it as one). Quota APIs are not wired — `cloud_status`
  reports local sync-folder state only.

## Available tools

- `list_connected_drives()` — all connected drives + stats. No scanner binary needed. Start here.
- `cloud_status()` — OneDrive + Google sync-folder state. Start here for cloud questions.
- `scan_path(path, max_depth)` — JSON hierarchy via dua-cli (needs `winget install Byron.dua-cli`).
- `get_drive_overview(paths)` — aggregate stats across drives at depth 1.
- `find_duplicates(paths, min_size_mb)` — via czkawka_cli (needs `winget install qarmin.czkawka.cli`).
- `find_large_files(path, min_size_gb)` — space hogs via deep dua walk.
- `disk_usage(operation, ...)` — portmanteau: scan/tree/drive_overview.
- `verify_folders_with_bc(left_path, right_path)` — authoritative Beyond Compare verdict
  (soft-degrades when beyondcompare-mcp is down).

## The division of labour (disk-usage suspects, BC confirms)

disk-usage FINDS; Beyond Compare VERDICTS. Never present a czkawka hash group as a
deletion verdict — it is a suspect list. The confirm step is `verify_folders_with_bc`
(or the Duplicates page "Verify folders" panel), which proxies beyondcompare-mcp's
`compare_folders` over MCP. Same for rotation checks: "are E:\Media and the BYOD copy
in sync?" is a BC question, not a dua question. If BC is down (gray badge), say so
and fall back to quarantine-first — do not upgrade suspects to verdicts yourself.

## Before starting work

1. Run `list_connected_drives()` — note which expected letters are MISSING (unplugged,
   in the attic, at Steve's) and which are ≥90% full (normal here, triage by free GB).
2. Run `cloud_status()` when the question involves OneDrive/Google.
3. Only then scan: `scan_path(path="D:\\", max_depth=2)`.

## Typical problems and their solutions

1. **"Drive X is full" (E/F/H/I/J/K/L at 99%)** — Normal. Rank by free GB, move the
   biggest wins to M or N (usually the only volumes with headroom), snapshot before/after.
2. **"Where is my file? It was on drive X"** — X may be unplugged, in the attic, or at
   Steve's. Check the connected list first; if the letter is absent, say so instead of
   declaring the file gone.
3. **"Are these two folders in sync?"** — Probably not. BYOD spinners drift. Scan both
   at depth 2-3 and diff; never assume the rotation ran.
4. **"Can I delete these dupes?"** — See the safety rule below. Default answer: quarantine first,
   BC-verify first when beyondcompare-mcp is up.
5. **"I need more space"** — Short term: hunt large files + verify-then-quarantine dupes.
   Long term: buy a 30 TB spinner when the price dips (watch Amazon). M/N absorb overflow meanwhile.
6. **"dua/czkawka not found"** — `winget install Byron.dua-cli` and
   `winget install qarmin.czkawka.cli`. The API returns this as JSON, never a 500.
7. **"Cloud quota?"** — Not wired. Report local sync state + host free space, and say
   quota needs Graph/Drive-API OAuth (open item, see Cloud page note).

## The classical-music rule (dupe-deletion safety — HARD RULE)

A year ago a well-organized classical library was deleted as a "dupe" — hash-matched,
removed, and afterwards nowhere to be found. Rebuilt from CDs. Never again:

1. **Verify the keeper first** — open it, play it, check it is complete.
2. **Quarantine, don't delete** — move candidates to a `_quarantine_<date>/` folder for a week.
3. **Keep one offsite copy** — attic or Steve's counts. Two local copies is not a backup.
4. **Then delete, one group at a time**, re-verifying the keeper after each group.

## At end of work

- Report total reclaimable space found.
- Name any expected-but-missing drives (possibly attic/Steve's) instead of silently ignoring them.
- Suggest if duplicates warrant a full czkawka run overnight.
- If ≥2 volumes sit above 95%, say so plainly and recommend the 30 TB spinner watch.
