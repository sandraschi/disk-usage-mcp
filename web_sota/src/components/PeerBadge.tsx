import { useEffect, useState } from "react";
import { getPeersStatus } from "../lib/api";

/** 1-hop peer status badge: green = companion running, gray = optional & down. Never blocks. */
export function PeerBadge({ peer, label }: { peer: string; label: string }) {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPeersStatus()
      .then((r) => {
        if (cancelled) return;
        const state = r.peers?.[peer];
        setReachable(state ? state.reachable : false);
        if (state?.repo_url) setRepoUrl(state.repo_url);
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [peer]);

  const dot = reachable === null ? "bg-zinc-500" : reachable ? "bg-emerald-500" : "bg-zinc-500";
  const text = reachable === null ? "checking…" : reachable ? "connected" : "not running (optional)";
  const title = reachable
    ? `${label}: companion server reachable`
    : `${label}: companion server not running — optional. ${repoUrl} ${repoUrl ? "for install." : ""}`;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300"
      title={title}
      data-testid={`peer-badge-${peer}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}: {text}
    </span>
  );
}
