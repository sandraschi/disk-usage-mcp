import { CircleHelp, X } from "lucide-react";
import { Link } from "react-router-dom";

const LINKS: { page: string; to: string; docs: string }[] = [
  { page: "Dashboard", to: "/dashboard", docs: "docs/TOOLS.md#dashboard" },
  { page: "Drives", to: "/drives", docs: "docs/TOOLS.md#scan" },
  { page: "Duplicates", to: "/duplicates", docs: "docs/TOOLS.md#duplicates" },
  { page: "Snapshots (Inbox)", to: "/inbox", docs: "docs/CONFIGURATION.md#snapshots" },
  { page: "Tools", to: "/tools", docs: "docs/TOOLS.md" },
  { page: "Skills", to: "/skills", docs: "docs/CONFIGURATION.md#skills" },
  { page: "Chat", to: "/chat", docs: "docs/TROUBLESHOOTING.md#chat" },
  { page: "Logs", to: "/logs", docs: "docs/TROUBLESHOOTING.md#logs" },
  { page: "Apps", to: "/apps", docs: "docs/CONFIGURATION.md#fleet" },
  { page: "Settings", to: "/settings", docs: "docs/CONFIGURATION.md" },
  { page: "Help", to: "/help", docs: "docs/README.md" },
];

export function HelpModal({ open, onClose, context }: { open: boolean; onClose: () => void; context: string }) {
  if (!open) return null;
  const relevant = LINKS.filter((l) => l.page.toLowerCase().includes(context.toLowerCase()));
  const shown = relevant.length > 0 ? relevant : LINKS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-testid="help-modal">
      <div className="w-[560px] max-w-[95vw] max-h-[85vh] overflow-auto bg-zinc-900 border border-zinc-700 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <CircleHelp className="h-4 w-4 text-amber-500" /> Help
            {context && <span className="text-sm font-normal text-zinc-400">— {context}</span>}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400" aria-label="Close help">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="p-4 space-y-2">
          {shown.map((l) => (
            <li key={l.to} className="flex items-center justify-between text-sm">
              <Link to={l.to} onClick={onClose} className="text-amber-400 hover:underline">{l.page}</Link>
              <code className="text-zinc-500">{l.docs}</code>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-4 text-sm text-zinc-400">
          Full docs live in <code className="text-zinc-300">docs/</code> next to the repo root — start with{" "}
          <code className="text-zinc-300">docs/ONBOARDING.md</code>.
        </p>
      </div>
    </div>
  );
}
