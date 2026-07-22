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
