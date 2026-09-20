import asyncio
import datetime
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from disk_usage_mcp.config import BACKEND_PORT, SNAPSHOTS_DIR
from disk_usage_mcp.runner import run_dua

_STARTED_AT = time.time()

TOOL_DEFS = [
    {"name": "scan_path", "description": "Scan a drive or folder using dua-cli, returning structured JSON hierarchy"},
    {"name": "find_large_files", "description": "Find files above a size threshold via deep dua tree walk"},
    {"name": "get_drive_overview", "description": "Aggregate disk usage across multiple drives at depth 1"},
    {"name": "find_duplicates", "description": "Find duplicate files using czkawka_cli across given paths"},
    {
        "name": "disk_usage",
        "description": "Portmanteau: scan (JSON tree), tree (human-readable), drive_overview (multi-drive)",
    },
    {"name": "parse_dj_database", "description": "Parse VirtualDJ/Serato DJ library database into track metadata"},
]


class SnapshotRequest(BaseModel):
    paths: list[str]
    label: str = ""


class ScanRequest(BaseModel):
    path: str
    max_depth: int = Field(default=3, ge=1, le=10)


class DuplicatesRequest(BaseModel):
    paths: list[str]
    min_size_mb: int = Field(default=100, ge=1)


class LargeFilesRequest(BaseModel):
    path: str
    min_size_gb: float = Field(default=1.0, ge=0.1)
    limit: int = Field(default=50, ge=1, le=500)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="disk-usage-mcp API",
    version="0.1.0",
    lifespan=lifespan,
)

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


def _snapshot_count() -> int:
    if not os.path.isdir(SNAPSHOTS_DIR):
        return 0
    return len(list(Path(SNAPSHOTS_DIR).glob("*.json")))


@app.get("/health")
async def root_health():
    """Fleet launcher probe (see fleet-start.config.ps1 HealthPath)."""
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tool_count": len(TOOL_DEFS),
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tool_count": len(TOOL_DEFS),
        "snapshots_dir": str(SNAPSHOTS_DIR),
    }


@app.get("/api/status")
async def status():
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _STARTED_AT, 1),
        "tool_count": len(TOOL_DEFS),
        "snapshots": _snapshot_count(),
    }


@app.get("/api/capabilities")
async def capabilities():
    return {
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tools": TOOL_DEFS,
        "features": ["scan", "large-files", "duplicates", "snapshots", "dj-database"],
        "endpoints": [
            "/health",
            "/api/health",
            "/api/status",
            "/api/capabilities",
            "/api/skills",
            "/api/scan",
            "/api/duplicates",
            "/api/large-files",
            "/api/snapshot/take",
            "/api/snapshots",
            "/api/snapshot/{filename}",
            "/api/v1/diagnostics",
        ],
    }


@app.get("/api/skills")
async def skills():
    skills_dir = Path(__file__).resolve().parent.parent.parent / "skills"
    names: list[str] = []
    if skills_dir.is_dir():
        names = sorted(p.name for p in skills_dir.iterdir() if (p / "SKILL.md").is_file())
    return {"skills": [{"name": n, "uri": f"skill://{n}"} for n in names]}


@app.post("/api/shutdown")
async def shutdown():
    """Orderly exit for the fleet launcher: 200 now, process exit 500 ms later."""

    async def _exit_soon():
        await asyncio.sleep(0.5)
        os._exit(0)

    asyncio.create_task(_exit_soon())
    return {"status": "shutting-down", "server": "disk-usage-mcp"}


@app.get("/api/v1/diagnostics")
async def diagnostics():
    return {
        "status": "ok",
        "server": "disk-usage-mcp",
        "version": "0.1.0",
        "tool_count": len(TOOL_DEFS),
        "tools": TOOL_DEFS,
        "system": {"windows": True},
        "errors": [],
        "snapshots": _snapshot_count(),
    }


@app.post("/api/scan")
async def scan(body: ScanRequest):
    result = await run_dua(body.path, body.max_depth)
    return result


@app.post("/api/duplicates")
async def duplicates(body: DuplicatesRequest):
    from disk_usage_mcp.tools.duplicates import find_duplicates

    return await find_duplicates(search_paths=body.paths, min_size_mb=body.min_size_mb)


@app.post("/api/large-files")
async def large_files(body: LargeFilesRequest):
    from disk_usage_mcp.tools.scan import find_large_files

    return await find_large_files(path=body.path, min_size_gb=body.min_size_gb, limit=body.limit)


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
    return {
        "success": True,
        "message": f"Snapshot {filename} saved ({len(drives)} drives)",
        "snapshot_file": filename,
        "drives": len(drives),
    }


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
    if ".." in filename or "/" in filename or "\\" in filename:
        return {"success": False, "error": "invalid snapshot filename"}
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    if not os.path.isfile(filepath):
        return {"success": False, "error": "snapshot not found"}
    try:
        data = json.loads(Path(filepath).read_text())
        return data
    except (json.JSONDecodeError, OSError) as e:
        return {"success": False, "error": str(e)}
