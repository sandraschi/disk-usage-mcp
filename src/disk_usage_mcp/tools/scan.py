from typing import Annotated

from pydantic import Field

from disk_usage_mcp.runner import run_dua


async def scan_path(
    path: Annotated[str, Field(description="Filesystem path or drive root to scan (e.g. D:\\, C:\\Users)")],
    max_depth: Annotated[int, Field(description="Maximum directory depth to recurse", ge=1, le=10)] = 3,
) -> dict:
    """Scan a drive or folder using dua-cli and return a structured JSON hierarchy of space usage.

    ## Return Format
    {"success": true, "data": {"name": "D:", "size": 1234567890, "children": [...]}}
    """
    result = await run_dua(path, max_depth)
    if not result["success"]:
        return {"success": False, "error": result["error"]}
    return {"success": True, "data": result["data"]}


async def find_large_files(
    path: Annotated[str, Field(description="Filesystem path to search")],
    min_size_gb: Annotated[float, Field(description="Minimum file size in gigabytes", ge=0.1)] = 1.0,
    limit: Annotated[int, Field(description="Max results to return", ge=1, le=500)] = 50,
) -> dict:
    """Find large files on a drive or folder.

    Uses dua-cli with deep scan to identify space-hogging files.

    ## Return Format
    {"success": true, "files": [{"path": "...", "size_gb": 1.5}]}
    """
    depth = 10
    result = await run_dua(path, depth)
    if not result["success"]:
        return {"success": False, "error": result["error"]}

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
    return {"success": True, "files": large_files[:limit]}
