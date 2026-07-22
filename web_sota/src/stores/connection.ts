import { create } from "zustand";
import { getHealth, type HealthResponse } from "../lib/api";

interface ConnectionState {
  backendOk: boolean | null;
  health: HealthResponse | null;
  lastCheck: number | null;
  check: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  backendOk: null,
  health: null,
  lastCheck: null,
  check: async () => {
    try {
      const health = await getHealth();
      set({ backendOk: true, health, lastCheck: Date.now() });
    } catch {
      set({ backendOk: false, health: null, lastCheck: Date.now() });
    }
  },
}));
