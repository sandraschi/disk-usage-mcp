import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Apps from "./pages/Apps";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Drives from "./pages/Drives";
import Duplicates from "./pages/Duplicates";
import Help from "./pages/Help";
import Inbox from "./pages/Inbox";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Skills from "./pages/Skills";
import Tools from "./pages/Tools";

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
