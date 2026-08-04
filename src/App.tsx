import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { PageHeader } from "./components/PageHeader";
import { DevPanel } from "./components/DevPanel";
import { ToolRequestPage } from "./pages/ToolRequestPage";
import { SuccessPage } from "./pages/SuccessPage";
import { HistoryPage } from "./pages/HistoryPage";

function AppContent() {
  return (
    <>
      <PageHeader />
      <Routes>
        <Route path="/tool-request" element={<ToolRequestPage />} />
        <Route path="/tool-request/success" element={<SuccessPage />} />
        <Route path="/tool-request/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/tool-request" replace />} />
      </Routes>
      <footer>
        <b>XMODhub</b>
        <span>Tools built around the games you love.</span>
      </footer>
      <DevPanel />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
