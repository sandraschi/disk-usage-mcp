"""Tests for the async subprocess runner — unit-level, no CLI binaries required."""

import pytest

from disk_usage_mcp.runner import _resolve_binary, _run


@pytest.mark.asyncio
async def test_run_no_binary_graceful():
    """Missing binary returns (\"\", message, 127) instead of raising - no more HTTP 500s."""
    stdout, stderr, rc = await _run(["non_existent_command_xyz"])
    assert stdout == ""
    assert rc == 127
    assert "not found" in stderr.lower()
    assert "winget" in stderr.lower()


def test_resolve_binary_unknown():
    """Resolving a non-existent binary returns the name as-is."""
    name = "definitely-not-installed-123"
    assert _resolve_binary(name) == name
