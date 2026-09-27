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


@pytest.fixture
def dead_rest_peers(monkeypatch):
    monkeypatch.setenv("GOOGLE_DOCS_MCP_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("MULTI_BACKUP_MCP_URL", "http://127.0.0.1:9")


def test_google_state_dead_peer_local_half_survives(dead_rest_peers):
    """Peer down: google_drive_state still returns local mount state, success True."""
    from disk_usage_mcp.services.google_crossconnect import google_drive_state

    result = google_drive_state()
    assert result["success"] is True
    assert result["reachable"] is False
    assert result["auth"] is None
    assert "local" in result
    assert result["quota"] is None
    assert "upstream" in result["quota_note"]


def test_backup_destinations_dead_peer(dead_rest_peers):
    from disk_usage_mcp.services.backup_crossconnect import backup_destinations

    result = backup_destinations()
    assert result["success"] is False
    assert result["reachable"] is False
    assert result["destinations"] == []
    assert "multi-backup-mcp" in result["message"]


def test_preflight_ranks_drives_without_peer(dead_rest_peers, monkeypatch):
    """Peer down + fake drives: smallest fitting drive wins, honest note appended."""
    import disk_usage_mcp.services.backup_crossconnect as bc

    fake = [
        {"drive": "M:\\", "reachable": True, "free_gb": 100.0, "percent_used": 50.0},
        {"drive": "N:\\", "reachable": True, "free_gb": 600.0, "percent_used": 30.0},
        {"drive": "F:\\", "reachable": True, "free_gb": 0.7, "percent_used": 100.0},
    ]
    monkeypatch.setattr("disk_usage_mcp.drives.list_connected_drives", lambda: fake)
    result = bc.backup_preflight(int(500 * 1024**3))
    assert result["success"] is True
    assert result["recommendation"] == "N:\\"
    assert "ranked connected drives only" in result["message"]


def test_preflight_fits_nowhere(dead_rest_peers, monkeypatch):
    import disk_usage_mcp.services.backup_crossconnect as bc

    fake = [{"drive": "F:\\", "reachable": True, "free_gb": 0.7, "percent_used": 100.0}]
    monkeypatch.setattr("disk_usage_mcp.drives.list_connected_drives", lambda: fake)
    result = bc.backup_preflight(int(500 * 1024**3))
    assert result["success"] is True
    assert result["recommendation"] is None
    assert "30 TB" in result["message"]


def test_preflight_missing_drive_flagged(dead_rest_peers, monkeypatch):
    """Explicit attic/Steve's path: flagged not-connected, never crashes."""
    import disk_usage_mcp.services.backup_crossconnect as bc

    monkeypatch.setattr("disk_usage_mcp.drives.list_connected_drives", lambda: [])
    result = bc.backup_preflight(int(1 * 1024**3), "Z:\\Backups")
    assert result["success"] is True
    assert result["candidates"][0]["fits"] is False
    assert "attic" in result["candidates"][0]["reason"]


def test_preflight_peer_dest_full_recommends_alternative(monkeypatch):
    """Peer dest on full C: + free M:: recommend the alternative, flag the dest."""
    import disk_usage_mcp.services.backup_crossconnect as bc

    fake_drives = [
        {"drive": "C:\\", "reachable": True, "free_gb": 12.5, "percent_used": 99.3},
        {"drive": "M:\\", "reachable": True, "free_gb": 1700.0, "percent_used": 53.0},
    ]
    monkeypatch.setattr("disk_usage_mcp.drives.list_connected_drives", lambda: fake_drives)
    monkeypatch.setattr(
        bc, "backup_destinations", lambda: {"success": True, "reachable": True, "destinations": ["C:\\Backups"]}
    )
    result = bc.backup_preflight(int(500 * 1024**3))
    assert result["success"] is True
    assert result["reachable"] is True
    assert result["recommendation"] == "M:\\"
    dest = next(c for c in result["candidates"] if c["path"] == "C:\\Backups")
    assert dest["fits"] is False
    assert dest["backup_destination"] is True


def test_preflight_rejects_negative():
    from disk_usage_mcp.services.backup_crossconnect import backup_preflight

    result = backup_preflight(-1)
    assert result["success"] is False


@pytest.mark.asyncio
async def test_peers_google_state_endpoint_shape(client):
    resp = await client.get("/api/peers/google/state")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "local" in data
    assert data["quota"] is None


@pytest.mark.asyncio
async def test_peers_preflight_endpoint_shape(client):
    resp = await client.post("/api/peers/backup/preflight", json={"bytes_needed_gb": 1})
    assert resp.status_code == 200
    assert resp.json()["success"] is True
