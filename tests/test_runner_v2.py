"""Unit tests for dua 2.x text-tree parsing and czkawka 12 JSON normalization."""

import pytest

from disk_usage_mcp.runner import _normalize_czkawka_json, _parse_dua_tree, _resolve_binary

DUA_SAMPLE = """\
      4096 b config.py
      4096 b runner.py
     62112 b tools
         0 b   __init__.py
       504 b   utils.py
      4096 b   scan.py
     37032 b   __pycache__
     69792 b __pycache__
    185440 b total
"""

CZK_SAMPLE = {
    "5002": [
        [
            {"path": "C:\\t\\a\\same.txt", "modified_date": 1789948106, "size": 5002, "hash": "abc123"},
            {"path": "C:\\t\\b\\same.txt", "modified_date": 1789948106, "size": 5002, "hash": "abc123"},
        ]
    ]
}


def test_parse_dua_tree_structure():
    tree = _parse_dua_tree(DUA_SAMPLE, "D:\\src")
    assert tree["name"] == "D:\\src"
    # dua 2.x prints OWN sizes; parents roll up descendants (62112 + 0 + 504 + 4096 + 37032).
    tools_total = 62112 + 0 + 504 + 4096 + 37032
    assert tree["size"] == 4096 + 4096 + tools_total + 69792
    assert len(tree["children"]) == 4
    tools = next(c for c in tree["children"] if c["name"] == "tools")
    assert tools["size"] == tools_total
    assert len(tools["children"]) == 4
    assert tools["children"][0]["name"] == "__init__.py"
    assert "__pycache__" in [c["name"] for c in tools["children"]]
    # No total line leaks in as a node
    assert all(c["name"] != "total" for c in tree["children"])


def test_parse_dua_tree_empty():
    tree = _parse_dua_tree("", "D:\\empty")
    assert tree == {"name": "D:\\empty", "size": 0, "children": []}


def test_normalize_czkawka_json():
    groups = _normalize_czkawka_json(CZK_SAMPLE)
    assert len(groups) == 1
    assert groups[0]["hash"] == "abc123"
    assert groups[0]["size"] == 5002
    assert groups[0]["files"] == ["C:\\t\\a\\same.txt", "C:\\t\\b\\same.txt"]


def test_normalize_czkawka_empty():
    assert _normalize_czkawka_json({}) == []
    assert _normalize_czkawka_json({"10": []}) == []


def test_resolve_binary_prefers_existing():
    import os
    import shutil

    resolved = _resolve_binary("definitely-not-a-binary-xyz", ("dua",))
    # Resolution sources: PATH, then %LOCALAPPDATA%\Microsoft\WinGet\Links (stale-shell proof).
    links = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links")
    acceptable = {shutil.which("dua"), "definitely-not-a-binary-xyz"}
    acceptable |= {os.path.join(links, "dua"), os.path.join(links, "dua.exe")}
    assert resolved in acceptable


def test_parse_dua_tree_strips_io_error_markers():
    """Drive roots list locked system files with '<N IO Error>' suffixes (dua 2.44)."""
    from disk_usage_mcp.runner import _parse_dua_tree

    sample = "         0 b pagefile.sys  <1 IO Error>\n         0 b System Volume Information  <1 IO Error>\n      4096 b NVIDIA Corporation\n"
    tree = _parse_dua_tree(sample, "D:\\")
    names = [c["name"] for c in tree["children"]]
    assert names == ["pagefile.sys", "System Volume Information", "NVIDIA Corporation"]


def test_parse_dua_tree_drops_total_with_error_count():
    """dua 2.44 summary line 'total  <56 IO Errors>' (plural) must not leak in."""
    from disk_usage_mcp.runner import _parse_dua_tree

    sample = "      4096 b Ollama\n   1479000 b total  <56 IO Errors>\n"
    tree = _parse_dua_tree(sample, "D:\\")
    assert [c["name"] for c in tree["children"]] == ["Ollama"]


@pytest.mark.asyncio
async def test_run_dua_tolerates_partial_output(tmp_path, monkeypatch):
    """dua rc=1 (unreadable system entries) + usable tree => success with partial flag."""
    import disk_usage_mcp.runner as runner

    async def fake_run(cmd, timeout=120):
        return ("      4096 b NVIDIA Corporation\n      4096 b Ollama\n", "", 1)

    monkeypatch.setattr(runner, "_run", fake_run)
    result = await runner.run_dua(str(tmp_path), 1)
    assert result["success"] is True
    assert result["partial"] is True
    assert len(result["data"]["children"]) == 2


@pytest.mark.asyncio
async def test_run_dua_fails_on_empty_output(tmp_path, monkeypatch):
    """dua rc=1 with NO usable stdout is still a real failure."""
    import disk_usage_mcp.runner as runner

    async def fake_run(cmd, timeout=120):
        return ("", "total failure", 1)

    monkeypatch.setattr(runner, "_run", fake_run)
    result = await runner.run_dua(str(tmp_path), 1)
    assert result["success"] is False
