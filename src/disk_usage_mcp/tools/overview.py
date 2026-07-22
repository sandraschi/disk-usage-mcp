from typing import Annotated

from pydantic import Field

from disk_usage_mcp.runner import run_dua


async def get_drive_overview(
    paths: Annotated[
        list[str], Field(description='List of drive roots or mount points to aggregate (e.g. ["C:\\", "D:\\"])')
    ],
) -> dict:
    """Aggregate disk usage across multiple drives or storage pools.

    Scans each path at depth 1 for a high-level overview without recursing into
    subdirectories. Returns total size per drive and grand total.

    ## Return Format
    {"success": true, "drives": [{"path": "D:\\", "size_bytes": ...}], "total_bytes": ...}
    """
    drives = []
    total_bytes = 0

    for p in paths:
        result = await run_dua(p, max_depth=1)
        if result["success"] and isinstance(result.get("data"), dict):
            size = result["data"].get("size", 0)
            drives.append({"path": p, "size_bytes": size})
            total_bytes += size
        else:
            drives.append({"path": p, "size_bytes": 0, "error": result.get("error", "scan failed")})

    drives.sort(key=lambda d: d["size_bytes"], reverse=True)
    return {"success": True, "drives": drives, "total_bytes": total_bytes}
