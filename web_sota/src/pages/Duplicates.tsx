import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Search, FolderOpen } from "lucide-react";
import { findDuplicates, type DuplicateFile } from "../lib/api";

export default function Duplicates() {
  const [paths, setPaths] = useState("D:\\,E:\\");
  const [minSize, setMinSize] = useState(100);
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateFile[]>([]);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setDuplicates([]);
    try {
      const pathList = paths.split(",").map((p) => p.trim()).filter(Boolean);
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

  return (
    <div data-testid="duplicates-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Duplicate Finder</h2>

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
            <Search className="h-4 w-4 animate-spin mr-2" /> Scanning for duplicates — czkawka can take minutes on big trees...
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="text-sm text-zinc-400">
            Found {duplicates.length} groups — estimated reclaimable:{" "}
            <span className="text-amber-400 font-semibold">
              {(totalWaste / 1024).toFixed(1)} GB
            </span>
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
            <div
              key={group.hash || i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
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
                  <li className="text-sm text-zinc-400">
                    ...and {group.files.length - 5} more
                  </li>
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
    </div>
  );
}
