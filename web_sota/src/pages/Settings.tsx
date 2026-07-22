import { HardDrive } from "lucide-react";

const DRIVE_SUGGESTIONS = [
  "D:\\Media",
  "E:\\Backup1",
  "F:\\Backup2",
  "G:\\Backup3",
];

export default function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Settings</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-zinc-400">Common Scan Paths</h3>
        <div className="flex flex-wrap gap-2">
          {DRIVE_SUGGESTIONS.map((drive) => (
            <div
              key={drive}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-zinc-300"
            >
              <HardDrive className="h-3.5 w-3.5 text-amber-500" />
              {drive}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-zinc-400">Tools Used</h3>
        <ul className="text-sm text-zinc-500 space-y-1">
          <li><strong className="text-zinc-300">dua-cli</strong> — Fast disk usage analyzer (Rust)</li>
          <li><strong className="text-zinc-300">czkawka_cli</strong> — Duplicate file detector (Rust)</li>
          <li><strong className="text-zinc-300">FastMCP 3.4</strong> — MCP protocol server</li>
          <li><strong className="text-zinc-300">FastAPI</strong> — REST backend + Swagger docs</li>
        </ul>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-medium text-zinc-400">Backend Port</h3>
        <p className="text-sm text-zinc-500">REST API: <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded">11114</code></p>
        <p className="text-sm text-zinc-500">Frontend dev: <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded">11115</code></p>
      </div>
    </div>
  );
}
