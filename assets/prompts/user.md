# Disk Usage MCP — User Guide (operating manual for the human and the agent)

## 1. What this server does for you

Disk Usage MCP answers one question extremely well — "where did my disk space go?" — across
every Windows drive you point it at, and it helps you act on the answer safely. It does this
with four capabilities that compose into complete cleanup workflows. First, drive scanning via
dua-cli: structured JSON hierarchies of any path at any depth, from a one-second depth-1
overview to a full depth-10 crawl, so you always see the shape of usage before you touch
anything. Second, large-file detection: individual files above a threshold you set, biggest
first, capped so huge trees stay responsive. Third, duplicate detection via czkawka_cli:
content-hash grouping across directories and drives, so renamed copies, migrated trees, and
triple-kept installers show up even when paths differ completely. Fourth, snapshots: labeled,
timestamped captures of drive state that you can diff later, turning "I thought I freed 200
GB" into a verifiable receipt. A fifth capability, DJ database parsing, maps VirtualDJ and
Serato libraries into track metadata (plays, BPM, paths) so music collections can be managed
by listening habits instead of raw bytes.

Everything the server does is read-only analysis. It cannot delete, move, rename, or modify
your files. That is deliberate: the server prepares decisions, you make them. Any reclamation
plan it produces must be confirmed by you before action, item by item for anything
irreversible.

## 2. The tools, and exactly when to reach for each

Use `get_drive_overview` first in every session about space. Give it all your roots —
`["C:\\", "D:\\", "E:\\", "F:\\"]` — and read the ranking. It costs seconds and tells you
where to spend the next ten minutes. Drives that fail to scan show `size_bytes: 0` with an
error string: treat those as blind spots to investigate (disconnected USB? permissions?),
never as empty drives.

Use `scan_path` to explore. Depth 1 shows top-level consumers of one path; depth 2–3 is the
working range for understanding a drive; depth 5+ is for hunting something specific deep in
a tree. Rule of thumb: start shallow, drill into the largest child, repeat. Each call is
fast enough to be conversational until you pass depth 5 on terabyte trees — at that point
say so and let it run rather than stacking more calls.

Use `find_large_files` when the drive is full and you need wins now. Start at 10 GB on a
full drive: a handful of results, each one meaningful. Drop to 1–5 GB for thorough passes.
Only go to 0.1 GB on small directories. Keep `limit` modest (20–50) on first passes; the
walk exits early at the limit, which keeps huge trees interactive.

Use `find_duplicates` last, not first. It hashes file contents, which is the slowest thing
here by far — minutes to hours on multi-terabyte spinners. Narrow it: compare two specific
trees (`D:\Media` vs `E:\Backup1`) instead of whole drives; set 500+ MB minimums on first
passes over backup media; always warn about runtime before launching. Reclaimable space per
group is about `size × (copies − 1)`. Present groups with all paths listed, because the
decision is always "which copy stays", and that needs the full picture.

Use `disk_usage` (the portmanteau) when you think in operations: `scan` for JSON trees,
`tree` for a human-readable terminal-style listing, `drive_overview` for the multi-root
summary. It behaves identically to the individual tools.

Use `parse_dj_database` with no arguments to auto-detect your DJ software database, or pass
an explicit path. Then slice the track list four ways: most-played (the untouchable core),
zero-play files over 100 MB (transcode-or-archive candidates), missing files (database rot —
entries pointing at paths that no longer exist), and format histogram (how much of the
library is lossless vs MP3, which sizes any conversion project).

Use `server_help` whenever you are unsure what this server version supports — it returns the
tool list plus the live REST route table. Prefer it over guessing endpoint names.

Use `show_drives_card` and `show_duplicates_card` when your chat client renders Prefab rich
cards; they return the same data with a visual card attached. Use the data tools when you
need numbers to compute over.

## 3. Standard workflows, step by step

### 3.1 "My D: drive is full" (the 15-minute rescue)

Call `get_drive_overview` with all drives to confirm D: is actually the problem and to see
global headroom (maybe the fix is moving, not deleting). Then `scan_path("D:\\", 1)` and read
the top three consumers. Drill into the largest with `scan_path` at depth 2. In parallel with
your reading, consider `find_large_files("D:\\", 10.0, 20)` for immediate candidates. Present
an ordered list: path, size, what it appears to be, confidence, and whether deletion is
reversible (cache: yes; personal media: no). Take a snapshot labeled `pre-cleanup` before
anything is removed, so the after-state is provable.

### 3.2 "Are my backups redundant?" (the drift audit)

List what you believe the backup topology is, then verify it with content hashes, not paths.
Run `find_duplicates` pairwise: primary vs backup1, primary vs backup2, backup1 vs backup2,
at 500 MB minimum. Expect three outcomes: true mirrors (same content, possibly different
folder names — healthy), triple-kept archives (installers, ISOs, exports saved in several
places — usually waste), and orphans (files on backups with no primary counterpart —
investigate before touching). Recommend a canonical tree plus checksum-verified copies, and
a rotation policy for anything snapshot-like that accumulates.

### 3.3 "What grew this month?" (growth tracking)

Snapshots are the mechanism. Take one now with a clear label. The Inbox page exists for this
loop: take, list, compare, delete old ones. When two snapshots exist, diff them — per-path
deltas sorted by growth, total change in bytes and GB. A surprise grower is usually a cache,
a log, a re-downloaded dataset, or a moved tree (which looks like growth on one path and
shrinkage on another — read the pair together). For mysteriously growing drives, take
snapshots weekly until the culprit shows itself.

### 3.4 "Clean my music library" (DJ workflow)

Parse the database, then join listening truth with filesystem truth. Protect the top-played
core unconditionally. Convert or archive zero-play lossless bulk. Clean database rot (missing
paths) so the software stops showing ghosts. Size any transcode project from the format
histogram first (hours of CPU per hundred GB is normal — say so). Verify a sample of paths
still exists on disk with a targeted scan before recommending moves.

### 3.5 "Plan it, I'll execute" (agent handoff)

Ask the server for the `reclaim-plan` prompt with your drives, or just request a plan in
words. A good plan states scope, ordered actions with sizes, verification steps (snapshot
before/after, diff as receipt), and explicit confirmation gates before each destructive
step. The agent must never skip the gates.

## 4. Parameter cookbook (copy-paste values that work)

Drive overview, everything: `get_drive_overview(paths=["C:\\", "D:\\", "E:\\", "F:\\"])`.
Quick single-drive check: `scan_path("D:\\", 1)`. Normal exploration: `scan_path("D:\\Media", 3)`.
Quick wins on a full drive: `find_large_files("D:\\", 10.0, 20)`. Thorough pass on a folder:
`find_large_files("D:\\Media", 1.0, 50)`. First duplicate pass on backups:
`find_duplicates(["D:\\", "E:\\"], 500)`. Deep duplicate hunt on one tree:
`find_duplicates(["D:\\Media"], 100)`. Portmanteau equivalents:
`disk_usage("scan", path="D:\\", max_depth=2)`, `disk_usage("tree", path="D:\\Media")`,
`disk_usage("drive_overview", paths=["C:\\", "D:\\"])`. Prefab variants for chat cards:
`show_drives_card()`, `show_duplicates_card(["D:\\", "E:\\"], 100)`.

## 5. The dashboard, page by page

Dashboard is mission control: hero with backend status and version, KPIs, the onboarding cue
(big red setup banner while scanner binaries are missing), and the latest snapshot. Red MOCK
badges on KPIs mean the backend is showing sample values because prerequisites are missing —
never quote those numbers. Drives is the scanner: path + depth + Scan button, treemap with
click/keyboard drill-down, snapshot button, breadcrumb history, JPEG export, fullscreen.
Duplicates is the czkawka frontend: comma-separated paths, minimum size, progress state,
group cards with per-file paths and reclaimable totals. Inbox is snapshot operations:
take with label, compare any two (per-path deltas), delete. Tools lists every capability
with a quick-run box against a target path and raw JSON output. Skills shows the bundled
operating procedure the Chat page reasons from. Chat is skill-first local chat: five
personalities (Default, Reclaimer, Explorer, DJ Librarian, Custom), six example prompts,
streaming responses, 100-message local history, export and clear — all proxied through the
backend so nothing, not even a key, leaves the machine (there are no keys: local providers
only). Logs mirrors the server ring buffer with level and text filters plus export. Apps is
the fleet hub: every registered sibling app with live probing. Settings holds the local LLM
provider cards (Ollama/LM Studio auto-detect, model picker, GPU opportunity note), common
scan paths, tool credits, and ports. Help has onboarding with live binary checklist,
the live endpoint list, shortcuts, and troubleshooting.

## 6. Keyboard, zoom, and session habits

Ctrl+K focuses page search in the topbar (type a page name, Enter jumps). Ctrl+L toggles
the server log modal from anywhere. Ctrl+H toggles help. Ctrl+Scroll zooms the whole UI
through nine levels, Ctrl+0 resets, and the zoom percentage sits in the topbar — it persists
across restarts. The backend dot pulses gray (connecting), green (connected), or red
(offline, with exponential-backoff retries behind it). In Tauri builds the shell also
listens for backend-status events with HTTP polling as fallback.

## 7. Errors and what to do about each

"Binary not found on PATH" → install via winget (exact commands in Setup/Help), restart the
backend. "Access denied" on a path → run elevated or exclude system folders; say which.
"Snapshot not found" → it was deleted or never taken; list snapshots to re-pick. Diff with
an error → one side failed validation (bad filename) or is unreadable JSON. "No LLM" in
Chat → start Ollama or load an LM Studio model; the providers endpoint shows live state.
Timeout on huge trees → narrow scope (higher threshold, fewer paths, shallower depth) and
retry. Anything else → Logs page filtered to ERROR, then the TROUBLESHOOTING doc.

## 8. Fleet and automation notes

The MCP surface (tools, two prompts, drive + skill resources, two Prefab cards) is for
agents; the REST surface mirrors it for dashboards and scripts. `POST /api/shutdown` exists
so launchers can bounce the service cleanly after snapshots flush. Snapshot JSON files are
stable enough to consume from your own scripts (timestamp, label, paths, per-drive data).
Keep `TOOL_DEFS`, manifest, and this manual in sync when adding tools — the Skills page,
Help endpoint list, and `server_help` all read the live backend, so they stay truthful
automatically. Report files and `.bak` files never belong in commits; the `.assess-fix-timestamp`
file is the audit trail.

## 9. REST cookbook (PowerShell)

Health and contract: `Invoke-RestMethod http://127.0.0.1:11114/health`,
`/api/status`, `/api/capabilities` (the live endpoint map — consult it before scripting
anything). Scan: `Invoke-RestMethod -Method Post http://127.0.0.1:11114/api/scan -Body
(@{path='D:\'; max_depth=2} | ConvertTo-Json) -ContentType 'application/json'`.
Duplicates: same pattern against `/api/duplicates` with `@{paths=@('D:\','E:\');
min_size_mb=500}`. Large files: `/api/large-files` with `@{path='D:\'; min_size_gb=10.0;
limit=20}`. Snapshots: POST `/api/snapshot/take` with `@{paths=@('D:\'); label='manual'}`;
GET `/api/snapshots`; GET `/api/snapshot/{file}`; diff with
`/api/snapshot/diff?from=a.json&to=b.json`; DELETE `/api/snapshot/{file}`. Logs:
`/api/logs?level=ERROR&limit=100`. Setup: `/api/setup/status`. Skills:
`/api/skills` and `/api/skills/disk-usage`. Fleet: `/api/fleet/apps?probe=true`. Chat:
POST `/api/llm/chat` with `@{provider='ollama'; model=''; messages=@(@{role='user';
content='...'})}`; streaming variant at `/api/llm/chat/stream` speaks SSE (`data:
{"delta": ...}` frames, `data: [DONE]` terminator). Shutdown (orderly, 500 ms delayed
exit for launchers): POST `/api/shutdown`. Interactive Swagger at `/docs`.

## 10. Scheduled snapshots with Task Scheduler

For unattended growth tracking, create a scheduled task that POSTs a snapshot body on your
cadence. Weekly is the sweet spot for growing media drives; daily for anything under
active investigation. The action runs `powershell.exe` with arguments that POST
`{"paths": ["D:\\", "E:\\"], "label": "scheduled"}` to
`http://127.0.0.1:11114/api/snapshot/take` — keep the backend running (or start it in the
same schedule five minutes earlier). Run as a principal that can read the target trees;
log output to a file so silent failures show up. Name tasks `disk-usage-snapshot-weekly`
so they are recognizable. Review monthly: open Inbox, diff oldest vs newest, delete the
middle ones. Automation never deletes snapshots by itself — retention stays human.

## 11. Local LLM setup for Chat (no accounts, no keys, no cloud)

Chat works with two local providers and nothing else — a deliberate choice, so there is no
key to leak and no usage bill. Ollama: `winget install Ollama.Ollama`, `ollama serve`,
`ollama pull llama3.1` (8B fits most GPUs and runs on CPU in a pinch; 70B needs serious
VRAM — start small). LM Studio: install, download any chat model, load it (server mode on
port 1234). The backend auto-detects both on the Chat and Settings pages: green means
reachable with N models, gray means start something. GPU note: if `nvidia-smi` reports a
card but no provider is running, Settings shows the opportunity prompt — installing Ollama
is usually the one step that unlocks it. Model picker persists per provider in the browser.
If answers are slow, prefer smaller models and shorter histories; the 100-message cap keeps
context bounded. If the provider changes (new model pulled), hit Re-probe. Nothing typed
into Chat leaves the machine: the browser talks only to this backend, and the backend talks
only to localhost providers.

## 12. Desktop (Tauri) notes

The `native/` shell wraps the same backend (PyInstaller sidecar) and the built dashboard.
The shell clears the backend port before binding, polls TCP health (not fixed sleeps),
watches sidecar output for readiness, and the frontend listens for `backend-status` events
with HTTP polling underneath. If the window shows Offline while the browser build works,
check the sidecar log path in the Tauri resources and confirm only one backend owns :11114
(`Get-NetTCPConnection -LocalPort 11114`). Zoom, shortcuts, and localStorage behave
identically in the shell and the browser.

## 13. Extended troubleshooting

Snapshot list empty right after taking one: the take call failed (check its `success` and
`error` — usually an unscannable path) or you are looking at a different `data/` dir
(`DISK_USAGE_DATA_DIR` override). Diff shows zero everywhere: both snapshots scanned
nothing (binaries missing at take time produce empty drive data — fix binaries, retake).
Treemap renders but numbers disagree with Explorer: junctions/reparse points, permission-
skipped subtrees, or recycle-bin accounting — drill to the disagreeing subtree and compare
at depth 1. czkawka finds nothing at 100 MB but the drives look mirrored: the copies differ
(rewrapped media, different encodings) — drop to content sampling by eye on a few files
before concluding. Chat streams gibberish or stops: the local model is unloaded or
under-RAM — check provider status, pick a smaller model, retry non-streaming (the page
falls back automatically once). Port already in use on start: a zombie backend survived —
`start.ps1` kills port holders before binding; in Tauri the Rust sidecar does the same.
MCP client gets session errors on `/mcp`: you are hitting a stale bundle — rebuild via
`just mcpb-pack` (wipe+recopy is built into the recipe) and confirm the mount logs show
`path="/"` semantics. Tests fail on `tool_count`: a tool was added without updating
`TOOL_DEFS` — the single source of truth — plus manifest, skills docs, and these prompts.

## 14. Glossary

Depth: dua recursion levels (1 = top entries only). Threshold: minimum size that counts
(GB for large files, MB for duplicates). Group: files sharing one content hash. Reclaimable:
`size × (copies − 1)` per group, summed. Snapshot: labeled depth-1 capture of drive roots.
Diff: per-path before/after deltas between two snapshots. MOCK badge: dashboard marker for
sample KPIs shown while scanner binaries are missing — never real numbers. Blind spot: a
drive that failed to scan (error recorded, size reported as zero). Receipt: a post-cleanup
snapshot diff proving what changed.

## 15. Complete endpoint reference

Liveness and contract: `GET /health` (launcher probe: status, server, version, tool_count),
`GET /api/health` (adds snapshots_dir), `GET /api/status` (adds uptime_seconds, snapshots),
`GET /api/capabilities` (tools, features, full endpoint list), `GET /api/v1/diagnostics`
(smoke-test shape: tools, system, errors, snapshot count), `GET /docs` (Swagger UI).
Skills: `GET /api/skills` (index with skill:// URIs), `GET /api/skills/{name}` (markdown
content, traversal-guarded). Observability: `GET /api/logs?level=&q=&limit=` (500-entry
ring, newest last). Setup: `GET /api/setup/status` (dua/czkawka presence with install
commands). Fleet: `GET /api/fleet/apps?probe=` (registry apps, optional live check).
Analysis: `POST /api/scan` (`path`, `max_depth` 1–10), `POST /api/duplicates` (`paths`,
`min_size_mb`), `POST /api/large-files` (`path`, `min_size_gb`, `limit` 1–500). Snapshots:
`POST /api/snapshot/take` (`paths`, `label`), `GET /api/snapshots`, `GET
/api/snapshot/{file}`, `GET /api/snapshot/diff?from=&to=`, `DELETE
/api/snapshot/{file}`. Local LLM: `GET /api/llm/discover`, `GET /api/llm/providers`, `GET
/api/llm/models?provider=`, `POST /api/llm/chat` (`provider`, `model`, `messages`,
`system`), `POST /api/llm/chat/stream` (SSE). Control: `POST /api/shutdown` (200 now,
process exit 500 ms later). Protocol: `/mcp` (MCP streamable HTTP for agents).

## 16. MCP client setup (Claude Desktop)

Add the server to your MCP client config with stdio transport (no keys needed):

```json
{
  "mcpServers": {
    "diskops": {
      "command": "uv",
      "args": ["run", "--directory", "D:\\Dev\\repos\\disk-usage-mcp", "python", "-m", "disk_usage_mcp.server"],
      "env": { "PYTHONPATH": "D:\\Dev\\repos\\disk-usage-mcp\\src" }
    }
  }
}
```

For HTTP transport instead, start the backend with `MCP_PORT=11114` and point the client
at `http://127.0.0.1:11114/mcp`. The `glama.json` in the repo carries the same shape for
compatible hosts. Verify with `server_help()` (lists tools + live routes) or the
`reclaim-plan` prompt. The distributable bundle (`just mcpb-pack`, then install the
`.mcpb`) ships the same server with the wipe+recopy guarantee — what you tested locally is
what gets packed.

## 17. Maintenance calendar

Daily (if investigating): glance at the Dashboard KPIs and the Logs page filtered to
ERROR. Weekly (growing drives): take a labeled snapshot; diff against last week; act on
surprises over 5 GB. Monthly: full duplicate pass at 500 MB across primary vs backups;
review the Apps hub for fleet updates; pull a fresh snapshot anchor and delete the
in-between ones. Quarterly: format-histogram your music library and re-check zero-play
bulk; verify backup restores still read (hashes match, not just sizes); rotate snapshot
labels for the new quarter. Yearly: re-read this manual's parameter cookbook — thresholds
that made sense at 60 percent full are wrong at 90 percent. After every cleanup: snapshot,
diff, file the receipt (keep the pair), update the plan with what actually reclaimed.

## 18. FAQ (twenty quick answers)

Does it delete files? Never — analysis only, you decide. Which scan first? Drive overview,
always. What depth? 1 to rank, 2–3 to explore, 5+ to hunt, 10 rarely. Why is czkawka slow?
It hashes contents; budget hours per terabyte and narrow first. Empty result — broken?
Check `success`/`error` first, then binary presence, then scope. Numbers differ from
Explorer? Junctions, permissions, recycle bin — drill to compare. Duplicates with empty
hash? Verify manually before acting. Snapshot diff all zeros? Empty scans in, or nothing
changed — check take-time errors. MOCK badges? Binaries missing — install, restart, they
clear. Chat offline? Start Ollama/LM Studio — local only, no keys. Slow chat answers?
Smaller model, shorter history, GPU. Treemap path looks odd? Reconstructed from the tree —
verify exact paths for destructive plans. Can it watch continuously? No daemon mode —
scheduled snapshots via Task Scheduler instead. Multi-machine? Per-machine install; copy
snapshot JSONs to compare across hosts. Serato tables unknown? The parser lists what it
found — tell it which table holds tracks. VirtualDJ parse fails? Likely a crashed write —
restore Database.xml from backup. API for scripts? Yes — the cookbook bodies are stable
and additive. Fleet Apps empty? Registry file missing off-host — expected elsewhere.
Shutdown endpoint dangerous? Localhost-bound only, for launchers. Where do reports go?
`reports/` is gitignored by design; the timestamp file is the committed trail.

## 19. Three annotated sessions (start to receipt)

Session A — full 20 TB spinner, no idea where it went. Open with the five-drive overview:
D: 4.1 TB used of 4.5, clearly the problem, others healthy. Depth-1 scan of D: shows Video
2.2 TB, Backup-staging 900 GB, Games 600 GB. Drill Video at depth 2: one `finished/` folder
at 1.6 TB and a `to-sort/` folder at 500 GB. Large-file pass at 10 GB surfaces eleven files
— eight finished movies over 20 GB each in the wrong folder. Verdict: 400 GB of watched
content filed wrong plus 500 GB unsorted. Plan: move watched to archive drive, sort the
rest, snapshot before and after. Receipt diff: D: down 380 GB, archive up 380 GB. Time:
twelve minutes of analysis for a370-GB win.

Session B — backup drift between two 5 TB spinners. Pairwise duplicates at 500 MB: 1.9 TB
shared between E: and F:, but folder names differ (`Media-2024` vs `media_sorted`), so
Explorer-style comparison never caught it. Plus 300 GB of installer ISOs in three places
each. Decision: F: becomes the canonical backup (newer timestamps win), E: gets wiped and
re-seeded as a checksum-verified mirror, ISOs keep one copy on F: plus one offline.
Receipt: pre-wipe snapshot, post-seed snapshot, diff shows E: fully rewritten, total fleet
usage down 2.2 TB. The lesson the user keeps: names lie, hashes do not.

Session C — DJ library bloat on a laptop SSD. Parse finds 41,000 tracks, 900 GB. Slice by
plays: top 2,000 tracks (180 GB) are the working core. Zero-play lossless over 100 MB: 340
GB across 1,100 files — mostly full-album FLAC rips never opened. Missing paths: 900
entries pointing at an old external drive letter. Format histogram: 62 percent FLAC, 38
percent MP3. Plan: convert zero-play FLAC to high-bitrate MP3 for the laptop (saves ~250
GB), keep FLAC masters on the archive spinner, clean the 900 ghosts from the database,
re-verify paths with a targeted scan. Receipt: laptop down 260 GB, masters intact, database
ghost-free. Time: one evening, mostly unattended transcodes.

## 20. Moving trees safely, uninstalling, and getting help

Moving beats deleting when headroom exists elsewhere. The safe-move sequence: overview both
drives first (confirm destination headroom plus 10 percent margin), snapshot both, copy
(never cut) with verification — compare file counts and total bytes at depth 1 on source
and destination, spot-check a few large files by size — update anything that references the
old paths (DJ database entries, library folders, backup jobs), snapshot both again, diff to
confirm the growth landed where expected and nothing else moved, and only then delete the
source tree. For trees over 500 GB, move in top-folder batches with a snapshot between
each, so an interrupted move is resumable instead of a mystery. If a move is interrupted:
do not delete either side; run duplicates across source and destination at high minimums to
map what already copied, finish the remainder, then verify totals match before removing the
source. Uninstalling the server itself: stop the backend (`POST /api/shutdown` or close the
launcher), uninstall the Tauri app if present, optionally delete `data/snapshots/` (your
history) — scanner binaries (dua, czkawka, Ollama) are independent installs and stay unless
you remove them. Getting help: start with the Help page (live binary checklist, endpoint
list, shortcuts), then `docs/TROUBLESHOOTING.md`, then the Logs page filtered to ERROR with
a 50-line export attached to your question. When asking an agent for help, paste three
things: the overview output, the exact error text, and what you already tried — that triple
resolves nine cases out of ten without further back-and-forth.

## 21. Quick command cards (one line each)

Full drive? Overview all roots, then depth-1 the fullest, then large-files at 10 GB.
Slow drive? Depth-2 scan of the top three folders, then decide: move, transcode, or delete.
Mystery growth? Snapshot now, snapshot next week, diff — the delta names the culprit.
Backup audit? Pairwise duplicates at 500 MB: primary vs each backup, then backups vs each
other. Music bloat? Parse database, sort by plays, convert zero-play lossless, clean ghosts.
Before deleting? Snapshot labeled pre-cleanup, confirm item by item, diff after. After
moving? Verify counts and bytes both sides, update references, snapshot, then delete source.
New drive added? Overview including it, scan depth 1, snapshot as day-one baseline. Chat
confused? Re-probe providers, check the model picker, shorten history. Dashboard red?
Setup page names the missing binary — install, restart backend, badges clear. E2E red?
Install browsers once, rerun; the suite spins its own servers. Gate red? `just certify`
names the failing gate — fix code, not thresholds. Fleet app down? Apps hub probe shows
which ports answer; zombies get cleared by their own start scripts.

Keep this manual beside the dashboard, not inside your head: the workflows above cover
every session this server is built for, and the receipts they produce compound into a
library that stays lean because every gigabyte is accounted for, every quarter, on purpose.






