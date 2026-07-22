from typing import Annotated, Literal

from pydantic import Field

from disk_usage_mcp.runner import run_dua, run_dua_tree
from disk_usage_mcp.tools.utils import _error_response


async def disk_usage(
    operation: Annotated[Literal["scan", "tree", "drive_overview"], Field(description="Operation to perform.")],
    path: Annotated[str | None, Field(description="Target path (required for scan, tree).")] = None,
    max_depth: Annotated[int, Field(description="Max directory depth.", ge=1, le=10)] = 3,
    paths: Annotated[
        list[str] | None, Field(description="Drive paths for overview (required for drive_overview).")
    ] = None,
) -> dict:
    """[RATIONALE] Portmanteau consolidating dua-cli operations.

    Operations:
    - scan: JSON hierarchy with sizes per directory
    - tree: Terminal-style tree output
    - drive_overview: Summary across multiple drive roots

    ## Return Format
    {"success": bool, "data": {...} | "output": str, "error": str | null}

    ## Examples
    await disk_usage(operation="scan", path="C:\\Users")
    await disk_usage(operation="tree", path="D:\\Media", max_depth=2)
    await disk_usage(operation="drive_overview", paths=["C:\\", "D:\\", "E:\\"])
    """
    try:
        if operation in ("scan",):
            if not path:
                return _error_response("path is required for scan operation", "validation")
            return await run_dua(path, max_depth)

        if operation == "tree":
            if not path:
                return _error_response("path is required for tree operation", "validation")
            return await run_dua_tree(path, max_depth)

        if operation == "drive_overview":
            if not paths:
                return _error_response("paths is required for drive_overview operation", "validation")
            results = []
            for p in paths:
                r = await run_dua(p, 1)
                results.append({"path": p, **r})
            return {"success": True, "drives": results}

        return _error_response(f"Unknown operation: {operation}", "validation")
    except Exception as e:
        return _error_response(str(e), "runtime")
