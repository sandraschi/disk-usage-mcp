"""Generic fleet crossconnect base: thin, honest proxies to sibling MCP servers.

Read patterns/CROSSCONNECT_PATTERN.md before adding a new peer integration.
This file exists because three near-duplicate speech-integration snippets
accumulated in this fleet independently (templates/chat-page/speech.ts,
templates/speech/, and an early version of templates/speech-crossconnect/)
before anyone factored out what they had in common. Don't repeat that:
vendor THIS file once per repo, then write a short per-peer module (see
patterns/templates/speech-crossconnect/speech_crossconnect.py for the
reference adapter) instead of copy-pasting a whole new proxy from scratch.

HOW TO VENDOR: copy this file into <your_repo>/src/<pkg>/services/
crossconnect_base.py (unchanged — it's peer-agnostic), then write one small
adapter module per sibling service that constructs a CrossconnectPeer and
adds the 2-4 functions specific to that peer's API.

CONTRACT (the reason this file exists — keep these when you add a peer)
-------------------------------------------------------------------------
- One CrossconnectPeer per sibling service. base_url comes from an env var
  with a sane localhost default (see speech_crossconnect.py's SPEECH_MCP_URL
  for the pattern) — never hardcode a port with no override.
- Every JSON-returning call goes through get_json()/post_json(), which give
  you: a consistent {success, message, data} dialogic shape (matches
  standards/DIALOGIC_RETURNS.md), an actionable "not reachable" message
  naming the peer + base_url + the real transport error, and a caller-chosen
  timeout. Default 15s is a guess, not a rule — MEASURE the peer's real
  latency for the specific call you're adding before trusting a default.
  speech-crossconnect's 45s exists because Gemini TTS measured 14-22s for a
  short excerpt; a generic default would have silently misreported that as
  "unreachable" the same way it did on day one here.
- Binary/streaming responses (audio, images, files) do NOT go through
  get_json/post_json — use raw_get() and build your own framework Response
  with the right media_type. Forcing binary data through a JSON dict shape
  is the kind of thing that looks fine until someone tries it.
- Never hardcode data the peer can tell you live (voice lists, library
  contents, model names, provider status...) — always call the peer for it.
  Providers and their content change independently of your repo.
- If a peer's own filter/query param turns out to be broken, verify it FIRST
  (a nonsense query returning the same results as a real one is the tell —
  see speech-crossconnect's README for two real examples found this way),
  then filter client-side here rather than silently propagating the bug —
  and flag it upstream via a background task, don't patch the peer's repo
  yourself unless asked.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx


def _clean_params(params: dict[str, Any] | None) -> dict[str, Any]:
    """Drop None/empty-string values so callers can pass optional filters
    unconditionally without building the dict conditionally themselves."""
    if not params:
        return {}
    return {k: v for k, v in params.items() if v not in (None, "")}


@dataclass
class CrossconnectPeer:
    """One sibling MCP server. `name` is used only in error messages, never
    parsed — it should be the repo name (e.g. "speech-mcp") so a failure
    message is immediately actionable.
    """

    name: str
    base_url: str

    def __post_init__(self) -> None:
        self.base_url = self.base_url.rstrip("/")

    def _unreachable(self, detail: str) -> dict[str, Any]:
        return {
            "success": False,
            "message": f"{self.name} not reachable at {self.base_url} ({detail})."
            " Start it, or point its *_MCP_URL env var at wherever it runs.",
            "data": None,
        }

    def get_json(self, path: str, params: dict[str, Any] | None = None, *, timeout: float = 15.0) -> dict[str, Any]:
        """GET {base_url}{path}?{params} -> dialogic {success, message, data}."""
        url = f"{self.base_url}{path}"
        qs = _clean_params(params)
        if qs:
            url += f"?{urlencode(qs)}"
        try:
            resp = httpx.get(url, timeout=timeout)
            resp.raise_for_status()
            return {"success": True, "message": f"OK from {self.name}.", "data": resp.json()}
        except httpx.HTTPError as exc:
            return self._unreachable(str(exc))

    def post_json(self, path: str, body: dict[str, Any] | None = None, *, timeout: float = 15.0) -> dict[str, Any]:
        """POST {base_url}{path} with a JSON body -> dialogic {success, message, data}."""
        try:
            resp = httpx.post(f"{self.base_url}{path}", json=body or {}, timeout=timeout)
            resp.raise_for_status()
            return {"success": True, "message": f"OK from {self.name}.", "data": resp.json()}
        except httpx.HTTPError as exc:
            return self._unreachable(str(exc))

    def raw_get(self, path: str, params: dict[str, Any] | None = None, *, timeout: float = 45.0) -> httpx.Response:
        """GET raw bytes (audio, images, files). Caller builds their own framework
        Response with the right media_type — this returns the httpx.Response, not
        a dialogic dict, because binary payloads don't fit that shape. Raises
        httpx.HTTPError on failure; catch it at your route boundary (see
        speech_routes.py's api_speech_speak_wav for the pattern: a clear 502
        with the transport error in the detail, not a bare 500).
        """
        url = f"{self.base_url}{path}"
        qs = _clean_params(params)
        if qs:
            url += f"?{urlencode(qs)}"
        resp = httpx.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp
