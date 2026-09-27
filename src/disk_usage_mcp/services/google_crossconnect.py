"""Google Drive crossconnect: account state from google-docs-mcp, mount state local.

google-docs-mcp's DriveOperation has NO quota/about op (verified 2026-09-27),
so live quota stays PLANNED upstream. What IS wired: OAuth account state via
its REST `/api/auth/status` (configured/authenticated/scopes) combined with
our local mount detection. Quota needs a google-docs `about` op — requested
upstream, not built here.
"""

import logging
import os

from disk_usage_mcp.services.crossconnect_base import CrossconnectPeer

logger = logging.getLogger(__name__)

GOOGLE_PEER_NAME = "google-docs-mcp"
GOOGLE_MCP_URL = os.getenv("GOOGLE_DOCS_MCP_URL", "http://127.0.0.1:11972")
GOOGLE_REPO_URL = "https://github.com/sandraschi/google-docs-mcp"


def _peer() -> CrossconnectPeer:
    return CrossconnectPeer(name=GOOGLE_PEER_NAME, base_url=os.getenv("GOOGLE_DOCS_MCP_URL", GOOGLE_MCP_URL))


def google_auth_state() -> dict:
    """OAuth account state from the peer. Soft-degrades when peer is down."""
    result = _peer().get_json("/api/auth/status", timeout=5.0)
    if not result["success"]:
        return {
            "success": False,
            "reachable": False,
            "message": f"{result['message']} Repo: {GOOGLE_REPO_URL}",
            "error": result["message"],
            "auth": None,
        }
    return {
        "success": True,
        "reachable": True,
        "message": "Google account state from google-docs-mcp",
        "auth": result["data"] if isinstance(result.get("data"), dict) else {"raw": result.get("data")},
    }


def google_drive_state() -> dict:
    """Combined Google state: account (peer, optional) + local mount (always).

    Never fails outright — the local half works standalone, which is exactly
    what the Cloud page showed before this crossconnect existed.
    """
    from disk_usage_mcp.drives import cloud_status

    local = cloud_status().get("google", {})
    auth = google_auth_state()
    if auth["reachable"]:
        state = auth["auth"] or {}
        summary = (
            "Google Drive connected (account + local mount)"
            if state.get("authenticated") and local.get("configured")
            else f"account authenticated={state.get('authenticated')}, local mount={local.get('local_path')}"
        )
        return {
            "success": True,
            "reachable": True,
            "message": summary,
            "auth": state,
            "local": local,
            "quota": None,
            "quota_note": "Drive quota needs a google-docs-mcp `about` op (upstream, not yet available).",
        }
    return {
        "success": True,
        "reachable": False,
        "message": f"Local mount state only — {auth['message']}",
        "auth": None,
        "local": local,
        "quota": None,
        "quota_note": "Drive quota needs a google-docs-mcp `about` op (upstream, not yet available).",
    }
