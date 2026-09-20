import { useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Scan, Camera } from "lucide-react";
import { scanPath, takeSnapshot, listSnapshots } from "../lib/api";
import { TreemapView, type TreeNode } from "../components/TreemapView";

export default function Drives() {
  const [scanPathInput, setScanPathInput] = useState("D:\\");
  const [scanDepth, setScanDepth] = useState(3);
  const [scanning, setScanning] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setTreeData(null);
    try {
      const result = await scanPath(scanPathInput, scanDepth);
      if (result.success && result.data) {
        setTreeData(result.data as unknown as TreeNode);
      } else {
        setError(result.error || "Scan failed");
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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snapshot failed");
    }
  };

  return (
    <div data-testid="drives-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Drive & Treemap Scanner</h2>

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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="drives-result"
        >
          <TreemapView rootData={treeData} rootPathName={scanPathInput} />
        </motion.div>
      )}

      {!treeData && !scanning && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 bg-zinc-900/50 border border-zinc-800/80 rounded-xl" data-testid="drives-empty">
          <HardDrive className="h-12 w-12 mb-4 text-amber-500/80" />
          <p className="text-zinc-200 font-medium">Interactive drill-down treemap</p>
          <p className="text-sm text-zinc-400 mt-1">Enter a drive path above and click Scan to analyze directory usage.</p>
        </div>
      )}
    </div>
  );
}

