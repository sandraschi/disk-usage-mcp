import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";
import { getSetupStatus, type SetupStatus } from "../lib/api";

const DONE_KEY = "disk-onboarded-done";

export function OnboardingCue() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DONE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    getSetupStatus().then(setSetup).catch(() => {});
  }, []);

  if (!setup || dismissed) return null;
  if (setup.ready) {
    return null;
  }

  const missing = Object.entries(setup.binaries)
    .filter(([, b]) => !b.found)
    .map(([name, b]) => `${name} (${b.install})`);

  return (
    <div data-testid="onboarding-cue" className="rounded-xl border border-red-800 bg-red-950/60 p-4 flex items-center gap-4">
      <Rocket className="h-6 w-6 text-red-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-red-200">Setup required — scanners not found</p>
        <p className="text-sm text-red-300/80">Missing: {missing.join(" · ")}. Install them, then re-check.</p>
      </div>
      <button
        onClick={() => navigate("/help")}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold text-white"
      >
        Open onboarding guide
      </button>
      <button
        onClick={() => {
          try {
            localStorage.setItem(DONE_KEY, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="text-sm text-red-300/70 hover:text-red-200 underline"
      >
        Dismiss
      </button>
    </div>
  );
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}
