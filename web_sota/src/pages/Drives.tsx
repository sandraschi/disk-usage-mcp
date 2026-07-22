import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { HardDrive, Scan, Camera, Maximize2, Minimize2, Download } from "lucide-react";
import { scanPath, takeSnapshot, listSnapshots } from "../lib/api";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";

interface TreeNode {
  name: string;
  size?: number;
  children?: TreeNode[];
}

function flattenForTreemap(node: TreeNode | null, path = ""): { name: string; size: number; path: string }[] {
  if (!node) return [];
  if (node.children) {
    return node.children.flatMap((c) => flattenForTreemap(c, path ? `${path}/${c.name}` : c.name));
  }
  return [{ name: path || node.name, size: node.size || 0, path }];
}

export default function Drives() {
  const [scanPathInput, setScanPathInput] = useState("D:\\");
  const [scanDepth, setScanDepth] = useState(2);
  const [scanning, setScanning] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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

  const toggleFullscreen = useCallback(async () => {
    if (!chartRef.current) return;
    if (!document.fullscreenElement) {
      await chartRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const handleExportJpg = useCallback(async () => {
    const svg = chartRef.current?.querySelector("svg.recharts-surface");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, rect.width, rect.height);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.95);
      a.download = `treemap-${scanPathInput.replace(/[\\:]/g, "_")}-${Date.now()}.jpg`;
      a.click();
    };
    img.src = url;
  }, [scanPathInput]);

  const treemapData = flattenForTreemap(treeData);
  const chartData = treemapData.filter((d) => d.size > 0).slice(0, 50);

  const treemapHeight = fullscreen ? window.innerHeight - 80 : 400;

  return (
    <div data-testid="drives-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Drive Scanner</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
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

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {chartData.length > 0 && (
        <motion.div
          ref={chartRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${fullscreen ? "fixed inset-0 z-50 rounded-none border-0 flex flex-col" : ""}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400">Space Breakdown (Top 50)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJpg}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Export as JPEG"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {fullscreen && (
            <p className="text-xs text-zinc-600 mb-2">
              {scanPathInput} &middot; depth {scanDepth} &middot; {chartData.length} entries
            </p>
          )}
          <div className={fullscreen ? "flex-1" : ""}>
            <ResponsiveContainer width="100%" height={treemapHeight}>
              <Treemap
                data={chartData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#09090b"
                fill="#d97706"
              >
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                  formatter={(value: number) => `${(value / 1024 ** 3).toFixed(2)} GB`}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
          {fullscreen && (
            <button
              onClick={toggleFullscreen}
              className="mt-3 mx-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              Exit Fullscreen
            </button>
          )}
        </motion.div>
      )}

      {!chartData.length && !scanning && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <HardDrive className="h-12 w-12 mb-4" />
          <p>Enter a drive path and click Scan to visualize usage</p>
        </div>
      )}
    </div>
  );
}
