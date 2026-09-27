import { Cloud as CloudIcon, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { type CloudProviderState, type CloudStatusResponse, getCloudStatus } from "../lib/api";

function ProviderCard({ title, state, hint }: { title: string; state: CloudProviderState | undefined; hint: string }) {
  if (!state) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-1">{title}</h3>
        <p className="text-sm text-zinc-400">No data yet.</p>
      </div>
    );
  }
  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2"
      data-testid={`cloud-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${state.configured ? "bg-emerald-500" : "bg-red-500"}`} />
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <span className="text-xs text-zinc-400">{state.configured ? "synced locally" : "not detected"}</span>
      </div>
      <p className="text-sm text-zinc-300 font-mono break-all">{state.local_path || "(no path)"}</p>
      {state.volume_label ? <p className="text-xs text-zinc-400">Volume: “{state.volume_label}”</p> : null}
      {state.host_drive ? (
        <p className="text-xs text-zinc-400">
          Lives on {state.host_drive} · {state.host_free_gb?.toLocaleString()} GB free on host volume
        </p>
      ) : null}
      <p className="text-xs text-zinc-400">{state.note}</p>
      {!state.configured ? <p className="text-xs text-amber-300/90">{hint}</p> : null}
    </div>
  );
}

export default function Cloud() {
  const [status, setStatus] = useState<CloudStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await getCloudStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div data-testid="cloud-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <CloudIcon className="h-6 w-6 text-sky-400" /> Cloud Storage
        </h2>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm text-zinc-200"
          data-testid="cloud-refresh"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-sm text-zinc-400">
        Local sync-folder state only for now — cloud quota needs OneDrive (Microsoft Graph) and Google Drive API OAuth,
        which is not wired yet. See Help → Onboarding for the account setup path.
      </p>

      {loading && <p className="text-sm text-zinc-400">Checking sync folders…</p>}
      {error && (
        <p className="text-sm text-red-400">
          {error}{" "}
          <button onClick={() => void refresh()} className="underline hover:text-red-300">
            Retry
          </button>
        </p>
      )}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProviderCard
            title="OneDrive"
            state={status.onedrive}
            hint="Install OneDrive and sign in, or set the OneDrive env folder. Default: %USERPROFILE%\\OneDrive."
          />
          <ProviderCard
            title="Google Drive"
            state={status.google}
            hint="Install Drive for Desktop (virtual mount labeled Google Drive) and sign in."
          />
        </div>
      )}
    </div>
  );
}
