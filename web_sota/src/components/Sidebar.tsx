import { NavLink } from "react-router-dom";
import { LayoutDashboard, HardDrive, Copy, Settings, ChevronLeft, ChevronRight, Monitor } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/drives", icon: HardDrive, label: "Drives" },
  { to: "/duplicates", icon: Copy, label: "Duplicates" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
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
