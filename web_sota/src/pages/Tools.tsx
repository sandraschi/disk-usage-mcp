import { Play, RefreshCw, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { type CapabilitiesResponse, findDuplicates, findLargeFiles, getCapabilities, scanPath } from "../lib/api";

export default function Tools() {
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [path, setPath] = useState("D:\\");
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    getCapabilities()
      .then(setCaps)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const run = async (name: string) => {
    setRunning(name);
    setResult("");
    try {
      let out: unknown;
      if (name === "scan_path") out = await scanPath(path, 2);
      else if (name === "find_large_files") out = await findLargeFiles(path, 1.0, 10);
      else if (name === "get_drive_overview") out = await scanPath(path, 1);
      else if (name === "find_duplicates") out = await findDuplicates([path], 100);
      else out = { note: "Use the dedicated page for this tool." };
      setResult(JSON.stringify(out, null, 2).slice(0, 4000));
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div data-testid="tools-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Tools</h2>

      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-2 items-center"
        data-testid="tools-runner"
      >
        <Wrench className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Target path for quick runs"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
        />
      </div>

      {loading && (
        <div className="flex items-center py-12 text-zinc-300" data-testid="tools-loading">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading tools...
        </div>
      )}
      {error && (
        <div className="text-center py-12" data-testid="tools-error">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {caps && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="tools-list">
          {caps.tools.map((t) => (
            <li key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <p className="font-mono text-sm text-amber-400">{t.name}</p>
              <p className="text-sm text-zinc-300">{t.description}</p>
              <button
                onClick={() => void run(t.name)}
                disabled={running !== null}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm text-zinc-200"
                data-testid={`tool-run-${t.name}`}
              >
                <Play className="h-3.5 w-3.5" />
                {running === t.name ? "Running..." : "Quick run"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {result && (
        <pre
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 overflow-auto max-h-96"
          data-testid="tools-result"
        >
          {result}
        </pre>
      )}

      {!loading && !error && !caps && (
        <p className="text-center py-12 text-zinc-400" data-testid="tools-empty">
          No tools reported by the backend.
        </p>
      )}
    </div>
  );
}
