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
  MoreHorizontal,
  Palette,
  Database,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import NotificationsBell from "@/components/NotificationsPanel";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useProfile } from "@/contexts/ProfileContext";
import { useProjects } from "@/contexts/ProjectContext";
import BetaBanner from "@/components/BetaBanner";
import { useBetaBannerVisible } from "@/hooks/useBetaBanner";

const principalItems = [
  { labelKey: "nav.home",     path: "/dashboard", icon: Home,         proOnly: false, mobileLabel: "" },
  { labelKey: "nav.projects", path: "/projects",  icon: FolderKanban, proOnly: false, mobileLabel: "" },
];

const gestaoItems = [
  { labelKey: "nav.finance",       path: "/finance",       icon: DollarSign,   proOnly: false, mobileLabel: "" },
  { labelKey: "nav.agenda",        path: "/agenda",        icon: CalendarDays, proOnly: false, mobileLabel: "" },
  { labelKey: "nav.musicdna",      path: "/music-dna",     icon: Dna,          proOnly: false, mobileLabel: "nav.musicdna.short" },
  { labelKey: "nav.editais",      path: "/editais",       icon: FileText,     proOnly: false, mobileLabel: "" },
  { labelKey: "nav.creative",     path: "/criativo",      icon: Palette,      proOnly: false, mobileLabel: "" },
  { labelKey: "nav.professionals", path: "/professionals", icon: Users,        proOnly: false, mobileLabel: "" },
];

// Sub-labels descritivos curtos (P2) — apenas para itens do drawer "Mais"
const drawerSubLabels: Record<string, string> = {
  "/editais":            "Chamadas e inscrições",
  "/professionals":      "Equipe e parceiros",
  "/criativo":           "Arte com IA",
  "/music-dna":          "Análise técnica de mix/master",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  usePageTracking();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
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
  const betaVisible = useBetaBannerVisible();
  const betaOffset = betaVisible ? "pt-7" : "";

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
  const adminReferenceTracksItem = { labelKey: "Faixas de Referência", path: "/admin/reference-tracks", icon: Database, proOnly: false, mobileLabel: "" };
  const settingsNavItem = { labelKey: "nav.settings", path: "/settings", icon: Settings, proOnly: false, mobileLabel: "nav.settings.short" };
  const tutorialNavItem = { labelKey: "nav.tutorial", path: "/tutorial", icon: HelpCircle, proOnly: false, mobileLabel: "" };

  const primaryMobileItems = [
    ...principalItems,
    gestaoItems[0], // Finanças
    gestaoItems[1], // Agenda
  ];

  // Drawer "Mais" — apenas FERRAMENTAS, reordenadas por frequência (P1)
  const toolDrawerItems = [
    gestaoItems[3], // Editais
    gestaoItems[5], // Profissionais
    gestaoItems[4], // Criativo
    gestaoItems[2], // DNA Musical
  ];

  // Prefetch dos chunks lazy ao abrir o drawer "Mais" ou hover na sidebar,
  // para evitar a sensação de menu "inativo" causada pela latência do code-split.
  const prefetchRoute = (path: string) => {
    switch (path) {
      case "/criativo":     import("@/pages/Creative");      break;
      case "/editais":      import("@/pages/Editais");       break;
      case "/professionals": import("@/pages/Professionals"); break;
      case "/music-dna":    import("@/pages/MusicDNA");      break;
      case "/agenda":       import("@/pages/Agenda");        break;
      case "/finance":      import("@/pages/FinancialTracker"); break;
      case "/projects":     import("@/pages/Projects");      break;
      case "/settings":     import("@/pages/Settings");      break;
      case "/tutorial":     import("@/pages/Tutorial");      break;
      case "/admin":        import("@/pages/Admin");         break;
    }
  };

  const handleMoreOpenChange = (open: boolean) => {
    setMoreOpen(open);
    if (open) {
      toolDrawerItems.forEach((item) => prefetchRoute(item.path));
    }
  };

  // Seção "Conta" do drawer (lista compacta)
  const accountDrawerItems = [
    tutorialNavItem,
  ];

  const getNavTo = (item: { path: string }) => item.path;

  const isItemActive = (item: { path: string }) => location.pathname === item.path;

  const ROOT_ROUTES = ["/dashboard", "/projects", "/finance", "/agenda", "/professionals", "/settings", "/admin", "/tutorial", "/music-dna", "/editais", "/criativo", "/"];
  const isRootRoute = ROOT_ROUTES.includes(location.pathname);

  // ── Mobile ─────────────────────────────────────────────────────────────────
  const isMoreActive = [...toolDrawerItems, ...accountDrawerItems, settingsNavItem].some((item) => isItemActive(item));

  if (isMobile) {
    return (
      <div className={cn("flex min-h-screen flex-col", betaOffset)}>
        <BetaBanner />
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
            {/* P3: Configurações promovida ao header mobile */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                location.pathname === "/settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => navigate("/settings")}
              aria-label={t("nav.settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <NotificationsBell compact align="end" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(3.5rem + 0.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="animate-slide-up">{children}</div>
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 border-t border-border/60 bg-background/70 backdrop-blur-xl" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {primaryMobileItems.map((item) => {
            const active = isItemActive(item);
            return (
              <NavLink
                key={item.path}
                to={getNavTo(item)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors min-h-[44px] justify-center rounded-lg",
                  active ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {t(item.mobileLabel || item.labelKey)}
                {active && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
              </NavLink>
            );
          })}
          {/* Botão "Mais" */}
          <button
            onClick={() => handleMoreOpenChange(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors min-h-[44px] justify-center rounded-lg",
              isMoreActive ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            {t("nav.more")}
            {isMoreActive && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
          </button>
        </nav>

        {/* Drawer "Mais" — P0: agrupado em Ferramentas + Conta */}
        <Sheet open={moreOpen} onOpenChange={handleMoreOpenChange}>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
            <SheetHeader className="pb-3">
              <SheetTitle className="text-base">{t("nav.more")}</SheetTitle>
            </SheetHeader>

            {/* Seção 1 — Ferramentas (grid com sub-labels) */}
            <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("nav.section.tools") !== "nav.section.tools" ? t("nav.section.tools") : "Ferramentas"}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {toolDrawerItems.map((item) => {
                const active = isItemActive(item);
                const sub = drawerSubLabels[item.path];
                return (
                  <NavLink
                    key={item.path}
                    to={getNavTo(item)}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-xl border transition-colors min-h-[76px] justify-center",
                      active
                        ? "border-primary/30 bg-primary/5 text-primary font-medium"
                        : "border-border/60 text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-[13px] leading-tight">{t(item.labelKey)}</span>
                    {sub && (
                      <span className="text-[10px] text-muted-foreground leading-tight truncate">{sub}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Seção 2 — Conta (lista compacta) */}
            <div className="mt-5 mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("nav.section.account") !== "nav.section.account" ? t("nav.section.account") : "Conta"}
            </div>
            <div className="flex flex-col gap-0.5">
              {accountDrawerItems.map((item) => {
                const active = isItemActive(item);
                return (
                  <NavLink
                    key={item.path}
                    to={getNavTo(item)}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2.5 rounded-lg text-[13px] transition-colors",
                      active
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={() => { setMoreOpen(false); handleSignOut(); }}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg text-[13px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
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
        onMouseEnter={() => prefetchRoute(item.path)}
        onFocus={() => prefetchRoute(item.path)}
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
      <BetaBanner />
      <aside
        className={cn(
          "fixed left-0 z-40 flex h-full flex-col border-r border-border/60 bg-background/60 backdrop-blur-xl transition-all duration-300",
          betaVisible ? "top-7" : "top-0",
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

        {/* Nav — hierarquia espelhada do mobile */}
        <nav className="flex flex-1 flex-col p-2 gap-0.5 overflow-y-auto">
          <TooltipProvider delayDuration={200}>
            {/* Principal: Home, Projetos, Finanças, Agenda */}
            {principalItems.map(renderNavItem)}
            {renderNavItem(gestaoItems[0])}
            {renderNavItem(gestaoItems[1])}

            {/* Ferramentas: Editais, Profissionais, Criativo, DNA */}
            <div className="my-2 border-t border-border/30" />
            {sidebarOpen && (
              <div className="px-2.5 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {t("nav.section.tools") !== "nav.section.tools" ? t("nav.section.tools") : "Ferramentas"}
              </div>
            )}
            {renderNavItem(gestaoItems[3])}
            {renderNavItem(gestaoItems[5])}
            {renderNavItem(gestaoItems[4])}
            {renderNavItem(gestaoItems[2])}

            {/* Conta */}
            <div className="my-2 border-t border-border/30" />
            {sidebarOpen && (
              <div className="px-2.5 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {t("nav.section.account") !== "nav.section.account" ? t("nav.section.account") : "Conta"}
              </div>
            )}
            {renderNavItem(settingsNavItem)}
            {renderNavItem(tutorialNavItem)}
            {isAdmin && renderNavItem(adminNavItem)}
            {isAdmin && renderNavItem(adminReferenceTracksItem)}
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

      <main className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-52" : "ml-14", betaOffset)}>
        <div className="animate-slide-up">{children}</div>
      </main>
    </div>
  );
}
