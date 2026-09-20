const API_BASE = "";

export interface HealthResponse {
  status: string;
  server: string;
  version: string;
  tool_count: number;
  snapshots_dir?: string;
}

export interface StatusResponse extends HealthResponse {
  uptime_seconds: number;
  snapshots: number;
}

export interface ToolDef {
  name: string;
  description: string;
}

export interface CapabilitiesResponse {
  server: string;
  version: string;
  tools: ToolDef[];
  features: string[];
  endpoints: string[];
}

export interface SkillRef {
  name: string;
  uri: string;
}

export interface DriveData {
  path: string;
  size_bytes: number;
  error?: string;
}

export interface ScanResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  output?: string;
  error?: string;
}

export interface DuplicateFile {
  hash?: string;
  size_mb: number;
  files: string[];
}

export interface DuplicateResponse {
  success: boolean;
  message?: string;
  duplicates: DuplicateFile[];
  error?: string;
}

export interface LargeFileEntry {
  path: string;
  size_gb: number;
}

export interface LargeFilesResponse {
  success: boolean;
  message?: string;
  files: LargeFileEntry[];
  error?: string;
}

export interface SnapshotInfo {
  file: string;
  timestamp: string;
  label: string;
  paths: string[];
}

export interface SnapshotDelta {
  path: string;
  before_bytes: number;
  after_bytes: number;
  delta_bytes: number;
  delta_gb: number;
}

export interface SnapshotDiff {
  success: boolean;
  message?: string;
  from?: string;
  to?: string;
  total_delta_bytes?: number;
  total_delta_gb?: number;
  deltas?: SnapshotDelta[];
  error?: string;
}

export interface LogEntry {
  ts: string;
  level: string;
  logger: string;
  message: string;
}

export interface BinaryInfo {
  found: boolean;
  path: string;
  install: string;
}

export interface SetupStatus {
  ready: boolean;
  message: string;
  binaries: Record<string, BinaryInfo>;
}

export interface FleetApp {
  port: number;
  repo: string;
  description: string;
  live?: boolean;
}

export interface LlmProvider {
  id: string;
  name: string;
  kind: string;
  free: boolean;
  detected: boolean;
  models: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}

export function getStatus(): Promise<StatusResponse> {
  return apiFetch<StatusResponse>("/api/status");
}

export function getCapabilities(): Promise<CapabilitiesResponse> {
  return apiFetch<CapabilitiesResponse>("/api/capabilities");
}

export function getDiagnostics(): Promise<StatusResponse> {
  return apiFetch<StatusResponse>("/api/v1/diagnostics");
}

export function listSkills(): Promise<{ skills: SkillRef[] }> {
  return apiFetch("/api/skills");
}

export function getSkillContent(
  name: string,
): Promise<{ success: boolean; name?: string; content?: string; error?: string }> {
  return apiFetch(`/api/skills/${encodeURIComponent(name)}`);
}

export function getLogs(level = "", q = "", limit = 200): Promise<{ logs: LogEntry[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (level) params.set("level", level);
  if (q) params.set("q", q);
  return apiFetch(`/api/logs?${params.toString()}`);
}

export function getSetupStatus(): Promise<SetupStatus> {
  return apiFetch("/api/setup/status");
}

export function getFleetApps(probe = false): Promise<{ apps: FleetApp[]; source: string; probed: boolean }> {
  return apiFetch(`/api/fleet/apps${probe ? "?probe=true" : ""}`);
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

export function takeSnapshot(
  paths: string[],
  label = "",
): Promise<{ success: boolean; snapshot_file: string; drives: number }> {
  return apiFetch("/api/snapshot/take", {
    method: "POST",
    body: JSON.stringify({ paths, label }),
  });
}

export function listSnapshots(): Promise<{ snapshots: SnapshotInfo[] }> {
  return apiFetch("/api/snapshots");
}

export function getSnapshot(filename: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/snapshot/${encodeURIComponent(filename)}`);
}

export function deleteSnapshot(filename: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return apiFetch(`/api/snapshot/${encodeURIComponent(filename)}`, { method: "DELETE" });
}

export function diffSnapshots(from: string, to: string): Promise<SnapshotDiff> {
  const params = new URLSearchParams({ from, to });
  return apiFetch(`/api/snapshot/diff?${params.toString()}`);
}

export interface LlmDiscover {
  ollama: { available: boolean; models: string[] };
  lmstudio: { available: boolean; models: string[] };
  gpu: { present: boolean; detail: string };
}

export function llmDiscover(): Promise<LlmDiscover> {
  return apiFetch("/api/llm/discover");
}

export function llmProviders(): Promise<{
  providers: LlmProvider[];
  gpu: { present: boolean; detail: string };
  note: string;
}> {
  return apiFetch("/api/llm/providers");
}

export function llmModels(provider: string): Promise<{ provider: string; models: string[]; available: boolean }> {
  return apiFetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`);
}

export function llmChat(
  provider: string,
  model: string,
  messages: ChatMessage[],
  system = "",
): Promise<{ success: boolean; reply?: string; provider?: string; model?: string; error?: string }> {
  return apiFetch("/api/llm/chat", {
    method: "POST",
    body: JSON.stringify({ provider, model, messages, system }),
  });
}

export async function* llmChatStream(
  provider: string,
  model: string,
  messages: ChatMessage[],
  system = "",
  signal?: AbortSignal,
): AsyncGenerator<string, void, void> {
  const res = await fetch(`${API_BASE}/api/llm/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, model, messages, system }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream ${res.status}: ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as { delta?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.delta) yield parsed.delta;
      } catch (e) {
        if (e instanceof Error && e.message !== payload) throw e;
      }
    }
  }
}
