from typing import Annotated

from pydantic import Field

from disk_usage_mcp.runner import run_find_large
from disk_usage_mcp.tools.utils import _error_response


async def find_large_files(
    path: Annotated[str, Field(description="Directory path to scan.")],
    min_size_gb: Annotated[float, Field(description="Minimum file size in GB.", ge=0.1)] = 1.0,
    limit: Annotated[int, Field(description="Max results.", ge=1, le=500)] = 50,
) -> dict:
    """Find files larger than a threshold across a directory tree.

    Uses dua-cli to get a fast top-level size breakdown, then identifies
    the largest entries for space recovery planning.

    ## Return Format
    {"success": bool, "entries": list, "message": str}

    ## Examples
    await find_large_files(path="D:\\Media", min_size_gb=5.0)
    await find_large_files(path="E:\\", min_size_gb=0.5, limit=100)
    """
    try:
        result = await run_find_large(path, min_size_gb, limit)
        if not result.get("success"):
            return result
        return {
            "success": True,
            "entries": result.get("raw", ""),
            "path": path,
            "min_size_gb": min_size_gb,
            "message": f"Found large files (>{min_size_gb} GB) under {path}.",
        }
    except Exception as e:
        return _error_response(str(e), "runtime")
