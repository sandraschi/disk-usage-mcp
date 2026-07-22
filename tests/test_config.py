"""Tests for configuration module."""

from disk_usage_mcp.config import BACKEND_PORT, FRONTEND_PORT, SNAPSHOTS_DIR


def test_ports_are_integers():
    assert isinstance(BACKEND_PORT, int)
    assert isinstance(FRONTEND_PORT, int)


def test_default_port_values():
    assert BACKEND_PORT == 11114
    assert FRONTEND_PORT == 11115


def test_snapshots_dir_is_string():
    assert isinstance(SNAPSHOTS_DIR, str)
    assert "snapshots" in SNAPSHOTS_DIR
