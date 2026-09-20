import { NavLink } from "react-router-dom";import {
  BookOpen,
  CircleHelp,
  Copy,
  HardDrive,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/drives", icon: HardDrive, label: "Drives" },
  { to: "/duplicates", icon: Copy, label: "Duplicates" },
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/skills", icon: BookOpen, label: "Skills" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
  { to: "/apps", icon: LayoutGrid, label: "Apps" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/help", icon: CircleHelp, label: "Help" },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={`flex flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2 text-amber-500 font-semibold">
            <Monitor className="h-5 w-5" />
            <span>Disk Usage</span>
          </div>
        )}
        {collapsed && <Monitor className="h-5 w-5 text-amber-500 mx-auto" />}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
              }`
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
