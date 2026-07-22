from typing import Annotated

from fastmcp import Context
from pydantic import Field

from disk_usage_mcp.runner import run_czkawka_dups


async def find_duplicates(
    search_paths: Annotated[list[str], Field(description="Directories or drive roots to scan for duplicates")],
    min_size_mb: Annotated[int, Field(description="Minimum file size in MB to consider", ge=1)] = 100,
    ctx: Context = None,
) -> dict:
    """Detect duplicate files across directories using czkawka_cli.

    Scans the given paths for duplicate files above the minimum size threshold.
    Results are grouped by duplicate hash with file paths and sizes.

    ## Return Format
    {"success": true, "duplicates": [{"hash": "...", "size_mb": 500, "files": ["path1", "path2"]}]}
    """
    result = await run_czkawka_dups(search_paths, min_size_mb)
    if not result["success"]:
        return {"success": False, "error": result["error"]}

    data = result.get("files", result.get("data", []))
    if isinstance(data, list):
        duplicates = []
        for group in data:
            if isinstance(group, dict):
                files = group.get("files", []) or group.get("path", [])
                size = group.get("size", 0) or group.get("bytes", 0)
                duplicates.append(
                    {
                        "hash": group.get("hash", ""),
                        "size_mb": round(size / (1024 * 1024), 2),
                        "files": files if isinstance(files, list) else [files],
                    }
                )
        return {"success": True, "duplicates": duplicates}
    return {"success": True, "duplicates": []}
