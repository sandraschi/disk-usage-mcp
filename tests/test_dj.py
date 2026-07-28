"""Tests for the DJ library parser tools."""

import os
import tempfile
import xml.etree.ElementTree as ET

from disk_usage_mcp.tools.dj import _auto_detect_database, _parse_serato_db, _parse_virtualdj_xml, parse_dj_database


def _make_vdj_xml(tracks: list[dict]) -> str:
    root = ET.Element("VirtualDJ_Database")
    for t in tracks:
        song = ET.SubElement(root, "Song")
        for k, v in t.items():
            el = ET.SubElement(song, k)
            el.text = str(v)
    return ET.tostring(root, encoding="unicode")


def test_parse_virtualdj_xml_empty():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
        f.write("<VirtualDJ_Database/>")
        p = f.name
    try:
        tracks, err = _parse_virtualdj_xml(p)
        assert err is None
        assert tracks == []
    finally:
        os.unlink(p)


def test_parse_virtualdj_xml_tracks():
    xml = _make_vdj_xml(
        [
            {
                "Title": "Test Track",
                "Artist": "Test Artist",
                "File": "D:\\Music\\test.mp3",
                "PlayCount": "5",
                "Length": "240",
                "BitRate": "320",
                "BPM": "128",
                "Type": "mp3",
            },
            {
                "Title": "Unplayed",
                "Artist": "Artist2",
                "File": "D:\\Music\\unplayed.flac",
                "PlayCount": "0",
                "Length": "360",
                "BitRate": "0",
                "Type": "flac",
            },
        ]
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
        f.write(xml)
        p = f.name
    try:
        tracks, err = _parse_virtualdj_xml(p)
        assert err is None
        assert len(tracks) == 2
        assert tracks[0]["title"] == "Test Track"
        assert tracks[0]["play_count"] == 5
        assert tracks[0]["bpm"] == 128.0
        assert tracks[0]["type"] == "mp3"
        assert tracks[1]["play_count"] == 0
        assert tracks[1]["type"] == "flac"
    finally:
        os.unlink(p)


def test_parse_virtualdj_xml_missing_file():
    tracks, err = _parse_virtualdj_xml("C:\\nonexistent\\Database.xml")
    assert tracks == []
    assert err is not None
    assert "not found" in err


def test_parse_virtualdj_xml_bad_xml():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
        f.write("not xml")
        p = f.name
    try:
        tracks, err = _parse_virtualdj_xml(p)
        assert tracks == []
        assert err is not None
        assert "Failed" in err
    finally:
        os.unlink(p)


def test_parse_serato_db_missing():
    tracks, err = _parse_serato_db("C:\\nonexistent\\database v2")
    assert tracks == []
    assert "not found" in err


def test_auto_detect_returns_none_on_clean_machine():
    assert _auto_detect_database() is None


def test_parse_dj_database_no_db():
    import asyncio

    result = asyncio.run(parse_dj_database())
    assert not result["success"]
    assert result["error_type"] == "not_found"
