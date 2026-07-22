const API_BASE = "";

export interface HealthResponse {
  status: string;
  server: string;
  version: string;
  tool_count: number;
  snapshots_dir: string;
}

export interface DiagnosticsResponse {
  status: string;
  server: string;
  version: string;
  tool_count: number;
  tools: { name: string }[];
  system: Record<string, unknown>;
  errors: string[];
  snapshots: number;
}

export interface DriveData {
  path: string;
  size_bytes: number;
  error?: string;
}

export interface ScanResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface DuplicateFile {
  hash?: string;
  size_mb: number;
  files: string[];
}

export interface DuplicateResponse {
  success: boolean;
  files: DuplicateFile[];
  total_size_mb?: number;
  message?: string;
  error?: string;
}

export interface LargeFilesResponse {
  success: boolean;
  entries?: string;
  path?: string;
  message?: string;
  error?: string;
}

export interface SnapshotInfo {
  file: string;
  timestamp: string;
  label: string;
  paths: string[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}

export function getDiagnostics(): Promise<DiagnosticsResponse> {
  return apiFetch<DiagnosticsResponse>("/api/v1/diagnostics");
}

export function scanPath(path: string, maxDepth = 3): Promise<ScanResponse> {
  return apiFetch<ScanResponse>("/api/scan", {
    method: "POST",
    body: JSON.stringify({ path, max_depth: maxDepth }),
  });
}

export function findDuplicates(paths: string[], minSizeMb = 100): Promise<DuplicateResponse> {
  return apiFetch<DuplicateResponse>("/api/duplicates", {
    method: "POST",
    body: JSON.stringify({ paths, min_size_mb: minSizeMb }),
  });
}

export function findLargeFiles(path: string, minSizeGb = 1.0, limit = 50): Promise<LargeFilesResponse> {
  return apiFetch<LargeFilesResponse>("/api/large-files", {
    method: "POST",
    body: JSON.stringify({ path, min_size_gb: minSizeGb, limit }),
  });
}

export function takeSnapshot(paths: string[], label = ""): Promise<{ success: boolean; snapshot_file: string; drives: number }> {
  return apiFetch("/api/snapshot/take", {
    method: "POST",
    body: JSON.stringify({ paths, label }),
  });
}

export function listSnapshots(): Promise<{ snapshots: SnapshotInfo[] }> {
  return apiFetch("/api/snapshots");
}

export function getSnapshot(filename: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/snapshot/${filename}`);
}
