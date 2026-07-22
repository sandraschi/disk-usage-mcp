import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Copy, Scan, Database } from "lucide-react";
import { getHealth, type HealthResponse, listSnapshots, type SnapshotInfo } from "../lib/api";

function KpiCard({ icon: Icon, label, value, testid }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  testid: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
      data-testid={testid}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-xl font-semibold text-zinc-100">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
    listSnapshots().then((r) => setSnapshots(r.snapshots)).catch(() => {});
  }, []);

  const lastSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return (
    <div data-testid="dashboard" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={HardDrive} label="Status" value={health?.status ?? "..."} testid="kpi-server" />
        <KpiCard icon={Scan} label="Tools" value={String(health?.tool_count ?? "-")} testid="kpi-tools" />
        <KpiCard icon={Database} label="Snapshots" value={String(snapshots.length)} testid="kpi-provider" />
        <KpiCard icon={Copy} label="Version" value={health?.version ?? "-"} testid="kpi-version" />
      </div>

      {lastSnapshot && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Latest Snapshot</h3>
          <p className="text-zinc-200">{lastSnapshot.label || lastSnapshot.file}</p>
          <p className="text-xs text-zinc-500">{lastSnapshot.timestamp}</p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Quick Start</h3>
        <p className="text-zinc-400 text-sm">
          Use the <strong>Drives</strong> page to scan your drives, the <strong>Duplicates</strong>
          page to find redundant files, and take snapshots to track usage over time.
        </p>
      </div>
    </div>
  );
}
