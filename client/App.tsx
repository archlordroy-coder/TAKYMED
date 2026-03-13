import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Prescription from "./pages/Prescription";
import Dashboard from "./pages/Dashboard";
import SearchMedications from "./pages/SearchMedications";
import PharmacyManagement from "./pages/PharmacyManagement";
import InteractionsManagement from "./pages/InteractionsManagement";
import Ads from "./pages/Ads";
import Upgrade from "./pages/Upgrade";

import { AdminLayout } from "@/components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Admin Routes with Sidebar Layout */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Standard Routes with Header Layout */}
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Auth mode="login" />} />
                    <Route path="/register" element={<Auth mode="register" />} />

                    <Route path="/prescription" element={<ProtectedRoute><Prescription /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/search" element={<ProtectedRoute><SearchMedications /></ProtectedRoute>} />
                    <Route path="/pharmacy-mgmt" element={<ProtectedRoute><PharmacyManagement /></ProtectedRoute>} />
                    <Route path="/interactions-mgmt" element={<ProtectedRoute><InteractionsManagement /></ProtectedRoute>} />
                    <Route path="/ads" element={<ProtectedRoute><Ads /></ProtectedRoute>} />
                    <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
