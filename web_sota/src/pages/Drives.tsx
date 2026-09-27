import { motion } from "framer-motion";
import { Camera, HardDrive, RefreshCw, Scan } from "lucide-react";
import { useEffect, useState } from "react";
import { TreemapView, type TreeNode } from "../components/TreemapView";
import { type ConnectedDrive, getDrives, listSnapshots, scanPath, takeSnapshot } from "../lib/api";

function usageColor(pct: number): string {
  if (pct >= 95) return "bg-red-500";
  if (pct >= 90) return "bg-red-400";
  if (pct >= 75) return "bg-amber-500";
  return "bg-emerald-500";
}

function DriveRow({ drive }: { drive: ConnectedDrive }) {
  if (!drive.reachable) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
        <span className="text-sm font-mono text-zinc-300">{drive.drive}</span>
        <span className="text-sm text-red-400">unreachable{drive.error ? ` — ${drive.error}` : ""}</span>
      </div>
    );
  }
  const pct = drive.percent_used ?? 0;
  const critical = pct >= 90;
  return (
    <div
      className="py-2 border-b border-zinc-800/60 last:border-0"
      data-testid={`drive-row-${drive.drive.replace(/[^A-Z]/gi, "")}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-mono text-zinc-100">
          {drive.drive}
          {drive.label ? <span className="ml-2 text-zinc-400 font-sans">“{drive.label}”</span> : null}
          {drive.kind && drive.kind !== "fixed" ? (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-600/30 text-sky-300 text-xs">{drive.kind}</span>
          ) : null}
          {drive.kind === "removable" ? (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-sky-600/30 text-sky-300 text-xs">BYOD?</span>
          ) : null}
        </span>
        <span className={`text-sm font-semibold ${critical ? "text-red-400" : "text-zinc-300"}`}>
          {(drive.used_gb ?? 0).toLocaleString()} / {(drive.total_gb ?? 0).toLocaleString()} GB
          <span className="ml-2 text-xs font-normal text-zinc-400">
            {(drive.free_gb ?? 0).toLocaleString()} free · {pct.toFixed(1)}%
          </span>
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${usageColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function Drives() {
  const [scanPathInput, setScanPathInput] = useState("D:\\");
  const [scanDepth, setScanDepth] = useState(3);
  const [scanning, setScanning] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [error, setError] = useState("");
  const [drives, setDrives] = useState<ConnectedDrive[]>([]);
  const [drivesLoading, setDrivesLoading] = useState(true);
  const [drivesError, setDrivesError] = useState("");

  const refreshDrives = async () => {
    setDrivesLoading(true);
    setDrivesError("");
    try {
      const result = await getDrives();
      setDrives(result.drives || []);
      if (!result.success) setDrivesError(result.error || result.message || "Drive list failed");
    } catch (e) {
      setDrivesError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDrivesLoading(false);
    }
  };

  useEffect(() => {
    void refreshDrives();
  }, []);

  const fullCount = drives.filter((d) => d.reachable && (d.percent_used ?? 0) >= 90).length;

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setTreeData(null);
    try {
      const result = await scanPath(scanPathInput, scanDepth);
      if (result.success && result.data) {
        setTreeData(result.data as unknown as TreeNode);
      } else {
        setError(result.error || result.message || "Scan failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setScanning(false);
    }
  };

  const handleSnapshot = async () => {
    try {
      const result = await takeSnapshot([scanPathInput], `scan_${Date.now()}`);
      if (result.success) {
        await listSnapshots();
      } else {
        setError(`Snapshot failed: ${"message" in result && result.message ? result.message : "unknown error"}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snapshot failed");
    }
  };

  return (
    <div data-testid="drives-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Drive & Treemap Scanner</h2>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="drives-overview">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-300">
            Connected drives{drives.length > 0 && ` (${drives.length})`}
            {fullCount > 0 && <span className="ml-2 text-red-400">· {fullCount} at ≥90% full</span>}
          </h3>
          <button
            onClick={() => void refreshDrives()}
            disabled={drivesLoading}
            className="flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm text-zinc-200"
            data-testid="drives-refresh"
          >
            <RefreshCw className={`h-3 w-3 ${drivesLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {drivesLoading && <p className="text-sm text-zinc-400">Probing connected drives…</p>}
        {drivesError && (
          <p className="text-sm text-red-400">
            {drivesError}{" "}
            <button onClick={() => void refreshDrives()} className="underline hover:text-red-300">
              Retry
            </button>
          </p>
        )}
        {!drivesLoading && !drivesError && drives.length === 0 && (
          <p className="text-sm text-zinc-400">No drives detected. Is the backend running?</p>
        )}
        {!drivesLoading && drives.length > 0 && drives.map((d) => <DriveRow key={d.drive} drive={d} />)}
      </section>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4" data-testid="drives-controls">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={scanPathInput}
            onChange={(e) => setScanPathInput(e.target.value)}
            placeholder="D:\\Media"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={scanDepth}
            onChange={(e) => setScanDepth(Number(e.target.value))}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 text-sm text-center focus:outline-none focus:border-amber-500"
            title="Scan depth"
          />
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Scan className="h-4 w-4" />
            {scanning ? "Scanning..." : "Scan"}
          </button>
          <button
            onClick={handleSnapshot}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Camera className="h-4 w-4" />
            Snapshot
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm">
            {error}{" "}
            <button onClick={handleScan} className="underline hover:text-red-300">
              Retry
            </button>
          </p>
        )}
      </div>

      {scanning && (
        <div className="flex items-center justify-center py-12 text-zinc-300" data-testid="drives-loading">
          <Scan className="h-6 w-6 animate-spin mr-2" /> Scanning {scanPathInput}...
        </div>
      )}

      {treeData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid="drives-result">
          <TreemapView rootData={treeData} rootPathName={scanPathInput} />
        </motion.div>
      )}

      {!treeData && !scanning && (
        <div
          className="flex flex-col items-center justify-center py-16 text-zinc-400 bg-zinc-900/50 border border-zinc-800/80 rounded-xl"
          data-testid="drives-empty"
        >
          <HardDrive className="h-12 w-12 mb-4 text-amber-500/80" />
          <p className="text-zinc-200 font-medium">Interactive drill-down treemap</p>
          <p className="text-sm text-zinc-400 mt-1">
            Enter a drive path above and click Scan to analyze directory usage.
          </p>
        </div>
      )}
    </div>
  );
}
