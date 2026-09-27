"""Crossconnect tests: a dead peer degrades to dialogic JSON, never raises.

BC is NOT required to run for these tests. Unreachable-peer cases point at
127.0.0.1:9 (discard port, always refused) via env override.
"""

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def client():
    from disk_usage_mcp.http_app import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def dead_peer(monkeypatch):
    monkeypatch.setenv("BEYONDCOMPARE_MCP_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("GOOGLE_DOCS_MCP_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("MULTI_BACKUP_MCP_URL", "http://127.0.0.1:9")


@pytest.mark.asyncio
async def test_bc_status_dead_peer(dead_peer):
    from disk_usage_mcp.services.bc_crossconnect import bc_status

    result = await bc_status()
    assert result["success"] is False
    assert result["reachable"] is False
    assert "beyondcompare-mcp" in result["message"]


@pytest.mark.asyncio
async def test_bc_compare_validates_local_paths_first(dead_peer, tmp_path):
    """Missing local dirs fail fast without touching the network."""
    from disk_usage_mcp.services.bc_crossconnect import bc_compare_folders

    missing = str(tmp_path / "nope")
    result = await bc_compare_folders(missing, str(tmp_path))
    assert result["success"] is False
    assert "not found" in result["message"]


@pytest.mark.asyncio
async def test_bc_compare_dead_peer_no_raise(dead_peer, tmp_path):
    """Real dirs + dead peer: dialogic failure, no exception."""
    from disk_usage_mcp.services.bc_crossconnect import bc_compare_folders

    a = tmp_path / "a"
    b = tmp_path / "b"
    a.mkdir()
    b.mkdir()
    result = await bc_compare_folders(str(a), str(b))
    assert result["success"] is False
    assert result["reachable"] is False
    assert "beyondcompare-mcp" in result["message"]


def test_pick_compare_tool_prefers_exact():
    from disk_usage_mcp.services.bc_crossconnect import _pick_compare_tool

    assert _pick_compare_tool(["compare_files", "compare_folders"]) == "compare_folders"
    assert _pick_compare_tool(["FolderCompare", "other"]) == "FolderCompare"
    assert _pick_compare_tool(["scan", "backup"]) is None


def test_crossconnect_base_unreachable_shape(dead_peer):
    from disk_usage_mcp.services.crossconnect_base import CrossconnectPeer

    peer = CrossconnectPeer(name="probe-mcp", base_url="http://127.0.0.1:9")
    result = peer.get_json("/api/health", timeout=2.0)
    assert result["success"] is False
    assert "probe-mcp" in result["message"]
    assert "127.0.0.1:9" in result["message"]


@pytest.mark.asyncio
async def test_peers_status_endpoint_dead_peers(client, dead_peer):
    resp = await client.get("/api/peers/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert set(data["peers"]) == {"beyondcompare", "google-docs", "multi-backup"}
    assert data["peers"]["beyondcompare"]["reachable"] is False


@pytest.mark.asyncio
async def test_peers_bc_compare_validates_paths(client):
    resp = await client.post(
        "/api/peers/bc/compare",
        json={"left_path": "Z:\\nope-1", "right_path": "Z:\\nope-2"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is False
