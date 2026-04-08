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
import Welcome from "@/pages/Welcome";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import FinancialTracker from "@/pages/FinancialTracker";
import Tutorial from "@/pages/Tutorial";
import Professionals from "@/pages/Professionals";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import InviteResponse from "@/pages/InviteResponse";
import PlatformInviteResponse from "@/pages/PlatformInviteResponse";
import Admin from "@/pages/Admin";
import Agenda from "@/pages/Agenda";
import FreelancerProfile from "@/pages/FreelancerProfile";
import UpgradeScreen from "@/pages/UpgradeScreen";
import PublicProfile from "@/pages/PublicProfile";
import Legal from "@/pages/Legal";
import MusicDNA from "@/pages/MusicDNA";

const queryClient = new QueryClient();

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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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
                <Routes>
                  <Route path="/" element={<Welcome />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/invite/:token" element={<InviteResponse />} />
                  <Route path="/platform-invite/:token" element={<PlatformInviteResponse />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/*" element={<AppRoutes />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ProjectProvider>
        </ProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
