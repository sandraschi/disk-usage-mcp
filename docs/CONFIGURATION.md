# Configuration — disk-usage-mcp

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| BACKEND_PORT | 11114 | REST API port |
| FRONTEND_PORT | 11115 | Vite dev port |
| MCP_PORT | 11114 | MCP HTTP port (set → HTTP transport, unset → stdio) |
| MCP_HOST | 127.0.0.1 | HTTP bind host |
| DUA_BIN | dua | Path to dua binary (resolved via PATH) |
| CZKAWKA_BIN | czkawka_cli | Path to czkawka binary (resolved via PATH) |
| OLLAMA_BASE | http://127.0.0.1:11434 | Ollama endpoint for Chat |
| LMSTUDIO_BASE | http://127.0.0.1:1234 | LM Studio endpoint for Chat |
| DISK_USAGE_TAURI | (unset) | Set to 1 inside the Tauri sidecar |

No secrets, no API keys, no accounts. Chat uses local providers only.

## Ports

Backend 11114, frontend 11115 — registered in `mcp-central-docs/operations/WEBAPP_PORTS.md`
and `fleet-start.config.ps1` (HealthPath `/health`). Never hardcode other ports.

## Snapshots

Stored as JSON in `data/snapshots/` (override via `DISK_USAGE_DATA_DIR`).
Take via POST `/api/snapshot/take` or the Inbox page; compare with
GET `/api/snapshot/diff?from=a.json&to=b.json`; delete with
DELETE `/api/snapshot/{file}`. `data/` is gitignored.

## Skills

Bundled skill lives in `skills/disk-usage/SKILL.md`. Served three ways:
MCP resource `skill://disk-usage`, REST `GET /api/skills[/{name}]`,
and the Skills page. The Chat page loads it as its system preprompt.

## Fleet

`GET /api/fleet/apps` parses `WEBAPP_PORTS.md` on the host for the Apps Hub
page; `?probe=true` live-checks each port's health endpoint (fast timeouts,
concurrency-capped). Missing registry → `{"apps": [], "source": "registry-missing"}`.
