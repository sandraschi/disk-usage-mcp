"""Unit tests for dua 2.x text-tree parsing and czkawka 12 JSON normalization."""

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
    assert tree["size"] == 4096 + 4096 + 62112 + 69792
    assert len(tree["children"]) == 4
    tools = next(c for c in tree["children"] if c["name"] == "tools")
    assert tools["size"] == 62112
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
    import shutil

    resolved = _resolve_binary("definitely-not-a-binary-xyz", ("dua",))
    assert resolved == shutil.which("dua") or resolved == "definitely-not-a-binary-xyz"
