"""DJ library integration - VirtualDJ database.xml + Serato database v2 parsers."""

import os
import sqlite3
import xml.etree.ElementTree as ET
from typing import Annotated

from pydantic import Field

from disk_usage_mcp.tools.utils import _error_response

_VDJ_DEFAULT = os.path.join(os.environ.get("APPDATA", ""), "VirtualDJ", "Database.xml")
_SERATO_DEFAULT = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Serato", "database v2")


def _parse_virtualdj_xml(path: str) -> tuple[list[dict], str | None]:
    """Parse VirtualDJ database.xml and return (tracks, error)."""
    if not os.path.isfile(path):
        return [], f"VirtualDJ database not found at: {path}"
    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except ET.ParseError as e:
        return [], f"Failed to parse VirtualDJ XML: {e}"

    tracks = []
    for song in root.findall("Song"):
        track = {
            "title": _elem_text(song, "Title", ""),
            "artist": _elem_text(song, "Artist", ""),
            "file": _elem_text(song, "File", ""),
            "length_s": _int_or(_elem_text(song, "Length", "0"), 0),
            "play_count": _int_or(_elem_text(song, "PlayCount", "0"), 0),
            "last_played": _elem_text(song, "LastPlayed", ""),
            "bitrate": _int_or(_elem_text(song, "BitRate", "0"), 0),
            "type": _elem_text(song, "Type", "").lower(),
            "bpm": _float_or(_elem_text(song, "BPM", "0"), 0.0),
        }
        tracks.append(track)

    return tracks, None


def _elem_text(parent: ET.Element, tag: str, default: str) -> str:
    el = parent.find(tag)
    return el.text if el is not None and el.text else default


def _int_or(val: str, default: int) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _float_or(val: str, default: float) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _parse_serato_db(path: str) -> tuple[list[dict], str | None]:
    """Parse Serato database v2 (SQLite) and return (tracks, error)."""
    if not os.path.isfile(path):
        return [], f"Serato database not found at: {path}"
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        song_table = None
        for candidate in ("djmd_songs_content", "djmd_songs", "songs", "track"):
            if candidate in tables:
                song_table = candidate
                break
        if not song_table:
            conn.close()
            return [], f"No known song table found in Serato DB (tables: {sorted(tables)[:10]})"

        cursor.execute(f'SELECT * FROM "{song_table}" LIMIT 1')
        columns = [desc[0] for desc in cursor.description]

        path_col = next((c for c in columns if c in ("path", "file_path", "file", "filename")), None)
        play_col = next((c for c in columns if c in ("play_count", "plays", "times_played")), None)
        title_col = next((c for c in columns if c in ("title", "song_title", "name")), None)
        artist_col = next((c for c in columns if c in ("artist", "artist_name")), None)
        bpm_col = next((c for c in columns if c == "bpm"), None)
        length_col = next((c for c in columns if c in ("length", "duration", "song_length")), None)

        sel_cols = [c for c in [path_col, play_col, title_col, artist_col, bpm_col, length_col] if c]
        if not path_col:
            conn.close()
            return [], "Serato DB has no path column"

        cursor.execute(f'SELECT {", ".join(sel_cols)} FROM "{song_table}"')
        tracks = []
        for row in cursor.fetchall():
            row_map = dict(zip(sel_cols, row))
            track = {
                "file": row_map.get(path_col, ""),
                "play_count": _int_or(str(row_map.get(play_col, 0)), 0) if play_col else 0,
                "title": row_map.get(title_col, "") if title_col else "",
                "artist": row_map.get(artist_col, "") if artist_col else "",
                "bpm": _float_or(str(row_map.get(bpm_col, 0)), 0.0) if bpm_col else 0.0,
                "length_s": _int_or(str(row_map.get(length_col, 0)), 0) if length_col else 0,
                "source": "serato",
            }
            tracks.append(track)
        conn.close()
        return tracks, None
    except sqlite3.Error as e:
        return [], f"Failed to read Serato SQLite DB: {e}"


def _auto_detect_database() -> str | None:
    """Find a DJ database automatically. Returns path or None."""
    if os.path.isfile(_VDJ_DEFAULT):
        return _VDJ_DEFAULT
    if os.path.isfile(_SERATO_DEFAULT):
        return _SERATO_DEFAULT
    return None


async def parse_dj_database(
    path: Annotated[
        str | None,
        Field(description="Explicit path to database.xml (VDJ) or 'database v2' (Serato). Auto-detects if omitted."),
    ] = None,
) -> dict:
    """Parse a DJ library database and return structured track metadata.

    Supports VirtualDJ (database.xml) and Serato (database v2 SQLite).
    Auto-detects the database path from standard install locations when not specified.

    ## Return Format
    {"success": bool, "source": "virtualdj"|"serato", "path": str, "total_tracks": int, "tracks": [...]}

    ## Examples
    await parse_dj_database()
    await parse_dj_database(path="C:\\Users\\sandr\\AppData\\Roaming\\VirtualDJ\\Database.xml")
    """
    try:
        target = path or _auto_detect_database()
        if not target:
            return _error_response(
                "No DJ database found. Provide an explicit path or install VirtualDJ/Serato.",
                "not_found",
                suggestions=[
                    f"VirtualDJ default: {_VDJ_DEFAULT}",
                    f"Serato default: {_SERATO_DEFAULT}",
                ],
            )

        name = os.path.basename(target).lower()
        if "virtualdj" in target.lower() or name in ("database.xml",):
            tracks, err = _parse_virtualdj_xml(target)
            source = "virtualdj"
        elif "serato" in target.lower() or "database v2" in target.lower():
            tracks, err = _parse_serato_db(target)
            source = "serato"
        else:
            return _error_response(
                f"Unknown database format: {target}",
                "validation",
                suggestions=["File should be VirtualDJ database.xml or Serato 'database v2'"],
            )

        if err:
            return _error_response(err, "parse_error")

        return {
            "success": True,
            "message": f"Parsed {len(tracks)} tracks from {source} database",
            "source": source,
            "path": target,
            "total_tracks": len(tracks),
            "tracks": tracks,
        }
    except Exception as e:
        return _error_response(str(e), "runtime")
