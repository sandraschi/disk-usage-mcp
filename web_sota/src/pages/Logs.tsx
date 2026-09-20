import { useEffect, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { getLogs, type LogEntry } from "../lib/api";

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLogs(level, query, 300);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return (
    <div data-testid="logs-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-amber-500" /> Logs
        <span className="text-sm font-normal text-zinc-400">({total} buffered server-side)</span>
      </h2>

      <div className="flex gap-2" data-testid="logs-controls">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100"
          aria-label="Log level filter"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l || "All levels"}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void refresh()}
          placeholder="Filter logs... (Enter to apply)"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
        />
        <button onClick={() => void refresh()} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200">
          Apply
        </button>
      </div>

      {loading && (
        <div className="flex items-center py-12 text-zinc-300" data-testid="logs-loading">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading logs...
        </div>
      )}
      {error && (
        <div className="text-center py-12" data-testid="logs-error">
          <p className="text-red-400 mb-2">{error}</p>
          <button onClick={() => void refresh()} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm">Retry</button>
        </div>
      )}
      {!loading && !error && logs.length === 0 && (
        <p className="text-center py-12 text-zinc-400" data-testid="logs-empty">No log entries match the current filter.</p>
      )}
      {!loading && !error && logs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-sm space-y-0.5" data-testid="logs-list">
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-500 flex-shrink-0">{l.ts}</span>
              <span className={`flex-shrink-0 w-16 ${l.level === "ERROR" || l.level === "CRITICAL" ? "text-red-400" : l.level === "WARNING" ? "text-amber-400" : "text-zinc-400"}`}>
                {l.level}
              </span>
              <span className="text-zinc-200 break-all">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
