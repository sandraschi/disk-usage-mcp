"""Smoke tests — verify all modules import without errors."""


def test_server_imports():
    from disk_usage_mcp.server import mcp
    assert mcp is not None


def test_http_app_imports():
    from disk_usage_mcp.http_app import app
    assert app is not None


def test_config_imports():
    from disk_usage_mcp.config import BACKEND_PORT, FRONTEND_PORT
    assert BACKEND_PORT == 11114
    assert FRONTEND_PORT == 11115
