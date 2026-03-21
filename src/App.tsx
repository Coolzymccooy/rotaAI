import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { RotaBoard } from './pages/RotaBoard';
import { RulesStudio } from './pages/RulesStudio';
import { WorkforceManager } from './pages/WorkforceManager';
import { LiveMap } from './pages/LiveMap';
import { LandingPage } from './pages/LandingPage';
import { ToastProvider } from './components/ui/Toast';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="rota" element={<RotaBoard />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="rules" element={<RulesStudio />} />
            <Route path="workforce" element={<WorkforceManager />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
