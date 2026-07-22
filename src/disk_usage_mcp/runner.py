import asyncio
import logging
import shutil
from typing import Tuple

logger = logging.getLogger(__name__)


def _resolve_binary(name: str) -> str:
    """Resolve a CLI binary via PATH, returning the name for subprocess use."""
    resolved = shutil.which(name)
    if not resolved:
        logger.warning("Binary %s not found on PATH — tool calls will fail", name)
        return name
    return resolved


async def _run(cmd: list[str], timeout: int = 120) -> Tuple[str, str, int]:
    """Run a subprocess asynchronously and return (stdout, stderr, returncode)."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace"), proc.returncode or 0
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        msg = f"Command timed out after {timeout}s: {' '.join(cmd)}"
        logger.error(msg)
        return "", msg, -1


async def run_dua(path: str, max_depth: int = 3) -> dict:
    """Run dua-cli --format json and return parsed output."""
    binary = _resolve_binary("dua")
    cmd = [binary, "--format", "json", "--max-depth", str(max_depth), path]
    stdout, stderr, rc = await _run(cmd, timeout=300)
    if rc != 0:
        return {"success": False, "error": stderr or f"dua exited with code {rc}"}
    import json
    try:
        data = json.loads(stdout)
        return {"success": True, "data": data}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Failed to parse dua output: {e}"}


async def run_dua_tree(path: str, max_depth: int = 3) -> dict:
    """Run dua-cli with tree output format."""
    binary = _resolve_binary("dua")
    cmd = [binary, "--max-depth", str(max_depth), path]
    stdout, stderr, rc = await _run(cmd, timeout=300)
    if rc != 0:
        return {"success": False, "error": stderr or f"dua exited with code {rc}"}
    return {"success": True, "output": stdout}


async def run_czkawka_dups(paths: list[str], min_size_mb: int = 100) -> dict:
    """Run czkawka_cli dup and return parsed JSON."""
    binary = _resolve_binary("czkawka_cli")
    min_bytes = str(min_size_mb * 1024 * 1024)
    cmd = [binary, "dup", "-d"] + paths + ["-m", min_bytes, "--json"]
    stdout, stderr, rc = await _run(cmd, timeout=600)
    if rc != 0:
        return {"success": False, "error": stderr or f"czkawka_cli exited with code {rc}"}
    import json
    try:
        data = json.loads(stdout)
        return {"success": True, "files": data.get("duplicate_files", data.get("files", [])), "total_size": data.get("total_size", 0)}
    except json.JSONDecodeError:
        return {"success": True, "raw_output": stdout}


async def run_find_large(path: str, min_size_gb: float = 1.0, limit: int = 50) -> dict:
    """Find large files using a fast filesystem traversal (dua or direct)."""
    binary = _resolve_binary("dua")
    min_bytes = int(min_size_gb * 1024 * 1024 * 1024)
    cmd = [binary, "--format", "json", "--max-depth", "1", path]
    stdout, stderr, rc = await _run(cmd, timeout=120)
    if rc != 0:
        return {"success": False, "error": stderr or f"dua exited with code {rc}"}
    return {"success": True, "raw": stdout}
