import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { RotaBoard } from './pages/RotaBoard';
import { RulesStudio } from './pages/RulesStudio';
import { WorkforceManager } from './pages/WorkforceManager';
import { LiveMap } from './pages/LiveMap';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuditLog } from './pages/AuditLog';
import { BulkImport } from './pages/BulkImport';
import { Settings } from './pages/Settings';
import { Integrations } from './pages/Integrations';
import { Team } from './pages/Team';
import { RotaPlanning } from './pages/RotaPlanning';
import { MyPortal } from './pages/MyPortal';
import { RequestReview } from './pages/RequestReview';
import { Compliance } from './pages/Compliance';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="rota" element={<RotaBoard />} />
                  <Route path="map" element={<LiveMap />} />
                  <Route path="rules" element={<RulesStudio />} />
                  <Route path="workforce" element={<WorkforceManager />} />
                  <Route path="audit" element={<AuditLog />} />
                  <Route path="import" element={<BulkImport />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="team" element={<Team />} />
                  <Route path="planning" element={<RotaPlanning />} />
                  <Route path="portal" element={<MyPortal />} />
                  <Route path="requests" element={<RequestReview />} />
                  <Route path="compliance" element={<Compliance />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
