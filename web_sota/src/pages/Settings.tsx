import { useEffect } from "react";
import { Cpu, HardDrive, RefreshCw } from "lucide-react";
import { useLlmStore } from "../stores/llm";

const DRIVE_SUGGESTIONS = ["D:\\Media", "E:\\Backup1", "F:\\Backup2", "G:\\Backup3"];

export default function Settings() {
  const { providers, gpuPresent, gpuDetail, selectedProvider, selectedModel, probing, probed, probe, select } =
    useLlmStore();

  useEffect(() => {
    void probe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = providers.find((p) => p.id === selectedProvider);
  const models = active?.models ?? [];

  return (
    <div className="space-y-6" data-testid="settings-page">
      <h2 className="text-2xl font-bold text-zinc-100">Settings</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3" data-testid="llm-onboarding">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-amber-500" /> Local LLM providers
          </h3>
          <button
            onClick={() => void probe()}
            disabled={probing}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm"
            data-testid="llm-reprobe"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${probing ? "animate-spin" : ""}`} />
            {probing ? "Probing..." : "Re-probe"}
          </button>
        </div>
        <p className="text-sm text-zinc-400">Local only — Ollama and LM Studio need no accounts, keys, or cloud calls.</p>
        {probed && providers.length === 0 && (
          <p className="text-sm text-yellow-400">No providers answered. Start Ollama (<code>ollama serve</code>) or LM Studio.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {providers.map((p) => (
            <div
              key={p.id}
              data-testid={`llm-provider-card-${p.id}`}
              className={`border rounded-xl p-3 space-y-2 ${selectedProvider === p.id ? "border-amber-600" : "border-zinc-800"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.detected ? "bg-green-500" : "bg-zinc-600"}`} />
                <p className="font-medium text-zinc-100">{p.name}</p>
                <span className="text-sm text-zinc-400">· free/local</span>
              </div>
              <p className="text-sm text-zinc-400">{p.models.length} model(s) available</p>
              <button
                onClick={() => select(p.id, p.models[0] ?? "")}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
                data-testid={`llm-key-${p.id}`}
              >
                Use {p.id}
              </button>
            </div>
          ))}
        </div>
        {active && models.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="llm-model" className="text-sm text-zinc-300">Model:</label>
            <select
              id="llm-model"
              value={selectedModel}
              onChange={(e) => select(selectedProvider, e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100"
              data-testid="llm-model-select"
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button onClick={() => void probe()} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm" data-testid="llm-test">
              Test
            </button>
          </div>
        )}
        {gpuPresent && (
          <p className="text-sm text-zinc-300" data-testid="gpu-prompt">
            GPU detected ({gpuDetail || "NVIDIA"}) but no local LLM running? Install Ollama to use it —{" "}
            <code className="text-amber-400">winget install Ollama.Ollama</code>
          </p>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4" data-testid="settings-paths">
        <h3 className="text-sm font-medium text-zinc-300">Common scan paths</h3>
        <div className="flex flex-wrap gap-2">
          {DRIVE_SUGGESTIONS.map((drive) => (
            <div key={drive} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-zinc-300">
              <HardDrive className="h-3.5 w-3.5 text-amber-500" />
              {drive}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2" data-testid="settings-tools">
        <h3 className="text-sm font-medium text-zinc-300">Tools used</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li><strong className="text-zinc-200">dua-cli</strong> - Fast disk usage analyzer (Rust)</li>
          <li><strong className="text-zinc-200">czkawka_cli</strong> - Duplicate file detector (Rust)</li>
          <li><strong className="text-zinc-200">FastMCP 3.4</strong> - MCP protocol server</li>
          <li><strong className="text-zinc-200">FastAPI</strong> - REST backend + Swagger docs</li>
        </ul>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2" data-testid="settings-ports">
        <h3 className="text-sm font-medium text-zinc-300">Ports</h3>
        <p className="text-sm text-zinc-400">REST API: <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded">11114</code></p>
        <p className="text-sm text-zinc-400">Frontend dev: <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded">11115</code></p>
      </div>
    </div>
  );
}
