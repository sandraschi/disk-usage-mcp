import { CircleHelp, FileText, Search } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectionStore } from "../stores/connection";

const BACKOFFS = [1000, 2000, 4000, 8000, 16000];

async function attachTauriListener(onReady: () => void): Promise<(() => void) | null> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<string>("backend-status", (event) => {
      if (event.payload === "ready") onReady();
    });
    return unlisten;
  } catch {
    return null;
  }
}

export function Topbar({
  zoomPct,
  onOpenLogger,
  onOpenHelp,
}: {
  zoomPct: number;
  onOpenLogger: () => void;
  onOpenHelp: () => void;
}) {
  const { backendOk, check } = useConnectionStore();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;

    const poll = async () => {
      if (cancelled) return;
      const before = useConnectionStore.getState().backendOk;
      await check();
      const after = useConnectionStore.getState().backendOk;
      failures = after ? 0 : before === false ? failures + 1 : 1;
      const delay = after ? 10000 : BACKOFFS[Math.min(failures, BACKOFFS.length - 1)];
      timer = setTimeout(poll, delay);
    };

    let detach: (() => void) | null = null;
    void attachTauriListener(() => void check()).then((fn) => {
      detach = fn;
    });
    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      detach?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusDot = backendOk === null ? "bg-gray-500" : backendOk ? "bg-green-500" : "bg-red-500";

  const statusText = backendOk === null ? "Connecting..." : backendOk ? "Connected" : "Offline";

  return (
    <header className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 bg-zinc-900">
      <h1 className="text-lg font-semibold text-zinc-100 whitespace-nowrap">Disk Usage MCP</h1>
      <div className="relative flex-1 max-w-md">
        <Search className="h-4 w-4 absolute left-2 top-2.5 text-zinc-500" />
        <input
          data-testid="topbar-search"
          placeholder="Search pages... (Ctrl+K)"
          onKeyDown={(e) => {
            const q = (e.target as HTMLInputElement).value.toLowerCase();
            if (e.key === "Enter" && q) {
              const routes = [
                "dashboard",
                "drives",
                "duplicates",
                "inbox",
                "tools",
                "skills",
                "chat",
                "logs",
                "apps",
                "settings",
                "help",
              ];
              const hit = routes.find((r) => r.includes(q));
              if (hit) navigate(`/${hit}`);
            }
          }}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500"
        />
      </div>
      <div className="flex-1" />
      <span className="text-sm text-zinc-400" title="UI zoom (Ctrl+Scroll, Ctrl+0 resets)">
        {zoomPct}%
      </span>
      <button
        onClick={onOpenLogger}
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300"
        title="Server logs (Ctrl+L)"
        aria-label="Open logs"
      >
        <FileText className="h-4 w-4" />
      </button>
      <button
        onClick={onOpenHelp}
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300"
        title="Help (Ctrl+H)"
        aria-label="Open help"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 text-sm text-zinc-300" data-testid="backend-dot">
        <span className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`} />
        <span>{statusText}</span>
      </div>
    </header>
  );
}
