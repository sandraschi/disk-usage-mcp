import React, { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3";
import { ChevronRight, Home, ArrowUp, Maximize2, Minimize2, Download, Folder, FileText } from "lucide-react";

export interface TreeNode {
  name: string;
  size?: number;
  children?: TreeNode[];
  path?: string;
}

interface TreemapViewProps {
  rootData: TreeNode;
  rootPathName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

const CATEGORY_COLORS = {
  folder: "#27272a", // zinc-800
  media: "#ec4899", // pink-500
  code: "#10b981", // emerald-500
  archive: "#f59e0b", // amber-500
  exec: "#ef4444", // red-500
  doc: "#3b82f6", // blue-500
  other: "#64748b", // slate-500
} as const;

function getCategoryColor(name: string, isFolder: boolean): string {
  if (isFolder) return CATEGORY_COLORS.folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mkv", "avi", "mp3", "flac", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return CATEGORY_COLORS.media;
  if (["py", "ts", "tsx", "js", "jsx", "rs", "cpp", "c", "h", "html", "css", "json", "yml", "toml"].includes(ext)) return CATEGORY_COLORS.code;
  if (["zip", "tar", "gz", "7z", "rar", "iso", "cab"].includes(ext)) return CATEGORY_COLORS.archive;
  if (["exe", "dll", "msi", "bin", "sys", "bat", "ps1", "sh"].includes(ext)) return CATEGORY_COLORS.exec;
  if (["pdf", "docx", "xlsx", "pptx", "txt", "md"].includes(ext)) return CATEGORY_COLORS.doc;
  return CATEGORY_COLORS.other;
}

export function TreemapView({ rootData, rootPathName = "Root" }: TreemapViewProps) {
  const [history, setHistory] = useState<TreeNode[]>([rootData]);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<{ name: string; size: number; isFolder: boolean; percent: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const currentNode = history[history.length - 1] ?? rootData;

  // Update root when rootData changes
  useEffect(() => {
    setHistory([rootData]);
  }, [rootData]);

  // Handle Resize & Fullscreen
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setDimensions({
          width: Math.max(clientWidth - 32, 400),
          height: fullscreen ? Math.max(window.innerHeight - 160, 400) : 500,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [fullscreen]);

  // Build D3 Hierarchy & Treemap Layout
  const treemapNodes = useMemo(() => {
    if (!currentNode) return [];

    const root = d3.hierarchy<TreeNode>(currentNode)
      .sum((d) => (d.children && d.children.length > 0 ? 0 : d.size || 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap<TreeNode>()
      .size([dimensions.width, dimensions.height])
      .paddingOuter(3)
      .paddingInner(2)
      .round(true);

    treemapLayout(root);

    const children = root.children as d3.HierarchyRectangularNode<TreeNode>[] | undefined;
    return children || ([root] as unknown as d3.HierarchyRectangularNode<TreeNode>[]);
  }, [currentNode, dimensions]);

  const totalCurrentSize = useMemo(() => {
    if (!currentNode) return 0;
    if (currentNode.size) return currentNode.size;
    if (currentNode.children) {
      return currentNode.children.reduce((acc, child) => acc + (child.size || 0), 0);
    }
    return 0;
  }, [currentNode]);

  const drillDown = (nodeData: TreeNode) => {
    if (nodeData.children && nodeData.children.length > 0) {
      setHistory((prev) => [...prev, nodeData]);
    }
  };

  const jumpToHistory = (index: number) => {
    setHistory((prev) => prev.slice(0, index + 1));
  };

  const stepUp = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const exportSvgJpg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width * 2;
    canvas.height = dimensions.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.95);
      a.download = `wiztree-treemap-${Date.now()}.jpg`;
      a.click();
    };
    img.src = url;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col space-y-3 ${
        fullscreen ? "fixed inset-0 z-50 rounded-none border-0 p-6" : ""
      }`}
    >
      {/* Top Bar & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
        <div className="flex items-center gap-1.5 flex-wrap text-sm">
          <button
            onClick={() => jumpToHistory(0)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-medium transition-colors"
            title="Jump to root"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{rootPathName}</span>
          </button>

          {history.map((node, index) => {
            if (index === 0) return null;
            return (
              <React.Fragment key={index}>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                <button
                  onClick={() => jumpToHistory(index)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    index === history.length - 1
                      ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {node.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={stepUp}
            disabled={history.length <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-zinc-300 transition-colors"
            title="Go up one folder"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Up</span>
          </button>
          <button
            onClick={exportSvgJpg}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Export as JPEG"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen WizTree View"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* WizTree Stats Banner */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span>Active: <strong className="text-zinc-200">{currentNode.name}</strong></span>
          <span>Size: <strong className="text-amber-400">{formatBytes(totalCurrentSize)}</strong></span>
          <span>Items: <strong className="text-zinc-200">{treemapNodes.length}</strong></span>
        </div>
        {hoveredNode && (
          <div className="flex items-center gap-2 text-zinc-300 bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-700/50">
            {hoveredNode.isFolder ? <Folder className="h-3.5 w-3.5 text-amber-400" /> : <FileText className="h-3.5 w-3.5 text-blue-400" />}
            <span className="font-medium">{hoveredNode.name}</span>
            <span className="text-amber-400 font-semibold">{formatBytes(hoveredNode.size)}</span>
            <span className="text-zinc-400">({hoveredNode.percent.toFixed(1)}%)</span>
          </div>
        )}
      </div>

      {/* Interactive D3 Treemap Layout */}
      <div className="flex-1 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/80 relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full select-none"
        >
          {treemapNodes.map((node, i) => {
            const w = node.x1 - node.x0;
            const h = node.y1 - node.y0;
            if (w <= 0 || h <= 0) return null;

            const isFolder = Boolean(node.data.children && node.data.children.length > 0);
            const color = getCategoryColor(node.data.name, isFolder);
            const nodeSize = node.value || node.data.size || 0;
            const percent = totalCurrentSize > 0 ? (nodeSize / totalCurrentSize) * 100 : 0;

            return (
              <g
                key={i}
                transform={`translate(${node.x0},${node.y0})`}
                className="cursor-pointer transition-opacity duration-150 hover:opacity-90"
                onClick={() => drillDown(node.data)}
                onMouseEnter={() =>
                  setHoveredNode({
                    name: node.data.name,
                    size: nodeSize,
                    isFolder,
                    percent,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
              >
                <rect
                  width={w}
                  height={h}
                  fill={color}
                  stroke="#09090b"
                  strokeWidth={1.5}
                  rx={2}
                  className="transition-all"
                />

                {/* Directory Header Bar */}
                {isFolder && w > 45 && h > 22 && (
                  <rect
                    width={w}
                    height={Math.min(18, h)}
                    fill="rgba(0, 0, 0, 0.4)"
                    stroke="none"
                  />
                )}

                {/* Node Label Text */}
                {w > 35 && h > 20 && (
                  <text
                    x={4}
                    y={14}
                    fill="#f4f4f5"
                    fontSize={Math.min(12, Math.max(9, w / 8))}
                    fontWeight={isFolder ? "600" : "400"}
                    className="pointer-events-none drop-shadow-sm"
                  >
                    {w > 60 ? node.data.name : node.data.name.slice(0, 8) + ".."}
                  </text>
                )}

                {/* Node Size Subtext */}
                {w > 55 && h > 36 && (
                  <text
                    x={4}
                    y={28}
                    fill="#a1a1aa"
                    fontSize={10}
                    className="pointer-events-none"
                  >
                    {formatBytes(nodeSize)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* WizTree Category Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-zinc-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-zinc-500 font-medium">Legend:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.folder }}></span> Folder</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.media }}></span> Media</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.code }}></span> Code/Dev</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.archive }}></span> Archives</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.exec }}></span> Executable</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS.doc }}></span> Docs</span>
        </div>
        <span className="text-zinc-500 italic">Click any folder block to drill down</span>
      </div>
    </div>
  );
}
