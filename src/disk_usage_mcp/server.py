import sys
import os

from fastmcp import FastMCP

from disk_usage_mcp.config import logger
from disk_usage_mcp.tools.disk_usage import disk_usage
from disk_usage_mcp.tools.duplicates import find_duplicates
from disk_usage_mcp.tools.large_files import find_large_files

mcp = FastMCP(
    "disk-usage-mcp",
    version="0.1.0",
    description="Disk usage analysis, duplicate detection, and drive visualization",
)

mcp.tool(name="disk_usage", annotations={"readonly": True})(disk_usage)
mcp.tool(name="find_duplicates", annotations={"readonly": True})(find_duplicates)
mcp.tool(name="find_large_files", annotations={"readonly": True})(find_large_files)


@mcp.prompt()
def disk_usage_help(topic: str = "") -> str:
    """Get help on disk-usage-mcp tools and workflows.

    Topics: scan, duplicates, overview, large-files, best-practices
    """
    help_texts = {
        "": """# disk-usage-mcp Help

Tools:
- disk_usage — Portmanteau: scan (JSON tree), tree, drive_overview
- find_large_files — Find files above size threshold
- find_duplicates — Find duplicates with czkawka_cli

Best practices:
- Start with disk_usage(operation="drive_overview", paths=[...])
- Drill with disk_usage(operation="scan", path=..., max_depth=2)
- Use find_large_files for quick space recovery
- Run find_duplicates last (slowest)
""",
        "scan": "disk_usage(operation=\"scan\", path=\"D:\\Media\", max_depth=3)",
        "tree": "disk_usage(operation=\"tree\", path=\"D:\\\", max_depth=2)",
        "duplicates": 'find_duplicates(search_paths=["D:\\", "E:\\"], min_size_mb=100)',
        "overview": 'disk_usage(operation="drive_overview", paths=["C:\\", "D:\\", "E:\\"])',
        "large-files": 'find_large_files(path="D:\\Media", min_size_gb=5.0)',
        "best-practices": "1) Overview first 2) Drill with scan 3) Large files 4) Duplicates last",
    }
    return help_texts.get(topic, help_texts[""])


def main():
    port = os.environ.get("MCP_PORT") or os.environ.get("PORT")
    if port:
        host = os.environ.get("MCP_HOST", "127.0.0.1")
        sys.argv = ["disk-usage-mcp", "--mode", "http", "--host", host, "--port", str(port)]
    mcp.run()


if __name__ == "__main__":
    main()
