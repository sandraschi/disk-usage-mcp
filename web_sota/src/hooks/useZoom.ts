import { useCallback, useEffect, useState } from "react";

export const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0];
const STORAGE_KEY = "tauri-zoom";

function loadZoom(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : 1.0;
    return ZOOM_LEVELS.includes(value) ? value : 1.0;
  } catch {
    return 1.0;
  }
}

function applyZoom(level: number) {
  const root = document.getElementById("root");
  if (root) {
    (root.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(level);
  }
}

export function useZoom() {
  const [zoom, setZoom] = useState<number>(loadZoom);

  useEffect(() => {
    applyZoom(zoom);
    try {
      localStorage.setItem(STORAGE_KEY, String(zoom));
    } catch {
      /* storage unavailable */
    }
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)]);
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)]);
  }, []);

  useEffect(() => {
    const onZoom = (e: Event) => {
      const dir = (e as CustomEvent<string>).detail;
      if (dir === "in") zoomIn();
      else if (dir === "out") zoomOut();
    };
    window.addEventListener("app-zoom", onZoom);
    return () => window.removeEventListener("app-zoom", onZoom);
  }, [zoomIn, zoomOut]);

  const reset = useCallback(() => setZoom(1.0), []);

  return { zoom, zoomIn, zoomOut, reset };
}
