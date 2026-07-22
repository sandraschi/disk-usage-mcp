set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

# Start the full stack (backend + frontend)
serve:
    pwsh -NoProfile -File "{{justfile_directory()}}\start.ps1"

# Run backend only (stdio mode)
mcp-serve:
    uv run python -m disk_usage_mcp.server

# Run backend only (HTTP mode on port 11114)
mcp-http:
    $env:MCP_PORT="11114"; $env:MCP_HOST="127.0.0.1"; uv run python -m disk_usage_mcp.server

# Install Python dependencies
install:
    uv sync

# Lint Python
lint:
    uv run ruff check src/

# Format Python
fmt:
    uv run ruff format src/

# Check formatting
fmt-check:
    uv run ruff format --check src/

# TypeScript typecheck (web_sota)
tsc:
    Set-Location "{{justfile_directory()}}\web_sota"; bun run typecheck

# Install web_sota dependencies
webapp-install:
    Set-Location "{{justfile_directory()}}\web_sota"; bun install

# Run web_sota dev server
webapp-dev:
    Set-Location "{{justfile_directory()}}\web_sota"; bun run dev

# Build web_sota
webapp-build:
    Set-Location "{{justfile_directory()}}\web_sota"; bun run build

# MCPB pack (Claude Desktop bundle)
mcpb-pack:
    mcpb pack . dist/disk-usage-mcp-v0.1.0.mcpb

# Build full pipeline (lint -> typecheck -> build)
build: lint fmt-check tsc webapp-build
    Write-Host "Build complete" -ForegroundColor Green
