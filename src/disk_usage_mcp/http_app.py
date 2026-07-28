import datetime
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from disk_usage_mcp.config import BACKEND_PORT, SNAPSHOTS_DIR
from disk_usage_mcp.runner import run_dua


class SnapshotRequest(BaseModel):
    paths: list[str]
    label: str = ""


class ScanRequest(BaseModel):
    path: str
    max_depth: int = 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="disk-usage-mcp API",
    version="0.1.0",
)


@app.on_event("startup")
async def _startup():
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)


_tauri = os.environ.get("DISK_USAGE_TAURI", "").lower() in ("1", "true", "yes")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{BACKEND_PORT}",
        f"http://127.0.0.1:{BACKEND_PORT}",
        "http://tauri.localhost",
        "https://tauri.localhost",
        "tauri://localhost",
    ],
    allow_origin_regex=r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tool_count": 3,
        "snapshots_dir": str(SNAPSHOTS_DIR),
    }


@app.get("/api/v1/diagnostics")
async def diagnostics():
    snapshots = list(Path(SNAPSHOTS_DIR).glob("*.json")) if os.path.isdir(SNAPSHOTS_DIR) else []
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tool_count": 3,
        "tools": [
            {"name": "disk_usage"},
            {"name": "find_large_files"},
            {"name": "find_duplicates"},
        ],
        "system": {"windows": True},
        "errors": [],
        "snapshots": len(snapshots),
    }


@app.post("/api/scan")
async def scan(body: ScanRequest):
    result = await run_dua(body.path, body.max_depth)
    return result


@app.post("/api/snapshot/take")
async def take_snapshot(body: SnapshotRequest):
    drives = []
    for p in body.paths:
        result = await run_dua(p, max_depth=1)
        drives.append({"path": p, "data": result.get("data")})
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    label = body.label.replace(" ", "_") if body.label else f"snapshot_{ts}"
    filename = f"{label}_{ts}.json"
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    snapshot = {
        "timestamp": ts,
        "label": label,
        "paths": body.paths,
        "drives": drives,
    }
    with open(filepath, "w") as f:
        json.dump(snapshot, f, indent=2, default=str)
    return {"success": True, "snapshot_file": filename, "drives": len(drives)}


@app.get("/api/snapshots")
async def list_snapshots():
    snapshots_dir = Path(SNAPSHOTS_DIR)
    if not snapshots_dir.is_dir():
        return {"snapshots": []}
    files = sorted(snapshots_dir.glob("*.json"), reverse=True)
    result = []
    for f in files:
        try:
            data = json.loads(f.read_text())
            result.append(
                {
                    "file": f.name,
                    "timestamp": data.get("timestamp", ""),
                    "label": data.get("label", ""),
                    "paths": data.get("paths", []),
                }
            )
        except (json.JSONDecodeError, OSError):
            result.append({"file": f.name, "timestamp": "", "label": "", "paths": []})
    return {"snapshots": result}


@app.get("/api/snapshot/{filename}")
async def get_snapshot(filename: str):
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    if not os.path.isfile(filepath):
        return {"error": "snapshot not found"}
    try:
        data = json.loads(Path(filepath).read_text())
        return data
    except (json.JSONDecodeError, OSError) as e:
        return {"error": str(e)}
