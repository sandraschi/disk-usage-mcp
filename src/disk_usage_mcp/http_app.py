import asyncio
import datetime
import json
import logging
import os
import shutil
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from disk_usage_mcp.config import BACKEND_PORT, SNAPSHOTS_DIR
from disk_usage_mcp.runner import run_dua

logger = logging.getLogger("disk-usage-mcp.http")

_LOG_RING: deque[dict] = deque(maxlen=500)


class _RingHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            _LOG_RING.append(
                {
                    "ts": datetime.datetime.fromtimestamp(record.created).isoformat(timespec="seconds"),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": record.getMessage(),
                }
            )
        except Exception:
            pass


logging.getLogger().addHandler(_RingHandler())

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434")
LMSTUDIO_BASE = os.getenv("LMSTUDIO_BASE", "http://127.0.0.1:1234")

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
    {"name": "server_help", "description": "List available tools and REST endpoints for this server"},
    {"name": "show_drives_card", "description": "Prefab card: available drives with usage stats"},
    {"name": "show_duplicates_card", "description": "Prefab card: duplicate-file groups across paths"},
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


class LlmChatRequest(BaseModel):
    provider: str = Field(default="ollama", description="ollama or lmstudio (local only, no keys)")
    model: str = Field(default="", description="Model id; empty = provider default/first available")
    messages: list[dict] = Field(default_factory=list, description="OpenAI-style [{role, content}]")
    system: str = Field(default="", description="Optional system preprompt (skill + personality)")


def _gpu_info() -> dict:
    """Best-effort GPU detection for the opportunity prompt. Never raises."""
    info: dict = {"present": False, "detail": ""}
    try:
        nvidia = shutil.which("nvidia-smi")
        if nvidia:
            import subprocess

            out = subprocess.run([nvidia, "-L"], capture_output=True, text=True, timeout=5).stdout.strip()
            if out:
                info = {"present": True, "detail": out.splitlines()[0][:160]}
    except Exception:
        pass
    return info


async def _ollama_models() -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            resp.raise_for_status()
            return [m.get("name", "") for m in resp.json().get("models", []) if m.get("name")]
    except Exception:
        return []


async def _lmstudio_models() -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{LMSTUDIO_BASE}/v1/models")
            resp.raise_for_status()
            return [m.get("id", "") for m in resp.json().get("data", []) if m.get("id")]
    except Exception:
        return []


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
            "/api/logs",
            "/api/setup/status",
            "/api/fleet/apps",
            "/api/scan",
            "/api/duplicates",
            "/api/large-files",
            "/api/snapshot/take",
            "/api/snapshots",
            "/api/snapshot/diff",
            "/api/snapshot/{filename}",
            "/api/llm/discover",
            "/api/llm/providers",
            "/api/llm/models",
            "/api/llm/chat",
            "/api/llm/chat/stream",
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


@app.get("/api/snapshot/diff")
async def diff_snapshots(from_file: str = Query(alias="from"), to_file: str = ""):
    """Compare two snapshots path-by-path and report size deltas in bytes."""

    def _load(name: str) -> dict:
        if not name or ".." in name or "/" in name or "\\" in name:
            raise ValueError(f"invalid snapshot filename: {name}")
        path = os.path.join(SNAPSHOTS_DIR, name)
        if not os.path.isfile(path):
            raise ValueError(f"snapshot not found: {name}")
        return json.loads(Path(path).read_text())

    try:
        older = _load(from_file)
        newer = _load(to_file)
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except (json.JSONDecodeError, OSError) as e:
        return {"success": False, "error": str(e)}

    def _index(snapshot: dict) -> dict[str, int]:
        index: dict[str, int] = {}
        for drive in snapshot.get("drives", []):
            data = drive.get("data") or {}
            if isinstance(data, dict) and isinstance(data.get("size"), int):
                index[drive.get("path", "?")] = data["size"]
        return index

    old_index, new_index = _index(older), _index(newer)
    deltas = []
    for path in sorted(set(old_index) | set(new_index)):
        before = old_index.get(path, 0)
        after = new_index.get(path, 0)
        delta = after - before
        deltas.append(
            {
                "path": path,
                "before_bytes": before,
                "after_bytes": after,
                "delta_bytes": delta,
                "delta_gb": round(delta / (1024**3), 2),
            }
        )
    deltas.sort(key=lambda d: d["delta_bytes"], reverse=True)
    total = sum(d["delta_bytes"] for d in deltas)
    return {
        "success": True,
        "message": f"Compared {from_file} -> {to_file}: {total} bytes total change",
        "from": from_file,
        "to": to_file,
        "total_delta_bytes": total,
        "total_delta_gb": round(total / (1024**3), 2),
        "deltas": deltas,
    }


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


@app.delete("/api/snapshot/{filename}")
async def delete_snapshot(filename: str):
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return {"success": False, "error": "invalid snapshot filename"}
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    if not os.path.isfile(filepath):
        return {"success": False, "error": "snapshot not found"}
    try:
        os.remove(filepath)
        return {"success": True, "message": f"Deleted snapshot {filename}"}
    except OSError as e:
        return {"success": False, "error": str(e)}


@app.get("/api/logs")
async def get_logs(level: str = "", q: str = "", limit: int = Query(default=200, ge=1, le=500)):
    """In-memory server log ring buffer (newest last)."""
    entries = list(_LOG_RING)
    if level:
        entries = [e for e in entries if e["level"] == level.upper()]
    if q:
        needle = q.lower()
        entries = [e for e in entries if needle in e["message"].lower() or needle in e["logger"].lower()]
    return {"logs": entries[-limit:], "total": len(entries)}


@app.get("/api/skills/{name}")
async def get_skill(name: str):
    from disk_usage_mcp.server import _read_skill

    content = _read_skill(name)
    if content is None:
        return {"success": False, "error": f"skill not found: {name}"}
    return {"success": True, "name": name, "content": content}


@app.get("/api/setup/status")
async def setup_status():
    """Binary prerequisites for onboarding (dua-cli, czkawka_cli). No keys, no auth."""
    import shutil as _shutil

    dua = _shutil.which("dua")
    czkawka = _shutil.which("czkawka_cli")
    ready = bool(dua and czkawka)
    return {
        "ready": ready,
        "message": "All prerequisites installed" if ready else "Install missing binaries (see docs/ONBOARDING.md)",
        "binaries": {
            "dua": {"found": bool(dua), "path": dua or "", "install": "winget install Byron.dua-cli"},
            "czkawka_cli": {"found": bool(czkawka), "path": czkawka or "", "install": "winget install qarmin.czkawka"},
        },
    }


def _parse_ports_registry() -> list[dict]:
    """Parse the fleet port registry into [{port, repo, description}]. Best effort."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "mcp-central-docs" / "operations" / "WEBAPP_PORTS.md",
        Path("D:/Dev/repos/mcp-central-docs/operations/WEBAPP_PORTS.md"),
    ]
    registry = next((p for p in candidates if p.is_file()), None)
    if registry is None:
        return []
    apps: list[dict] = []
    try:
        for line in registry.read_text(encoding="utf-8").splitlines():
            parts = [p.strip(" |") for p in line.split("|")]
            if len(parts) >= 4 and parts[0].isdigit():
                apps.append({"port": int(parts[0]), "repo": parts[1], "description": parts[2][:160]})
    except OSError:
        return []
    seen: dict[int, dict] = {}
    for app in apps:
        seen.setdefault(app["port"], app)
    return sorted(seen.values(), key=lambda a: a["port"])


@app.get("/api/fleet/apps")
async def fleet_apps(probe: bool = False):
    """Fleet Apps Hub data: registry entries, optionally live-probed. Unknown ports -> Experimental."""
    apps = _parse_ports_registry()
    if probe and apps:
        sem = asyncio.Semaphore(50)

        async def _check(app: dict) -> None:
            async with sem:
                try:
                    async with httpx.AsyncClient(timeout=0.4) as client:
                        resp = await client.get(f"http://127.0.0.1:{app['port']}/api/health")
                        app["live"] = resp.status_code == 200
                        return
                except Exception:
                    pass
                try:
                    async with httpx.AsyncClient(timeout=0.4) as client:
                        resp = await client.get(f"http://127.0.0.1:{app['port']}/health")
                        app["live"] = resp.status_code == 200
                except Exception:
                    app["live"] = False

        await asyncio.gather(*(_check(a) for a in apps))
    return {"apps": apps, "source": "WEBAPP_PORTS.md" if apps else "registry-missing", "probed": probe}


async def _llm_state() -> dict:
    ollama_models = await _ollama_models()
    lmstudio_models = await _lmstudio_models()
    return {
        "ollama": {"available": True, "models": ollama_models}
        if ollama_models or await _port_open(11434)
        else {"available": False, "models": []},
        "lmstudio": {"available": True, "models": lmstudio_models}
        if lmstudio_models or await _port_open(1234)
        else {"available": False, "models": []},
        "gpu": _gpu_info(),
    }


async def _port_open(port: int) -> bool:
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection("127.0.0.1", port), timeout=1.0)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except Exception:
        return False


@app.get("/api/llm/discover")
async def llm_discover():
    """Auto-detect local LLM providers (Ollama :11434, LM Studio :1234). Local only, no keys."""
    state = await _llm_state()
    return {
        "ollama": {"available": state["ollama"]["available"], "models": state["ollama"]["models"]},
        "lmstudio": {"available": state["lmstudio"]["available"], "models": state["lmstudio"]["models"]},
        "gpu": state["gpu"],
    }


@app.get("/api/llm/providers")
async def llm_providers():
    state = await _llm_state()
    return {
        "providers": [
            {
                "id": "ollama",
                "name": "Ollama (local)",
                "kind": "local",
                "free": True,
                "detected": state["ollama"]["available"],
                "models": state["ollama"]["models"],
            },
            {
                "id": "lmstudio",
                "name": "LM Studio (local)",
                "kind": "local",
                "free": True,
                "detected": state["lmstudio"]["available"],
                "models": state["lmstudio"]["models"],
            },
        ],
        "gpu": state["gpu"],
        "note": "Local providers only - no accounts, no API keys, no cloud calls.",
    }


@app.get("/api/llm/models")
async def llm_models(provider: str = "ollama"):
    state = await _llm_state()
    key = "lmstudio" if provider == "lmstudio" else "ollama"
    return {"provider": key, "models": state[key]["models"], "available": state[key]["available"]}


async def _chat_ollama(model: str, messages: list[dict]) -> tuple[str, str]:
    if not model:
        models = await _ollama_models()
        if not models:
            raise RuntimeError("Ollama has no models loaded - pull one first (ollama pull llama3.1)")
        model = models[0]
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE}/api/chat", json={"model": model, "messages": messages, "stream": False}
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"], model


async def _chat_lmstudio(model: str, messages: list[dict]) -> tuple[str, str]:
    if not model:
        models = await _lmstudio_models()
        if not models:
            raise RuntimeError("LM Studio has no model loaded - load one in the LM Studio UI first")
        model = models[0]
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(
            f"{LMSTUDIO_BASE}/v1/chat/completions", json={"model": model, "messages": messages, "stream": False}
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"], model


def _chat_messages(body: LlmChatRequest) -> list[dict]:
    messages = list(body.messages)
    if body.system:
        messages = [{"role": "system", "content": body.system}] + messages
    return messages


@app.post("/api/llm/chat")
async def llm_chat(body: LlmChatRequest):
    """Backend chat proxy - the ONLY path the Chat page uses. Keys never leave the server (local providers need none)."""
    try:
        messages = _chat_messages(body)
        if body.provider == "lmstudio":
            reply, model = await _chat_lmstudio(body.model, messages)
        else:
            reply, model = await _chat_ollama(body.model, messages)
        return {"success": True, "reply": reply, "provider": body.provider, "model": model}
    except Exception as e:
        logger.exception("LLM chat failed")
        return {"success": False, "error": str(e)}


@app.post("/api/llm/chat/stream")
async def llm_chat_stream(body: LlmChatRequest):
    """Streaming chat proxy (SSE: data: {delta} frames, then data: [DONE])."""

    async def _generate():
        try:
            messages = _chat_messages(body)
            if body.provider == "lmstudio":
                async with httpx.AsyncClient(timeout=300.0) as client:
                    model = body.model or (await _lmstudio_models() or [""])[0]
                    async with client.stream(
                        f"{LMSTUDIO_BASE}/v1/chat/completions",
                        json={"model": model, "messages": messages, "stream": True},
                        method="POST",
                    ) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if line.startswith("data:"):
                                payload = line[5:].strip()
                                if payload == "[DONE]":
                                    break
                                try:
                                    delta = json.loads(payload)["choices"][0]["delta"].get("content", "")
                                    if delta:
                                        yield f"data: {json.dumps({'delta': delta})}\n\n"
                                except (json.JSONDecodeError, KeyError, IndexError):
                                    continue
            else:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    model = body.model
                    if not model:
                        models = await _ollama_models()
                        model = models[0] if models else ""
                    async with client.stream(
                        f"{OLLAMA_BASE}/api/chat",
                        json={"model": model, "messages": messages, "stream": True},
                        method="POST",
                    ) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if not line.strip():
                                continue
                            try:
                                delta = json.loads(line)["message"].get("content", "")
                                if delta:
                                    yield f"data: {json.dumps({'delta': delta})}\n\n"
                            except (json.JSONDecodeError, KeyError):
                                continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(_generate(), media_type="text/event-stream")
