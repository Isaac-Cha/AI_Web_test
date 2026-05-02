import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";
import Home from "@/pages/Home";
import Apple from "@/pages/Apple";
import Hybrid from "@/pages/Hybrid";
import EADetail from "@/pages/EADetail";
import IndicatorDetail from "@/pages/IndicatorDetail";
import EAList from "@/pages/EAList";
import IndicatorsList from "@/pages/IndicatorsList";
import TutorialsList from "@/pages/TutorialsList";

// Admin
import AdminLayout from "@/admin/AdminLayout";
import Login from "@/admin/Login";
import Dashboard from "@/admin/Dashboard";
import SubmissionsManager from "@/admin/SubmissionsManager";
import EAManager from "@/admin/EAManager";
import IndicatorManager from "@/admin/IndicatorManager";
import TutorialManager from "@/admin/TutorialManager";

import { Toaster } from "@/components/ui/sonner";
import CustomCursor from "@/components/CustomCursor";
import MouseTrail from "@/components/MouseTrail";
import FloatingWechat from "@/components/FloatingWechat";

function App() {
  return (
    <LanguageProvider>
      <div className="App min-h-screen">
        <BrowserRouter>
          <MouseTrail />
          <CustomCursor />
          <Routes>
            {/* Admin */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="submissions" element={<SubmissionsManager />} />
              <Route path="eas" element={<EAManager />} />
              <Route path="indicators" element={<IndicatorManager />} />
              <Route path="tutorials" element={<TutorialManager />} />
            </Route>

            {/* Sci-Fi (default) */}
            <Route path="/" element={<Home />} />
            <Route path="/ea" element={<EAList />} />
            <Route path="/ea/:id" element={<EADetail />} />
            <Route path="/indicators" element={<IndicatorsList />} />
            <Route path="/indicator/:id" element={<IndicatorDetail />} />
            <Route path="/tutorials" element={<TutorialsList />} />

            {/* Apple */}
            <Route path="/apple" element={<Apple />} />
            <Route path="/apple/ea" element={<EAList />} />
            <Route path="/apple/ea/:id" element={<EADetail />} />
            <Route path="/apple/indicators" element={<IndicatorsList />} />
            <Route path="/apple/indicator/:id" element={<IndicatorDetail />} />
            <Route path="/apple/tutorials" element={<TutorialsList />} />

            {/* Hybrid */}
            <Route path="/hybrid" element={<Hybrid />} />
            <Route path="/hybrid/ea" element={<EAList />} />
            <Route path="/hybrid/ea/:id" element={<EADetail />} />
            <Route path="/hybrid/indicators" element={<IndicatorsList />} />
            <Route path="/hybrid/indicator/:id" element={<IndicatorDetail />} />
            <Route path="/hybrid/tutorials" element={<TutorialsList />} />
          </Routes>
          <FloatingWechat />
          <Toaster position="top-center" theme="dark" />
        </BrowserRouter>
      </div>
    </LanguageProvider>
  );
}

export default App;
