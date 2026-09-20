import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useZoom } from "../hooks/useZoom";
import { HelpModal } from "./HelpModal";
import { LoggerModal } from "./LoggerModal";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/drives": "Drives",
  "/duplicates": "Duplicates",
  "/inbox": "Inbox",
  "/tools": "Tools",
  "/skills": "Skills",
  "/chat": "Chat",
  "/logs": "Logs",
  "/apps": "Apps",
  "/settings": "Settings",
  "/help": "Help",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const { zoom, reset } = useZoom();

  const focusSearch = useCallback(() => {
    const el = document.querySelector<HTMLInputElement>('[data-testid="topbar-search"]');
    el?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "l") {
        e.preventDefault();
        setLoggerOpen((o) => !o);
      } else if (key === "h") {
        e.preventDefault();
        setHelpOpen((o) => !o);
      } else if (key === "k") {
        e.preventDefault();
        focusSearch();
      } else if (key === "0") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch, reset]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("app-zoom", { detail: e.deltaY < 0 ? "in" : "out" }));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const context = PAGE_TITLES[location.pathname] ?? "";

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          zoomPct={Math.round(zoom * 100)}
          onOpenLogger={() => setLoggerOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <LoggerModal open={loggerOpen} onClose={() => setLoggerOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} context={context} />
    </div>
  );
}
