import { useEffect, useState } from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import { getFleetApps, type FleetApp } from "../lib/api";

export default function Apps() {
  const [apps, setApps] = useState<FleetApp[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState("");

  const load = async (probe: boolean) => {
    if (probe) setProbing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await getFleetApps(probe);
      setApps(data.apps);
      setSource(data.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet apps");
    } finally {
      setLoading(false);
      setProbing(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const known = apps.filter((a) => !a.repo.toLowerCase().includes("unknown") && a.repo !== "-");
  const experimental = apps.filter((a) => a.repo.toLowerCase().includes("unknown") || a.repo === "-");

  const card = (a: FleetApp) => (
    <li key={a.port} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-sm text-amber-400">{a.repo}</p>
        {a.live !== undefined && (
          <span className={`w-2 h-2 rounded-full ${a.live ? "bg-green-500" : "bg-zinc-600"}`} title={a.live ? "Live" : "Not responding"} />
        )}
      </div>
      <p className="text-sm text-zinc-300 truncate">{a.description}</p>
      <a
        href={`http://127.0.0.1:${a.port + 1}/`}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-zinc-400 hover:text-zinc-200 underline"
      >
        :{a.port + 1}
      </a>
    </li>
  );

  return (
    <div data-testid="apps-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-amber-500" /> Fleet Apps
        </h2>
        <button
          onClick={() => void load(true)}
          disabled={probing}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm"
          data-testid="apps-probe"
        >
          {probing ? "Probing..." : "Probe live status"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center py-12 text-zinc-300" data-testid="apps-loading">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading fleet registry...
        </div>
      )}
      {error && (
        <div className="text-center py-12" data-testid="apps-error">
          <p className="text-red-400 mb-2">{error}</p>
          <button onClick={() => void load(false)} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm">Retry</button>
        </div>
      )}
      {!loading && !error && apps.length === 0 && (
        <p className="text-center py-12 text-zinc-400" data-testid="apps-empty">
          No registry found{source ? ` (${source})` : ""} — Apps Hub needs WEBAPP_PORTS.md on this host.
        </p>
      )}

      {known.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Fleet ({known.length})</h3>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="apps-list">
            {known.map(card)}
          </ul>
        </section>
      )}
      {experimental.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Experimental ({experimental.length})</h3>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="apps-experimental">
            {experimental.map(card)}
          </ul>
        </section>
      )}
    </div>
  );
}
