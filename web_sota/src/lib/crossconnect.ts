// Generic fleet crossconnect base for frontend clients. Read
// ../../CROSSCONNECT_PATTERN.md before adding a new peer integration.
//
// HOW TO VENDOR: copy into <your_webapp>/src/lib/crossconnect.ts (unchanged
// — it's peer-agnostic), then write a short per-peer client on top of
// crossconnectPeer() (see ../speech-crossconnect/speech.ts for the
// reference adapter) instead of writing a whole new fetch wrapper.
//
// This mirrors crossconnect_base.py's contract: always go through YOUR OWN
// backend proxy (never fetch a sibling MCP server directly from the
// browser — one CORS story, one place for graceful degradation), dialogic
// {success, message, data} shape for JSON, a separate binaryUrl() for
// audio/image/file responses that don't fit that shape.

export interface Dialogic<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * @param apiBase Your own backend's base URL (NOT the peer's — you're
 *   calling your own proxy routes, which call the peer server-side).
 * @param prefix The route prefix your backend registered for this peer,
 *   e.g. "/api/speech" or "/api/crossconnect".
 */
export function crossconnectPeer(apiBase: string, prefix: string) {
  return {
    get: async <T>(path: string, params?: Record<string, string>): Promise<Dialogic<T>> => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      const res = await fetch(`${apiBase}${prefix}${path}${qs}`);
      if (!res.ok) throw new Error(`${prefix}${path}: ${res.status}`);
      return res.json();
    },
    post: async <T>(path: string, body: unknown): Promise<Dialogic<T>> => {
      const res = await fetch(`${apiBase}${prefix}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${prefix}${path}: ${res.status}`);
      return res.json();
    },
    /** URL for an <audio>/<img> tag or a manual fetch().blob() — never a
     * dialogic JSON response, so it's a plain string builder, not a fetch. */
    binaryUrl: (path: string, params?: Record<string, string>): string => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return `${apiBase}${prefix}${path}${qs}`;
    },
  };
}
