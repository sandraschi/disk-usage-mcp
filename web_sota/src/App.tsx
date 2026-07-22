import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Drives from "./pages/Drives";
import Duplicates from "./pages/Duplicates";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/drives" element={<Drives />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppLayout>
  );
}
