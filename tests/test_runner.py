"""Tests for the async subprocess runner — unit-level, no CLI binaries required."""

import pytest

from disk_usage_mcp.runner import _run, _resolve_binary


@pytest.mark.asyncio
async def test_run_no_binary_graceful():
    """Running a non-existent command should raise FileNotFoundError on Windows."""
    with pytest.raises(FileNotFoundError):
        await _run(["non_existent_command_xyz"])


def test_resolve_binary_unknown():
    """Resolving a non-existent binary returns the name as-is."""
    name = "definitely-not-installed-123"
    assert _resolve_binary(name) == name
