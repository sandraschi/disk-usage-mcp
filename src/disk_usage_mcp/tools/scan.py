from typing import Annotated

from pydantic import Field

from disk_usage_mcp.runner import run_dua


async def scan_path(
    path: Annotated[str, Field(description="Filesystem path or drive root to scan (e.g. D:\\, C:\\Users)")],
    max_depth: Annotated[int, Field(description="Maximum directory depth to recurse", ge=1, le=10)] = 3,
) -> dict:
    """Scan a drive or folder using dua-cli and return a structured JSON hierarchy of space usage.

    ## Return Format
    {"success": true, "message": str, "data": {"name": "D:", "size": 1234567890, "children": [...]}}

    ## Examples
    await scan_path(path="D:\\", max_depth=2)
    await scan_path(path="C:\\Users", max_depth=3)
    """
    result = await run_dua(path, max_depth)
    if not result["success"]:
        return {"success": False, "message": result["error"], "error": result["error"]}
    data = result["data"]
    size = data.get("size", 0) if isinstance(data, dict) else 0
    return {"success": True, "message": f"Scanned {path}: {size} bytes", "data": data}


async def find_large_files(
    path: Annotated[str, Field(description="Filesystem path to search")],
    min_size_gb: Annotated[float, Field(description="Minimum file size in gigabytes", ge=0.1)] = 1.0,
    limit: Annotated[int, Field(description="Max results to return", ge=1, le=500)] = 50,
) -> dict:
    """Find large files on a drive or folder.

    Uses dua-cli with deep scan to identify space-hogging files.

    ## Return Format
    {"success": true, "message": str, "files": [{"path": "...", "size_gb": 1.5}]}

    ## Examples
    await find_large_files(path="D:\\", min_size_gb=5.0)
    await find_large_files(path="C:\\Users", min_size_gb=1.0, limit=20)
    """
    depth = 10
    result = await run_dua(path, depth)
    if not result["success"]:
        return {"success": False, "message": result["error"], "error": result["error"]}

    large_files = []
    min_bytes = int(min_size_gb * 1024 * 1024 * 1024)

    def walk(node, prefix=""):
        if len(large_files) >= limit:
            return
        node_path = node.get("name", "")
        full = f"{prefix}\\{node_path}" if prefix else node_path
        if "children" in node:
            for child in node.get("children", []):
                walk(child, full)
                if len(large_files) >= limit:
                    return
        else:
            size = node.get("size", 0)
            if size >= min_bytes:
                large_files.append({"path": full, "size_gb": round(size / (1024**3), 2)})

    if isinstance(result.get("data"), dict):
        walk(result["data"])

    large_files.sort(key=lambda f: f["size_gb"], reverse=True)
    files = large_files[:limit]
    total_gb = round(sum(f["size_gb"] for f in files), 2)
    return {
        "success": True,
        "message": f"Found {len(files)} files over {min_size_gb} GB ({total_gb} GB total)",
        "files": files,
    }
