import { useState } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FolderKanban,
  DollarSign,
  LogOut,
  Menu,
  X,
  Users,
  Settings,
  Shield,
  CalendarDays,
  Lock,
  FileText,
  ChevronLeft,
  Dna,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import NotificationsBell from "@/components/NotificationsPanel";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useProfile } from "@/contexts/ProfileContext";
import { useProjects } from "@/contexts/ProjectContext";

const principalItems = [
  { labelKey: "nav.home",     path: "/dashboard", icon: Home,         proOnly: false, mobileLabel: "" },
  { labelKey: "nav.projects", path: "/projects",  icon: FolderKanban, proOnly: false, mobileLabel: "" },
];

const gestaoItems = [
  { labelKey: "nav.finance",       path: "/finance",       icon: DollarSign,   proOnly: false, mobileLabel: "" },
  { labelKey: "nav.agenda",        path: "/agenda",        icon: CalendarDays, proOnly: false, mobileLabel: "" },
  { labelKey: "nav.musicdna",      path: "/music-dna",     icon: Dna,          proOnly: false, mobileLabel: "nav.musicdna.short" },
  { labelKey: "nav.editais",      path: "/editais",       icon: FileText,     proOnly: false, mobileLabel: "" },
  { labelKey: "nav.professionals", path: "/professionals", icon: Users,        proOnly: false, mobileLabel: "" },
  { labelKey: "nav.tutorial",      path: "/tutorial",      icon: BookOpen,     proOnly: false, mobileLabel: "" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  usePageTracking();
  const isMobile = useIsMobile();
  const SIDEBAR_KEY = "sfp_sidebar_open";
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved === null ? true : saved === "true";
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { isPro, displayName } = useProfile();
  const { projects } = useProjects();

  const activeProjects = projects.filter((p) => !p.completed).length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleToggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem("sfp_sidebar_open", String(next));
  };

  const adminNavItem = { labelKey: "nav.admin", path: "/admin", icon: Shield, proOnly: false, mobileLabel: "" };
  const settingsNavItem = { labelKey: "nav.settings", path: "/settings", icon: Settings, proOnly: false, mobileLabel: "nav.settings.short" };

  const primaryMobileItems = [
    ...principalItems,
    gestaoItems[0],
    gestaoItems[1],
    gestaoItems[2],
    settingsNavItem,
  ];

  const getNavTo = (item: { path: string; proOnly: boolean }) => {
    if (item.proOnly && !isPro) {
      const key = item.path.replace("/", "");
      return `/upgrade?feature=${key}`;
    }
    return item.path;
  };

  const isItemActive = (item: { path: string; proOnly: boolean }) => {
    if (item.proOnly && !isPro) return false;
    return location.pathname === item.path;
  };

  const ROOT_ROUTES = ["/dashboard", "/projects", "/finance", "/agenda", "/professionals", "/settings", "/admin", "/tutorial", "/music-dna", "/editais", "/"];
  const isRootRoute = ROOT_ROUTES.includes(location.pathname);

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border/60 bg-background/70 backdrop-blur-xl px-4">
          <div className="flex items-center gap-1">
            {!isRootRoute && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <NavLink to="/" className="text-base font-semibold hover:opacity-80 transition-opacity">StudioFlow</NavLink>
          </div>
          <div className="flex items-center gap-0.5">
            <NotificationsBell compact align="end" />
            
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="animate-slide-up">{children}</div>
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around px-2 border-t border-border/60 bg-background/70 backdrop-blur-xl">
          {primaryMobileItems.map((item) => {
            const active = isItemActive(item);
            const locked = item.proOnly && !isPro;
            return (
              <NavLink
                key={item.path}
                to={getNavTo(item)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition-colors min-h-[44px] justify-center rounded-lg",
                  active ? "text-primary font-medium" : locked ? "text-muted-foreground/40" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {locked && <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5 text-muted-foreground/50" />}
                </div>
                {t(item.mobileLabel || item.labelKey)}
                {active && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Desktop sidebar ─────────────────────────────────────────────────────────
  const renderNavItem = (item: typeof principalItems[0]) => {
    const active = isItemActive(item);
    const locked = item.proOnly && !isPro;
    const showBadge = item.path === "/projects" && activeProjects > 0;
    const link = (
      <NavLink
        key={item.path}
        to={getNavTo(item)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all",
          active
            ? "bg-primary/10 text-primary font-medium"
            : locked
            ? "text-muted-foreground/40 hover:bg-secondary/50"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <div className="relative shrink-0">
          <item.icon className="h-4 w-4" />
          {locked && <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5" />}
        </div>
        {sidebarOpen && (
          <>
            <span className="truncate flex-1">{t(item.labelKey)}</span>
            {locked && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">Pro</Badge>}
            {showBadge && !locked && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-primary/15 text-primary border-0">{activeProjects}</Badge>
            )}
          </>
        )}
      </NavLink>
    );
    if (!sidebarOpen) {
      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  const initials = (displayName || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border/60 bg-background/60 backdrop-blur-xl transition-all duration-300",
          sidebarOpen ? "w-52" : "w-14"
        )}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between px-3 border-b border-border/40">
          {sidebarOpen && (
            <NavLink to="/" className="text-[13px] font-semibold truncate hover:opacity-80 transition-opacity">
              StudioFlow
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleToggleSidebar}
          >
            {sidebarOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate leading-tight">{displayName || t("nav.user")}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{t("nav.artist")}</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex flex-1 flex-col p-2 gap-0.5 overflow-y-auto">
          <TooltipProvider delayDuration={200}>
            {principalItems.map(renderNavItem)}

            <div className="my-2 border-t border-border/30" />
            {gestaoItems.map(renderNavItem)}

            <div className="my-2 border-t border-border/30" />
            {renderNavItem(settingsNavItem)}
            {isAdmin && renderNavItem(adminNavItem)}
          </TooltipProvider>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border/30 space-y-0.5">
          <div className={cn("flex", sidebarOpen ? "justify-start" : "justify-center")}>
            <NotificationsBell
              compact={!sidebarOpen}
              showLabel={sidebarOpen}
              align="end"
              className={sidebarOpen ? "w-full justify-start gap-2.5 text-[13px] text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"}
            />
          </div>
          <Button
            variant="ghost"
            size={sidebarOpen ? "sm" : "icon"}
            className="w-full justify-start gap-2.5 text-[13px] text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="truncate">{t("nav.logout")}</span>}
          </Button>
        </div>
      </aside>

      <main className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-52" : "ml-14")}>
        <div className="animate-slide-up">{children}</div>
      </main>
    </div>
  );
}
