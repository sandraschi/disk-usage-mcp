# Troubleshooting — disk-usage-mcp

## `bun` is not recognized (stale shell PATH)

Symptom: `bun run dev` (or any just recipe using bun) fails with
"not recognized", even though `C:\Users\<you>\.bun\bin\bun.exe` exists.
Cause: the terminal process started before bun's directory entered your PATH,
so its inherited environment is stale — common for long-lived IDE terminals
(Cursor/VS Code keep the env from app launch).

Fix (pick one):
1. Open a brand-new terminal tab/window (fresh processes inherit the current registry PATH).
2. Or refresh the live shell without restarting it:
   ```powershell
   $env:PATH = [Environment]::GetEnvironmentVariable("PATH","User") + ";" + [Environment]::GetEnvironmentVariable("PATH","Machine")
   ```
3. Or restart the IDE so it re-reads the environment.

Repo-side, the justfile prepends `%USERPROFILE%\.bun\bin` to PATH for every
recipe (`export PATH := ...`), and `scripts/pre-commit-biome.ps1` resolves bun
with a fallback — so `just tsc`, `just e2e`, `just certify` etc. work even from
stale shells. Direct `bun ...` invocations in your own terminal still need fix 1 or 2.

## Dashboard shows Offline

Backend not running. Run `.\start.ps1` (or `just mcp-http` for backend only).
The topbar retries with exponential backoff (1s → 16s). Check `GET /health`
returns 200; if not, a zombie may hold :11114 — `start.ps1` clears it.

## Scan fails: binary not found

Install the scanners and restart the backend so PATH picks them up:

```powershell
winget install Byron.dua-cli
winget install qarmin.czkawka
```

`GET /api/setup/status` reports exactly which binary is missing.

## Duplicates page stays empty / slow

czkawka takes minutes on multi-TB trees. Raise min size (500+ MB) to narrow,
or run overnight. The page shows a progress state while scanning.

## Chat says no LLM

Start Ollama (`ollama serve` + `ollama pull llama3.1`) or load a model in
LM Studio. `GET /api/llm/discover` shows what the backend sees. No accounts
or API keys exist in this product — local providers only.

## Logs

Open with Ctrl+L (Logger modal) or the Logs page; filter by level/text;
export to .txt. Server keeps the last 500 entries in memory (`GET /api/logs`).

## E2E failures

`bun run e2e` needs Playwright browsers once: `bun run e2e:install`.
The playwright webServer blocks reuse running dev servers locally but start
fresh ones in CI.

## Build failures

- `tsc` errors → `bun run typecheck` in web_sota.
- `biome check` errors → `bunx biome check --write src/` (safe fixes only).
- `pyright` errors → `uv run pyright src/`.
- CSS under ~5 kB after build → Tailwind plugin missing (see vite.config.ts).
