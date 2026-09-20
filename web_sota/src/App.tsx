import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Drives from "./pages/Drives";
import Duplicates from "./pages/Duplicates";
import Inbox from "./pages/Inbox";
import Tools from "./pages/Tools";
import Skills from "./pages/Skills";
import Chat from "./pages/Chat";
import Logs from "./pages/Logs";
import Apps from "./pages/Apps";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/drives" element={<Drives />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/apps" element={<Apps />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </AppLayout>
  );
}
