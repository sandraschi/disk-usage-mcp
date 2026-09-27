import { motion } from "framer-motion";
import { Copy, FolderOpen, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PeerBadge } from "../components/PeerBadge";
import { type BcCompareResponse, bcCompareFolders, type DuplicateFile, findDuplicates } from "../lib/api";

export default function Duplicates() {
  const [paths, setPaths] = useState("D:\\,E:\\");
  const [minSize, setMinSize] = useState(100);
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateFile[]>([]);
  const [error, setError] = useState("");
  const [verifyLeft, setVerifyLeft] = useState("D:\\Media");
  const [verifyRight, setVerifyRight] = useState("E:\\Media");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<BcCompareResponse | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setDuplicates([]);
    try {
      const pathList = paths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const result = await findDuplicates(pathList, minSize);
      if (result.success) {
        setDuplicates(result.duplicates || []);
      } else {
        setError(result.error || "Scan failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setScanning(false);
    }
  };

  const totalWaste = duplicates.reduce((sum, d) => sum + d.size_mb * (d.files.length - 1), 0);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      setVerifyResult(await bcCompareFolders(verifyLeft, verifyRight, true));
    } catch (e) {
      setVerifyResult({ success: false, message: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div data-testid="duplicates-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Duplicate Finder</h2>

      <div
        className="rounded-xl border border-amber-800/70 bg-amber-950/40 p-4 text-sm text-amber-200"
        data-testid="duplicates-safety"
      >
        <p className="font-semibold">Safety rule: never delete on hash-match alone.</p>
        <p className="mt-1 text-amber-200/80">
          Verify the keeper first (open it, check it plays), quarantine candidates for a week, keep one offsite copy —
          then delete. A hash-dupe once ate a well-organized classical library that was nowhere to be found afterwards.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4" data-testid="duplicates-controls">
        <div className="flex gap-3">
          <input
            type="text"
            value={paths}
            onChange={(e) => setPaths(e.target.value)}
            placeholder="D:\,E:\"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <input
            type="number"
            min={1}
            value={minSize}
            onChange={(e) => setMinSize(Number(e.target.value))}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 text-sm text-center focus:outline-none focus:border-amber-500"
            title="Min size MB"
          />
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Search className="h-4 w-4" />
            {scanning ? "Scanning..." : "Find Duplicates"}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm" data-testid="duplicates-error">
            {error}{" "}
            <button onClick={handleScan} className="underline hover:text-red-300">
              Retry
            </button>
          </p>
        )}

        {scanning && (
          <div className="flex items-center text-zinc-300 text-sm" data-testid="duplicates-loading">
            <Search className="h-4 w-4 animate-spin mr-2" /> Scanning for duplicates — czkawka can take minutes on big
            trees...
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="text-sm text-zinc-400">
            Found {duplicates.length} groups — estimated reclaimable:{" "}
            <span className="text-amber-400 font-semibold">{(totalWaste / 1024).toFixed(1)} GB</span>
          </div>
        )}
      </div>

      {duplicates.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
          data-testid="duplicates-result"
        >
          {duplicates.slice(0, 50).map((group, i) => (
            <div key={group.hash || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300 font-mono truncate max-w-[300px]">
                  {group.hash || `group-${i}`}
                </span>
                <span className="text-sm text-amber-400 font-semibold">
                  {group.size_mb.toFixed(1)} MB × {group.files.length}
                </span>
              </div>
              <ul className="space-y-1">
                {group.files.slice(0, 5).map((f, fi) => (
                  <li key={fi} className="text-sm text-zinc-400 truncate flex items-center gap-1">
                    <FolderOpen className="h-3 w-3 flex-shrink-0" />
                    {f}
                  </li>
                ))}
                {group.files.length > 5 && (
                  <li className="text-sm text-zinc-400">...and {group.files.length - 5} more</li>
                )}
              </ul>
            </div>
          ))}
        </motion.div>
      )}

      {!duplicates.length && !scanning && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400" data-testid="duplicates-empty">
          <Copy className="h-12 w-12 mb-4" />
          <p>Enter comma-separated paths and click Find Duplicates</p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3" data-testid="duplicates-verify">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Verify with Beyond Compare — disk-usage suspects, BC confirms
          </h3>
          <PeerBadge peer="beyondcompare" label="Beyond Compare" />
        </div>
        <p className="text-xs text-zinc-400">
          Hash matches are candidates, not verdicts. BC gives the byte-level answer before anything is quarantined. Same
          flow answers “are these two folders really in sync?” for BYOD rotation checks.
        </p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={verifyLeft}
            onChange={(e) => setVerifyLeft(e.target.value)}
            placeholder="D:\Media"
            aria-label="Left folder"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={verifyRight}
            onChange={(e) => setVerifyRight(e.target.value)}
            placeholder="E:\Media"
            aria-label="Right folder"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => void handleVerify()}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            {verifying ? "Comparing…" : "Verify folders"}
          </button>
        </div>
        {verifyResult && (
          <div
            className={`text-sm rounded-lg p-3 ${verifyResult.success ? "bg-emerald-950/50 text-emerald-200" : "bg-zinc-800 text-zinc-300"}`}
            data-testid="duplicates-verify-result"
          >
            <p>{verifyResult.message}</p>
            {verifyResult.data !== undefined && verifyResult.data !== null && (
              <pre className="mt-2 text-xs whitespace-pre-wrap break-all max-h-64 overflow-auto">
                {typeof verifyResult.data === "string" ? verifyResult.data : JSON.stringify(verifyResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
