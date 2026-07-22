import { useEffect } from "react";
import { useConnectionStore } from "../stores/connection";

export function Topbar() {
  const { backendOk, check } = useConnectionStore();

  useEffect(() => {
    const poll = async () => {
      await check();
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [check]);

  const statusDot = backendOk === null
    ? "bg-gray-500"
    : backendOk
      ? "bg-green-500"
      : "bg-red-500";

  const statusText = backendOk === null
    ? "Connecting..."
    : backendOk
      ? "Connected"
      : "Offline";

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900">
      <h1 className="text-lg font-semibold text-zinc-100">Disk Usage MCP</h1>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`} />
        <span>{statusText}</span>
      </div>
    </header>
  );
}
