set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

# Start the full stack (backend + frontend)
serve:
    powershell.exe -NoProfile -File "{{justfile_directory()}}\start.ps1"

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

# Run tests
test:
    uv run pytest tests/ -v

# Build the PyInstaller backend .exe and copy to Tauri resources
build-sidecar:
    powershell.exe -NoProfile -File '{{justfile_directory()}}\native\build.ps1'

# Build the Tauri NSIS desktop installer (full pipeline)
build-native:
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    Set-Location '{{justfile_directory()}}\native'
    .\build.ps1

# Build Tauri native app (debug, skip PyInstaller)
build-native-debug:
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    Set-Location '{{justfile_directory()}}\native'
    npx @tauri-apps/cli build --debug

# Run CUA-NSIS smoke test (install -> launch -> verify -> uninstall)
cua-nsis-test:
    uv run python scripts/cua-smoke.py

# Build full pipeline (lint -> typecheck -> test -> build)
build: lint fmt-check test tsc webapp-build
    Write-Host "Build complete" -ForegroundColor Green

# Bootstrap: install dev deps + pre-commit hook
bootstrap:
    uv sync --group dev
    uv run pre-commit install
    Write-Host "Pre-commit hooks installed." -ForegroundColor Green