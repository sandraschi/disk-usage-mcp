"""Connected-drive enumeration + cloud sync-folder detection for Sandra's HW setup.

Windows-only helpers (ctypes + shutil, no extra deps). Never raises - every
entry carries its own error field so the Drives page can show a full table
even when individual drives misbehave.
"""

import ctypes
import logging
import os
import shutil

logger = logging.getLogger(__name__)

_DRIVE_TYPE_NAMES = {
    0: "unknown",
    1: "no-root",
    2: "removable",
    3: "fixed",
    4: "network",
    5: "cdrom",
    6: "ramdisk",
}

_GB = 1024**3


def _drive_type(root: str) -> str:
    """Kernel drive type via GetDriveTypeW (removable = BYOD USB spinner)."""
    try:
        kind = ctypes.windll.kernel32.GetDriveTypeW(ctypes.c_wchar_p(root))
        return _DRIVE_TYPE_NAMES.get(int(kind), "unknown")
    except Exception:
        return "unknown"


def _volume_label(root: str) -> str:
    """Volume label, e.g. 'Google Drive' for the Drive-for-Desktop mount."""
    try:
        buf = ctypes.create_unicode_buffer(256)
        rc = ctypes.windll.kernel32.GetVolumeInformationW(ctypes.c_wchar_p(root), buf, 256, None, None, None, None, 0)
        return buf.value if rc else ""
    except Exception:
        return ""


def list_connected_drives() -> list[dict]:
    """Enumerate A-Z, returning stats for every reachable drive."""
    drives: list[dict] = []
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        root = f"{letter}:\\"
        if not os.path.exists(root):
            continue
        try:
            usage = shutil.disk_usage(root)
        except OSError as e:
            drives.append({"drive": root, "reachable": False, "error": str(e)})
            continue
        total = usage.total
        free = usage.free
        used = total - free
        drives.append(
            {
                "drive": root,
                "reachable": True,
                "label": _volume_label(root),
                "kind": _drive_type(root),
                "total_gb": round(total / _GB, 1),
                "used_gb": round(used / _GB, 1),
                "free_gb": round(free / _GB, 1),
                "percent_used": round((1 - free / total) * 100, 1) if total else 0,
            }
        )
    return drives


def _folder_gb(path: str) -> dict:
    """Best-effort size of a sync folder's host drive (+ existence flag)."""
    if not path or not os.path.isdir(path):
        return {"exists": False}
    try:
        # Drive stats for the volume hosting the folder - instant, no walk.
        anchor = os.path.splitdrive(os.path.abspath(path))[0] + "\\"
        usage = shutil.disk_usage(anchor)
        return {
            "exists": True,
            "host_drive": anchor,
            "host_free_gb": round(usage.free / _GB, 1),
        }
    except OSError:
        return {"exists": True}


def cloud_status() -> dict:
    """OneDrive + Google Drive sync-folder status (local detection, no OAuth)."""
    onedrive_path = (
        os.environ.get("OneDrive")
        or os.environ.get("OneDriveCommercial")
        or os.environ.get("OneDriveConsumer")
        or os.path.join(os.path.expanduser("~"), "OneDrive")
    )
    google_candidates = [
        "G:\\",
        os.path.join(os.path.expanduser("~"), "Google Drive"),
        os.path.join(os.path.expanduser("~"), "My Drive"),
    ]
    # Drive for Desktop mounts wherever free - find it by volume label first
    # (on Goliath it is H:\, not G:\). Physical disks never carry that label.
    labeled = next(
        (f"{letter}:\\" for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if _volume_label(f"{letter}:\\") == "Google Drive"),
        None,
    )
    if labeled:
        google_candidates.insert(0, labeled)
    google_path = next((p for p in google_candidates if os.path.isdir(p)), google_candidates[0])
    google_label = _volume_label(google_path) if os.path.exists(google_path) else ""
    return {
        "onedrive": {
            "configured": bool(onedrive_path and os.path.isdir(onedrive_path)),
            "local_path": onedrive_path or "",
            **_folder_gb(onedrive_path or ""),
            "note": "Quota needs Microsoft Graph OAuth - not wired yet. Local folder state only.",
        },
        "google": {
            "configured": os.path.isdir(google_path),
            "local_path": google_path,
            "volume_label": google_label,
            **_folder_gb(google_path),
            "note": "Quota needs Google Drive API OAuth - not wired yet. Local mount state only.",
        },
    }
