"""Backup preflight crossconnect: space intelligence for multi-backup-mcp.

Ownership (mesh rule — no duplication): multi-backup-mcp owns jobs, schedules
and destinations (including the attic/Steve's offsite ledger). disk-usage-mcp
owns free-space truth. This module only READS peer destinations (never PUT)
and ranks them by live free space. When the peer is down it degrades to
ranking connected drives only — still useful, honestly labeled.
"""

import logging
import os

from disk_usage_mcp.services.crossconnect_base import CrossconnectPeer

logger = logging.getLogger(__name__)

BACKUP_PEER_NAME = "multi-backup-mcp"
BACKUP_MCP_URL = os.getenv("MULTI_BACKUP_MCP_URL", "http://127.0.0.1:10799")
BACKUP_REPO_URL = "https://github.com/sandraschi/multi-backup-mcp"


def _peer() -> CrossconnectPeer:
    return CrossconnectPeer(name=BACKUP_PEER_NAME, base_url=os.getenv("MULTI_BACKUP_MCP_URL", BACKUP_MCP_URL))


def backup_destinations() -> dict:
    """Read-only fetch of the peer's configured destination paths."""
    result = _peer().get_json("/api/repos/destinations", timeout=5.0)
    if not result["success"]:
        return {
            "success": False,
            "reachable": False,
            "message": f"{result['message']} Repo: {BACKUP_REPO_URL}",
            "error": result["message"],
            "destinations": [],
        }
    data = result.get("data")
    dests = data if isinstance(data, list) else data.get("destinations", []) if isinstance(data, dict) else []
    return {
        "success": True,
        "reachable": True,
        "message": f"{len(dests)} backup destinations from {BACKUP_PEER_NAME}",
        "destinations": dests,
    }


def _dest_path(dest: object) -> str:
    if isinstance(dest, str):
        return dest
    if isinstance(dest, dict):
        for key in ("path", "dest", "destination", "target"):
            if dest.get(key):
                return str(dest[key])
    return ""


def backup_preflight(bytes_needed: int, destination: str = "") -> dict:
    """Where can N bytes go? Rank peer destinations + connected drives by free space.

    Args:
        bytes_needed: bytes that must fit (callers pass GB * 1024**3).
        destination: optional single path to check instead of ranking all.
    """
    from disk_usage_mcp.drives import list_connected_drives

    if bytes_needed < 0:
        err = f"bytes_needed must be >= 0, got {bytes_needed}"
        return {"success": False, "message": err, "error": err, "candidates": []}

    drives = {d["drive"][0].upper(): d for d in list_connected_drives() if d.get("reachable")}
    dests = backup_destinations()
    peer_paths = [_dest_path(d) for d in dests["destinations"]] if dests["reachable"] else []
    peer_paths = [p for p in peer_paths if p]

    # Candidate pool: peer destinations first (that is where backups actually
    # land), then every other connected drive as an alternative. A peer-only
    # pool once concluded "500 GB fits NOWHERE" while M: had 1.7 TB free.
    pool: list[tuple[str, bool]] = []
    if destination:
        pool = [(destination, False)]
    else:
        seen_letters = set()
        for p in peer_paths:
            letter = p[0].upper() if len(p) >= 2 and p[1] == ":" else ""
            if letter:
                seen_letters.add(letter)
            pool.append((p, True))
        for key in sorted(drives):
            if key not in seen_letters:
                pool.append((f"{key}:\\", False))

    candidates = []
    for path, is_peer_dest in pool:
        letter = path[0].upper() if len(path) >= 2 and path[1] == ":" else ""
        drive = drives.get(letter) if letter else None
        if drive is None:
            candidates.append(
                {
                    "path": path,
                    "fits": False,
                    "backup_destination": is_peer_dest,
                    "reason": "drive not connected (attic? Steve's?)",
                }
            )
            continue
        free_bytes = int((drive.get("free_gb", 0) or 0) * 1024**3)
        fits = free_bytes >= bytes_needed
        candidates.append(
            {
                "path": path,
                "drive": drive.get("drive"),
                "free_gb": drive.get("free_gb"),
                "percent_used": drive.get("percent_used"),
                "fits": fits,
                "backup_destination": is_peer_dest,
                "reason": None if fits else f"only {drive.get('free_gb')} GB free",
            }
        )
    fitting = [c for c in candidates if c["fits"]]
    # Peer destinations first (backups actually land there), then tightest fit.
    fitting.sort(key=lambda c: (not c.get("backup_destination"), (c.get("free_gb") or 0) - bytes_needed / 1024**3))
    recommendation = fitting[0]["path"] if fitting else None
    need_gb = round(bytes_needed / 1024**3, 1)
    scope = f"destination {destination}" if destination else f"{len(candidates)} candidates"
    message = (
        f"{need_gb} GB fits on {recommendation} ({scope})"
        if recommendation
        else f"{need_gb} GB fits NOWHERE ({scope}) — time for the 30 TB spinner watch"
    )
    if not dests["reachable"]:
        message += " [peer destinations unknown — multi-backup-mcp down, ranked connected drives only]"
    return {
        "success": True,
        "reachable": dests["reachable"],
        "message": message,
        "bytes_needed": bytes_needed,
        "need_gb": need_gb,
        "recommendation": recommendation,
        "candidates": candidates,
    }
