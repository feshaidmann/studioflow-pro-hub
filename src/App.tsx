import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

import AppLayout from "@/components/AppLayout";
import FeedbackButton from "@/components/FeedbackButton";

// Eager-load the landing & auth pages (critical path)
import Welcome from "@/pages/Welcome";
import Auth from "@/pages/Auth";

// Lazy-load everything else to reduce initial bundle
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const FinancialTracker = lazy(() => import("@/pages/FinancialTracker"));
const Tutorial = lazy(() => import("@/pages/Tutorial"));
const Professionals = lazy(() => import("@/pages/Professionals"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const InviteResponse = lazy(() => import("@/pages/InviteResponse"));

const Admin = lazy(() => import("@/pages/Admin"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const FreelancerProfile = lazy(() => import("@/pages/FreelancerProfile"));
const UpgradeScreen = lazy(() => import("@/pages/UpgradeScreen"));
const PublicProfile = lazy(() => import("@/pages/PublicProfile"));
const Legal = lazy(() => import("@/pages/Legal"));
const MusicDNA = lazy(() => import("@/pages/MusicDNA"));
const Editais = lazy(() => import("@/pages/Editais"));

const queryClient = new QueryClient(); // singleton

const LazyFallback = () => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">{t("misc.loading")}</div>
    </div>
  );
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { needsProfileSetup, loading: profileLoading } = useProfile();
  const { t } = useLanguage();
  if (loading || profileLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">{t("misc.loading")}</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsProfileSetup) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <ProtectedRoute>
    <AppLayout>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/master" element={<Navigate to="/projects" replace />} />
          <Route path="/finance" element={<FinancialTracker />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/professionals" element={<Professionals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/perfil" element={<FreelancerProfile />} />
          <Route path="/upgrade" element={<UpgradeScreen />} />
          <Route path="/music-dna" element={<MusicDNA />} />
          <Route path="/editais" element={<Editais />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
    <FeedbackButton />
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <ProfileProvider>
          <ProjectProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Carregando…</div></div>}>
                  <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/u/:username" element={<PublicProfile />} />
                    <Route path="/invite/:token" element={<InviteResponse />} />
                    
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/*" element={<AppRoutes />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ProjectProvider>
        </ProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
