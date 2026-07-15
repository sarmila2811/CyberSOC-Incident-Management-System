import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";

// AUTH
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ProtectedRoute from "./auth/ProtectedRoute";

// PAGES
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentDetails from "./pages/IncidentDetails";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import MyIncidents from "./pages/MyIncidents";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import ReportIncident from "./pages/ReportIncident";
import OtpLogin from "./pages/OtpLogin";
import ApprovalQueue from "./pages/ApprovalQueue";
import AnalystPerformance from "./pages/AnalystPerformance";
import Settings from "./pages/Settings";
import ResolvedIncidents from "./pages/ResolvedIncidents";
import Notifications from "./pages/Notifications";
import EmployeeManagement from "./pages/EmployeeManagement";
import EmployeeDetails from "./pages/EmployeeDetails";
import SystemActivity from "./pages/SystemActivity";
import ChangePassword from "./pages/ChangePassword";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* 🔐 AUTH ROUTES */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/otp" element={<OtpLogin />} />
              <Route path="/change-password" element={<ChangePassword />} />

              {/* 🔐 DEFAULT REDIRECT */}
              <Route path="/" element={<Navigate to="/dashboard" />} />

              {/* 🔐 PROTECTED SOC ROUTES */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <Incidents />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/incidents/:id"
                element={
                  <ProtectedRoute>
                    <IncidentDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-incidents"
                element={
                  <ProtectedRoute>
                    <MyIncidents />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <Alerts />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees"
                element={
                  <ProtectedRoute>
                    <EmployeeManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees/:id"
                element={
                  <ProtectedRoute>
                    <EmployeeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <ReportIncident />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/approval-queue"
                element={
                  <ProtectedRoute>
                    <ApprovalQueue />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analyst-performance"
                element={
                  <ProtectedRoute>
                    <AnalystPerformance />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/resolved-incidents"
                element={
                  <ProtectedRoute>
                    <ResolvedIncidents />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <SystemActivity />
                  </ProtectedRoute>
                }
              />

              {/* ❌ 404 CATCH-ALL */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;