import { useEffect, useState } from "react";
import { Camera, GitCompare, Inbox as InboxIcon, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteSnapshot,
  diffSnapshots,
  listSnapshots,
  takeSnapshot,
  type SnapshotDiff,
  type SnapshotInfo,
} from "../lib/api";

function PageState({ kind, message, onRetry }: { kind: "loading" | "error" | "empty"; message: string; onRetry?: () => void }) {
  if (kind === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-300" data-testid="inbox-loading">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> {message}
      </div>
    );
  }
  if (kind === "error") {
    return (
      <div className="text-center py-12" data-testid="inbox-error">
        <p className="text-red-400 mb-2">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200">
            Retry
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-400" data-testid="inbox-empty">
      <InboxIcon className="h-12 w-12 mb-4" />
      <p>{message}</p>
    </div>
  );
}

export default function Inbox() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paths, setPaths] = useState("D:\\");
  const [label, setLabel] = useState("");
  const [taking, setTaking] = useState(false);
  const [diffFrom, setDiffFrom] = useState("");
  const [diffTo, setDiffTo] = useState("");
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSnapshots();
      setSnapshots(data.snapshots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleTake = async () => {
    setTaking(true);
    try {
      const pathList = paths.split(",").map((p) => p.trim()).filter(Boolean);
      await takeSnapshot(pathList, label);
      setLabel("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snapshot failed");
    } finally {
      setTaking(false);
    }
  };

  const handleDelete = async (file: string) => {
    const res = await deleteSnapshot(file);
    if (res.success) await refresh();
    else setError(res.error || "Delete failed");
  };

  const handleDiff = async () => {
    if (!diffFrom || !diffTo) return;
    setDiffLoading(true);
    try {
      setDiff(await diffSnapshots(diffFrom, diffTo));
    } catch (e) {
      setDiff({ success: false, error: e instanceof Error ? e.message : "Diff failed" });
    } finally {
      setDiffLoading(false);
    }
  };

  return (
    <div data-testid="inbox-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Snapshots</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3" data-testid="snapshot-take">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Camera className="h-4 w-4 text-amber-500" /> Take snapshot
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={paths}
            onChange={(e) => setPaths(e.target.value)}
            placeholder="D:\,E:\"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <button
            onClick={() => void handleTake()}
            disabled={taking}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium"
          >
            {taking ? "Taking..." : "Take snapshot"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3" data-testid="snapshot-diff">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-amber-500" /> Compare snapshots
        </h3>
        <div className="flex flex-wrap gap-2">
          <select value={diffFrom} onChange={(e) => setDiffFrom(e.target.value)} className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100" aria-label="Older snapshot">
            <option value="">Older snapshot...</option>
            {snapshots.map((s) => (
              <option key={s.file} value={s.file}>{s.label || s.file} ({s.timestamp})</option>
            ))}
          </select>
          <select value={diffTo} onChange={(e) => setDiffTo(e.target.value)} className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100" aria-label="Newer snapshot">
            <option value="">Newer snapshot...</option>
            {snapshots.map((s) => (
              <option key={s.file} value={s.file}>{s.label || s.file} ({s.timestamp})</option>
            ))}
          </select>
          <button
            onClick={() => void handleDiff()}
            disabled={diffLoading || !diffFrom || !diffTo}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium"
          >
            {diffLoading ? "Diffing..." : "Compare"}
          </button>
        </div>
        {diff && !diff.success && <p className="text-sm text-red-400">{diff.error}</p>}
        {diff?.success && (
          <div className="text-sm">
            <p className="text-zinc-300 mb-2">
              Total change:{" "}
              <span className={diff.total_delta_bytes! >= 0 ? "text-amber-400" : "text-green-400"}>
                {diff.total_delta_gb} GB
              </span>
            </p>
            <ul className="space-y-1">
              {diff.deltas!.map((d) => (
                <li key={d.path} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{d.path}</span>
                  <span className={d.delta_bytes >= 0 ? "text-amber-400" : "text-green-400"}>
                    {d.delta_bytes >= 0 ? "+" : ""}{d.delta_gb} GB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {loading ? (
        <PageState kind="loading" message="Loading snapshots..." />
      ) : error ? (
        <PageState kind="error" message={error} onRetry={() => void refresh()} />
      ) : snapshots.length === 0 ? (
        <PageState kind="empty" message="No snapshots yet — take one above to start tracking growth." />
      ) : (
        <ul className="space-y-2" data-testid="snapshot-list">
          {snapshots.map((s) => (
            <li key={s.file} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div>
                <p className="text-zinc-100">{s.label || s.file}</p>
                <p className="text-sm text-zinc-400">{s.timestamp} · {s.paths.join(", ")}</p>
              </div>
              <button
                onClick={() => void handleDelete(s.file)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400"
                aria-label={`Delete ${s.file}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
