"""Tests for assfix round 2 endpoints: logs, skills, setup, fleet, llm, diff validation."""

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def client():
    from disk_usage_mcp.http_app import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_root_health_alias(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_status_endpoint(client):
    data = (await client.get("/api/status")).json()
    assert data["status"] == "ok"
    assert data["tool_count"] >= 7
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_capabilities_lists_new_routes(client):
    data = (await client.get("/api/capabilities")).json()
    for route in ("/api/logs", "/api/llm/chat", "/api/snapshot/diff", "/api/fleet/apps", "/api/setup/status"):
        assert route in data["endpoints"], route


@pytest.mark.asyncio
async def test_logs_ring_buffer(client):
    import logging

    logging.getLogger("disk-usage-mcp.test").warning("assfix-probe-log-line")
    data = (await client.get("/api/logs", params={"q": "assfix-probe-log-line"})).json()
    assert data["total"] >= 1
    assert any("assfix-probe-log-line" in e["message"] for e in data["logs"])


@pytest.mark.asyncio
async def test_skills_and_skill_content(client):
    skills = (await client.get("/api/skills")).json()["skills"]
    assert any(s["name"] == "disk-usage" for s in skills)
    content = (await client.get("/api/skills/disk-usage")).json()
    assert content["success"] is True
    assert "disk" in content["content"].lower()
    missing = (await client.get("/api/skills/nope")).json()
    assert missing["success"] is False
    traversal_resp = await client.get("/api/skills/..%2Fsecret")
    assert traversal_resp.status_code == 404 or traversal_resp.json().get("success") is False


@pytest.mark.asyncio
async def test_setup_status_shape(client):
    data = (await client.get("/api/setup/status")).json()
    assert "ready" in data
    assert "dua" in data["binaries"]
    assert "czkawka_cli" in data["binaries"]


@pytest.mark.asyncio
async def test_fleet_apps_shape(client):
    data = (await client.get("/api/fleet/apps")).json()
    assert "apps" in data
    assert data["source"] in ("WEBAPP_PORTS.md", "registry-missing")


@pytest.mark.asyncio
async def test_llm_endpoints_shape(client):
    discover = (await client.get("/api/llm/discover")).json()
    assert "ollama" in discover and "lmstudio" in discover and "gpu" in discover
    providers = (await client.get("/api/llm/providers")).json()
    assert len(providers["providers"]) == 2
    assert all("detected" in p and "models" in p for p in providers["providers"])
    models = (await client.get("/api/llm/models", params={"provider": "ollama"})).json()
    assert models["provider"] == "ollama"


@pytest.mark.asyncio
async def test_diff_rejects_bad_filenames(client):
    bad = (await client.get("/api/snapshot/diff", params={"from": "../x.json", "to": "y.json"})).json()
    assert bad["success"] is False
    missing = (await client.get("/api/snapshot/diff", params={"from": "nope.json", "to": "nope2.json"})).json()
    assert missing["success"] is False


@pytest.mark.asyncio
async def test_snapshot_not_found_envelope(client):
    data = (await client.get("/api/snapshot/does-not-exist.json")).json()
    assert data["success"] is False


@pytest.mark.asyncio
async def test_mcp_prompts_and_cards_registered():
    from disk_usage_mcp.server import mcp

    prompts = {p.name for p in await mcp.list_prompts()}
    assert "reclaim-plan" in prompts
    assert "snapshot-compare" in prompts
    tools = {t.name for t in await mcp.list_tools()}
    assert {"show_drives_card", "show_duplicates_card"} <= tools
    resources = {str(r.uri) for r in await mcp.list_resources()}
    assert "drive://list" in resources
    assert "skill://disk-usage" in resources
