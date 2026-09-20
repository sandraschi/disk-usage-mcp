import logging
import os

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "11114"))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "11115"))
MCP_PORT = int(os.getenv("MCP_PORT", "11114"))
MCP_HOST = os.getenv("MCP_HOST", "127.0.0.1")
DATA_DIR = os.getenv("DISK_USAGE_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data"))
SNAPSHOTS_DIR = os.path.join(DATA_DIR, "snapshots")
DUA_BIN = os.getenv("DUA_BIN", "dua")
# Canonical cargo name first; runner also tries windows_czkawka_cli (winget
# package qarmin.czkawka.cli). Override with CZKAWKA_BIN for custom installs.
CZKAWKA_BIN = os.getenv("CZKAWKA_BIN", "czkawka_cli")

os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("disk-usage-mcp")
