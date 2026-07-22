# DJ Library Integration — Disk Usage MCP

**Status:** Spec  
**Date:** 2026-07-22  
**Motivation:** Sandra's 20 TB media library overlaps with DJ libraries (VirtualDJ, Serato). Large audio/video files that have never been played, duplicate tracks across drives, and format duplication (MP3 + FLAC + AAC of the same track) are invisible to raw disk scans alone.

---

## Problem

A raw `dua` scan shows file sizes but cannot tell you:
- Whether a 2 GB video file has ever been played
- Whether `D:\DJ\Library\Track.mp3` and `E:\Backup\DJ\Track.mp3` are the same track
- Which format conversions are safe to delete (keep FLAC, remove MP3 if same track exists)

The DJ databases (VirtualDJ `database.xml`, Serato `database v2`) contain this metadata.

---

## Data Sources

### VirtualDJ — `database.xml`

Location: `%APPDATA%\VirtualDJ\Database.xml` (or custom path)

XML structure (relevant fields):
```xml
<Song>
  <Title>...</Title>
  <Artist>...</Artist>
  <File>D:\DJ\Media\Track.mp3</File>
  <Length>374</Length>       <!-- seconds -->
  <PlayCount>12</PlayCount>
  <LastPlayed>2026-07-20</LastPlayed>
  <BitRate>320</BitRate>
  <Type>mp3</Type>
</Song>
```

Parsing: `xml.etree.ElementTree` — fast, no extra deps.

### Serato — `database v2`

Location: `%LOCALAPPDATA%\Serato\database v2` (SQLite binary)

Table `djmd_songs_content`:
| Column | Type | Content |
|--------|------|---------|
| path | text | File path |
| play_count | integer | Times played |
| last_played | text | ISO timestamp |
| bpm | real | Beats per minute |
| length | real | Duration in seconds |

Parsing: `sqlite3` — stdlib.

---

## Proposed Tools

### `parse_dj_database(path=None)`

**Input:** Optional explicit path to database.xml or .db. Defaults to auto-detect (check VDJ path, then Serato path).

**Returns:**
```json
{
  "success": true,
  "source": "virtualdj",
  "path": "C:\\Users\\sandr\\AppData\\Roaming\\VirtualDJ\\Database.xml",
  "total_tracks": 15000,
  "tracks": [
    {"file": "D:\\DJ\\Media\\Track.mp3", "play_count": 12, "last_played": "2026-07-20", "length_s": 374, "type": "mp3"},
    ...
  ]
}
```

### `find_unplayed_large(path=None, min_size_gb=1, database_path=None)`

Cross-references a DJ database with filesystem scan. Returns tracks that are large AND have play_count = 0.

**Pipeline:**
1. `parse_dj_database(path=database_path)` → get all tracks with play_count=0
2. `find_large_files(path=path, min_size_gb=min_size_gb)` → get all large files
3. Intersect by file path → return the overlap

**Returns:**
```json
{
  "success": true,
  "candidates": [
    {"file": "D:\\DJ\\Media\\Unwatched\\big_video.mp4", "size_gb": 4.2, "play_count": 0},
    ...
  ],
  "total_reclaimable_gb": 42.5
}
```

### `find_dj_duplicates(database_path=None)`

Groups tracks in the DJ database that share the same artist+title (or same file name across different paths). Useful for finding the same track encoded in multiple formats, or duplicated across drives.

**Returns:**
```json
{
  "success": true,
  "duplicate_groups": [
    {
      "key": "Artist - Track Name",
      "formats": ["mp3", "flac", "aac"],
      "files": [
        {"path": "D:\\DJ\\Media\\Artist - Track.flac", "size_mb": 85},
        {"path": "D:\\DJ\\Media\\Artist - Track.mp3", "size_mb": 12}
      ],
      "waste_mb": 12
    }
  ],
  "total_waste_mb": 2400
}
```

The "waste" calculation: keep the largest (highest quality) format, flag the rest as removable.

---

## Implementation Plan

| Phase | What | Depends on |
|-------|------|------------|
| 1 | `parse_dj_database` — VDJ XML parser + Serato SQLite parser | Nothing |
| 2 | `find_unplayed_large` — cross-reference with `find_large_files` | Phase 1 |
| 3 | `find_dj_duplicates` — artist+title grouping + format analysis | Phase 1 |
| 4 | Dashboard page: DJ tab with unplayed track list + duplicate groups | Phase 2+3 |
| 5 | Prefab card for in-chat DJ analysis | Phase 2+3 |

---

## File Responsibilities

```
src/disk_usage_mcp/
├── tools/
│   ├── dj.py              ← NEW: parse_dj_database, find_unplayed_large, find_dj_duplicates
│   └── ...
├── runner.py               ← Add dj database parsers (ElementTree for XML, sqlite3 for Serato)
└── server.py               ← Register new tools
```

No new external dependencies. `xml.etree.ElementTree` and `sqlite3` are stdlib.

---

## Open Questions

1. Should we also scan `%APPDATA%\VirtualDJ\database.xml` (backup copy of the database)?
2. Serato's `database v2` file has no extension — how to detect it reliably? Check magic bytes?
3. Cross-format duplicate detection: is BPM/gain matching more reliable than artist+title string matching?
4. VirtualDJ also has a `history/` folder with session logs — useful for "tracks played in the last N days"?

---

## Example Usage

```python
# Find 5 GB+ tracks that have never been played
await find_unplayed_large(
    path="D:\\DJ\\Media",
    min_size_gb=5,
    database_path="C:\\Users\\sandr\\AppData\\Roaming\\VirtualDJ\\Database.xml"
)
# → {"candidates": [...], "total_reclaimable_gb": 42.5}

# Find format-duplicated tracks
await find_dj_duplicates(
    database_path="C:\\Users\\sandr\\AppData\\Roaming\\VirtualDJ\\Database.xml"
)
# → {"duplicate_groups": [...], "total_waste_mb": 2400}
```
