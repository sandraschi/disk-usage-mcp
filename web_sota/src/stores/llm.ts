import { create } from "zustand";
import { type LlmProvider, llmProviders } from "../lib/api";

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = "llm_model";

interface LlmState {
  providers: LlmProvider[];
  gpuPresent: boolean;
  gpuDetail: string;
  selectedProvider: string;
  selectedModel: string;
  probing: boolean;
  probed: boolean;
  probe: () => Promise<void>;
  setProviders: (providers: LlmProvider[]) => void;
  setGpuDetected: (present: boolean, detail: string) => void;
  select: (provider: string, model: string) => void;
}

function stored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export const useLlmStore = create<LlmState>((set) => ({
  providers: [],
  gpuPresent: false,
  gpuDetail: "",
  selectedProvider: stored(PROVIDER_KEY, "ollama"),
  selectedModel: stored(MODEL_KEY, ""),
  probing: false,
  probed: false,
  probe: async () => {
    set({ probing: true });
    try {
      const data = await llmProviders();
      set({
        providers: data.providers,
        gpuPresent: data.gpu.present,
        gpuDetail: data.gpu.detail,
        probed: true,
      });
      const current = useLlmStore.getState();
      const active = data.providers.find((p) => p.id === current.selectedProvider) ?? data.providers[0];
      if (active && !current.selectedModel) {
        current.select(active.id, active.models[0] ?? "");
      }
    } catch {
      set({ probed: true });
    } finally {
      set({ probing: false });
    }
  },
  setProviders: (providers) => set({ providers }),
  setGpuDetected: (present, detail) => set({ gpuPresent: present, gpuDetail: detail }),
  select: (provider, model) => {
    try {
      localStorage.setItem(PROVIDER_KEY, provider);
      localStorage.setItem(MODEL_KEY, model);
    } catch {
      /* storage unavailable */
    }
    set({ selectedProvider: provider, selectedModel: model });
  },
}));
