import { BookOpen, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { type CapabilitiesResponse, getCapabilities, getSetupStatus, type SetupStatus } from "../lib/api";

export default function Help() {
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem("disk-onboarded-done") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    Promise.all([getCapabilities().catch(() => null), getSetupStatus().catch(() => null)]).then(([c, s]) => {
      if (c) setCaps(c);
      if (s) setSetup(s);
      setLoading(false);
    });
  }, []);

  const markDone = () => {
    try {
      localStorage.setItem("disk-onboarded-done", "1");
    } catch {
      /* ignore */
    }
    setOnboarded(true);
  };

  return (
    <div data-testid="help-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-amber-500" /> Help
      </h2>

      {loading && (
        <div className="flex items-center py-8 text-zinc-300" data-testid="help-loading">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      )}

      <section
        id="onboarding"
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
        data-testid="help-onboarding"
      >
        <h3 className="text-base font-semibold text-zinc-100">Onboarding — first-time setup</h3>
        <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-1">
          <li>
            Install the scanners: <code className="text-amber-400">winget install Byron.dua-cli</code> and{" "}
            <code className="text-amber-400">winget install qarmin.czkawka</code>
          </li>
          <li>
            Restart the backend (<code className="text-zinc-100">.\start.ps1</code>) so PATH picks them up
          </li>
          <li>
            Open Drives, scan <code className="text-zinc-100">D:\</code> at depth 2 to verify
          </li>
          <li>
            Optional: start Ollama (<code className="text-zinc-100">ollama serve</code>) for local Chat
          </li>
        </ol>
        {setup && (
          <ul className="text-sm space-y-1">
            {Object.entries(setup.binaries).map(([name, b]) => (
              <li key={name} className={b.found ? "text-green-400" : "text-red-400"}>
                {b.found ? "✓" : "✗"} {name}
                {b.found ? ` — ${b.path}` : ` — install: ${b.install}`}
              </li>
            ))}
          </ul>
        )}
        {!onboarded ? (
          <button
            onClick={markDone}
            disabled={!setup?.ready}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium"
            data-testid="onboarding-done"
          >
            Mark onboarding complete
          </button>
        ) : (
          <p className="text-sm text-green-400" data-testid="onboarding-complete">
            Onboarding complete — mock indicators cleared.
          </p>
        )}
        <p className="text-sm text-zinc-400">
          Full guide: <code className="text-zinc-300">docs/ONBOARDING.md</code> in the repo.
        </p>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2" data-testid="help-endpoints">
        <h3 className="text-base font-semibold text-zinc-100">REST endpoints (live from this backend)</h3>
        {caps ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 font-mono text-sm text-zinc-300">
            {caps.endpoints.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">Backend offline — start it to see the live endpoint list.</p>
        )}
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2" data-testid="help-shortcuts">
        <h3 className="text-base font-semibold text-zinc-100">Keyboard shortcuts</h3>
        <ul className="text-sm text-zinc-300 space-y-1">
          <li>
            <code className="text-amber-400">Ctrl+L</code> — toggle server logs
          </li>
          <li>
            <code className="text-amber-400">Ctrl+H</code> — toggle this help
          </li>
          <li>
            <code className="text-amber-400">Ctrl+K</code> — focus page search
          </li>
          <li>
            <code className="text-amber-400">Ctrl+Scroll</code> — zoom UI,{" "}
            <code className="text-amber-400">Ctrl+0</code> — reset zoom
          </li>
        </ul>
      </section>

      <section
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2"
        data-testid="help-troubleshooting"
      >
        <h3 className="text-base font-semibold text-zinc-100">Troubleshooting</h3>
        <ul className="text-sm text-zinc-300 space-y-1">
          <li>
            <strong>Dashboard shows Offline</strong> — backend not running; run{" "}
            <code className="text-zinc-100">.\start.ps1</code>.
          </li>
          <li>
            <strong>Scan fails with binary error</strong> — install dua-cli / czkawka_cli (see onboarding above).
          </li>
          <li>
            <strong>Chat says no LLM</strong> — start Ollama or load a model in LM Studio; no accounts or keys needed.
          </li>
          <li>
            <strong>Duplicates page empty</strong> — czkawka needs minutes on big trees; raise min size to narrow it.
          </li>
        </ul>
      </section>
    </div>
  );
}
