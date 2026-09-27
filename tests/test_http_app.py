"""Tests for the FastAPI HTTP endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def client():
    from disk_usage_mcp.http_app import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["server"] == "disk-usage-mcp"


@pytest.mark.asyncio
async def test_diagnostics_endpoint(client):
    resp = await client.get("/api/v1/diagnostics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["tool_count"] >= 3
    assert len(data["tools"]) >= 3


@pytest.mark.asyncio
async def test_drives_endpoint_shape(client):
    """GET /api/drives returns a drive list without needing dua installed."""
    resp = await client.get("/api/drives")
    assert resp.status_code == 200
    data = resp.json()
    assert "drives" in data
    assert isinstance(data["drives"], list)


@pytest.mark.asyncio
async def test_cloud_status_endpoint_shape(client):
    """GET /api/cloud/status reports onedrive + google state without OAuth."""
    resp = await client.get("/api/cloud/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "onedrive" in data
    assert "google" in data


@pytest.mark.asyncio
async def test_scan_missing_binary_no_500(client):
    """POST /api/scan on a bogus path returns JSON success=False, never a 500."""
    resp = await client.post("/api/scan", json={"path": "Z:\\definitely-not-here-123", "max_depth": 1})
    assert resp.status_code == 200
    assert resp.json()["success"] is False
