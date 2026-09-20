import { useEffect, useState } from "react";
import { Download, FileText, Search, X } from "lucide-react";
import { getLogs, type LogEntry } from "../lib/api";

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

export function LoggerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (open) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, level]);

  if (!open) return null;

  const levelColor = (lv: string) =>
    lv === "ERROR" || lv === "CRITICAL"
      ? "text-red-400"
      : lv === "WARNING"
        ? "text-amber-400"
        : "text-zinc-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-testid="logger-modal">
      <div className="w-[720px] max-w-[95vw] max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" /> Server Logs
            <span className="text-sm font-normal text-zinc-400">({total} buffered)</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400" aria-label="Close logs">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 p-3 border-b border-zinc-800">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100"
            aria-label="Log level filter"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l || "All levels"}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void refresh()}
              placeholder="Filter logs..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            onClick={() => {
              const blob = new Blob([logs.map((l) => `${l.ts} [${l.level}] ${l.logger}: ${l.message}`).join("\n")], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "disk-usage-logs.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 font-mono text-sm space-y-0.5">
          {loading && <p className="text-zinc-400">Loading...</p>}
          {error && <p className="text-red-400">{error} <button onClick={() => void refresh()} className="underline">Retry</button></p>}
          {!loading && !error && logs.length === 0 && <p className="text-zinc-400">No log entries match.</p>}
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-zinc-500 flex-shrink-0">{l.ts}</span>
              <span className={`${levelColor(l.level)} flex-shrink-0 w-16`}>{l.level}</span>
              <span className="text-zinc-200 break-all">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
