import { motion } from "framer-motion";
import { Copy, Database, HardDrive, Scan } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OnboardingCue } from "../components/OnboardingCue";
import { getSetupStatus, getStatus, listSnapshots, type SnapshotInfo, type StatusResponse } from "../lib/api";

function MockBadge() {
  return (
    <span
      className="ml-1 px-1.5 py-0.5 bg-yellow-600/30 text-yellow-300 rounded text-sm font-normal"
      data-testid="mock-badge"
    >
      MOCK
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  testid,
  mock,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  testid: string;
  mock?: boolean;
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
          <p className="text-sm text-zinc-300">
            {label}
            {mock && <MockBadge />}
          </p>
          <p className="text-xl font-semibold text-zinc-100">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Backend offline"));
    listSnapshots()
      .then((r) => setSnapshots(r.snapshots))
      .catch(() => {});
    getSetupStatus()
      .then((s) => setReady(s.ready))
      .catch(() => setReady(null));
  }, []);

  const lastSnapshot = snapshots.length > 0 ? snapshots[0] : null;
  const showMock = ready === false;

  return (
    <div data-testid="dashboard" className="space-y-6">
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2" data-testid="dashboard-hero">
        <h2 className="text-2xl font-bold text-zinc-100">Disk Usage — reclaim space across every drive</h2>
        <p className="text-sm text-zinc-300">
          {status ? `Backend ${status.status} · v${status.version} · ${status.tool_count} tools` : "Probing backend..."}
          {error && <span className="text-red-400"> — {error}</span>}
        </p>
        <p className="text-sm text-zinc-300">
          Quick start:{" "}
          <Link to="/drives" className="text-amber-400 hover:underline">
            scan a drive
          </Link>{" "}
          →{" "}
          <Link to="/duplicates" className="text-amber-400 hover:underline">
            hunt duplicates
          </Link>{" "}
          →{" "}
          <Link to="/inbox" className="text-amber-400 hover:underline">
            snapshot it
          </Link>
          . Chat answers run on your local LLM.
        </p>
      </section>

      <OnboardingCue />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={HardDrive}
          label="Status"
          value={status?.status ?? (showMock ? "ok" : "...")}
          testid="kpi-server"
          mock={showMock && !status}
        />
        <KpiCard
          icon={Scan}
          label="Tools"
          value={status ? String(status.tool_count) : showMock ? "9" : "-"}
          testid="kpi-tools"
          mock={showMock && !status}
        />
        <KpiCard icon={Database} label="Snapshots" value={String(snapshots.length)} testid="kpi-snapshots" />
        <KpiCard
          icon={Copy}
          label="Version"
          value={status?.version ?? (showMock ? "0.1.0" : "-")}
          testid="kpi-version"
          mock={showMock && !status}
        />
      </div>

      {lastSnapshot && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="latest-snapshot">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Latest snapshot</h3>
          <p className="text-zinc-100">{lastSnapshot.label || lastSnapshot.file}</p>
          <p className="text-sm text-zinc-400">{lastSnapshot.timestamp}</p>
        </div>
      )}
    </div>
  );
}
