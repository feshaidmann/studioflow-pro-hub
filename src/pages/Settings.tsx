import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskRules, RULE_LABELS } from "@/hooks/useTaskRules";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Save, ListChecks, DollarSign, CalendarClock, Clock, Mail, Disc3, Megaphone, Loader2, FlaskConical, Activity, Users, UserCircle, ChevronRight, MapPin, Globe, Palette, Sun, Bell, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CaptadorOptInSection from "@/components/captadores/CaptadorOptInSection";

const RULE_ICONS: Record<string, React.ElementType> = {
  inactivity:     Clock,
  budget:         DollarSign,
  invite_pending: Mail,
  deadline:       CalendarClock,
  master_check:   Disc3,
  release:        Megaphone,
};

// Demo data tailored for the Independent Artist persona
const SAMPLE_PROJECTS = [
  {
    name: "Volta Pra Mim",
    artist: "Eu mesmo",
    bpm: 90,
    key: "Am",
    stage: "mix" as const,
    projectType: "single" as const,
    revenueEstimate: 0,
    templateTracks: ["Voz Principal", "Backing Vocal", "Violão", "Beat", "Master Bus"],
  },
  {
    name: "EP Raízes",
    artist: "Eu mesmo",
    bpm: 75,
    key: "G",
    stage: "master" as const,
    projectType: "ep" as const,
    trackCount: 4,
    revenueEstimate: 0,
    templateTracks: ["Voz", "Guitarra", "Baixo", "Bateria", "Master Bus"],
  },
  {
    name: "Saudade do Norte",
    artist: "Eu mesmo",
    bpm: 105,
    key: "D",
    stage: "rough" as const,
    projectType: "single" as const,
    revenueEstimate: 0,
    templateTracks: ["Voz", "Sanfona", "Triângulo", "Zabumba", "Master Bus"],
  },
  {
    name: "Álbum Independente Vol. 1",
    artist: "Eu mesmo",
    bpm: 88,
    key: "Em",
    stage: "upload" as const,
    projectType: "album" as const,
    trackCount: 10,
    revenueEstimate: 0,
    templateTracks: ["Voz Principal", "Violão Dedilhado", "Contrabaixo", "Bateria", "Master Bus"],
  },
  {
    name: "Parceria feat. Ana Lima",
    artist: "Eu mesmo",
    bpm: 98,
    key: "Bm",
    stage: "rough" as const,
    projectType: "single" as const,
    revenueEstimate: 0,
    templateTracks: ["Voz Lead", "Voz Ana Lima", "Beat", "Sample", "Master Bus"],
  },
];

const SAMPLE_PROFESSIONALS = [
  {
    name: "Bruno Nascimento",
    email: "bruno.nascimento@studioflow.pro",
    phone: "(11) 97345-9921",
    specialty: "Bateria",
    bio: "Baterista com domínio em bateria acústica e eletrônica. Especialista em gravações de click track e programação de baterias para demo e álbuns.",
    active: true,
  },
  {
    name: "Lucas Freitas",
    email: "lucas.freitas@studioflow.pro",
    phone: "(11) 98100-2233",
    specialty: "Mix",
    bio: "Mix engineer com 10 anos de experiência em estúdios de São Paulo. Créditos em projetos de artistas nacionais e internacionais em pop, trap e eletrônico.",
    active: true,
  },
  {
    name: "Ana Lima",
    email: "ana.lima@studioflow.pro",
    phone: "(21) 99234-5678",
    specialty: "Voz",
    bio: "Cantora e backing vocal com experiência em gravações de estúdio. Especializada em pop, MPB e gospel. Disponível para features e projetos independentes.",
    active: true,
  },
  {
    name: "Ricardo Matos",
    email: "ricardo.matos@studioflow.pro",
    phone: "(31) 98877-1122",
    specialty: "Produção",
    bio: "Produtor musical focado em música regional e MPB. Trabalha com beat making e arranjos completos. Entrega arquivos stems e projeto DAW.",
    active: true,
  },
];

const SAMPLE_RATINGS = [
  { professional_name: "Bruno Nascimento", professional_email: "bruno.nascimento@studioflow.pro", stars: 5, notes: "Incrível! Entregou os stems no prazo e o som ficou perfeito. Recomendo." },
  { professional_name: "Bruno Nascimento", professional_email: "bruno.nascimento@studioflow.pro", stars: 4, notes: "Ótimo trabalho, só precisou de um ajuste no click track." },
  { professional_name: "Lucas Freitas", professional_email: "lucas.freitas@studioflow.pro", stars: 5, notes: "O mix ficou profissional. Muito comunicativo e preciso nos detalhes." },
  { professional_name: "Lucas Freitas", professional_email: "lucas.freitas@studioflow.pro", stars: 5, notes: "Trabalho impecável, entrega rápida." },
  { professional_name: "Lucas Freitas", professional_email: "lucas.freitas@studioflow.pro", stars: 4, notes: "Muito bom, pediu um retorno extra mas resultado final valeu." },
  { professional_name: "Ana Lima", professional_email: "ana.lima@studioflow.pro", stars: 5, notes: "Voz incrível, gravou todas as vozes num dia só." },
  { professional_name: "Ricardo Matos", professional_email: "ricardo.matos@studioflow.pro", stars: 3, notes: "Entregou com atraso mas o resultado foi satisfatório." },
];

export default function Settings() {
  const { displayName, updateProfile, profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [seedingProjects, setSeedingProjects] = useState(false);
  const [seedingContacts, setSeedingContacts] = useState(false);
  const { rules, loading: rulesLoading, updateRule } = useTaskRules();
  const { projects, addProject } = useProjects();
  const { permission, subscribed, loading: pushLoading, isSupported, subscribe, unsubscribe } = usePushNotifications();

  const handleTogglePush = async () => {
    if (subscribed) {
      await unsubscribe();
      toast.success(t("settings.pushDisabledToast"));
    } else {
      const ok = await subscribe();
      if (ok) toast.success(t("settings.pushEnabledToast"));
      else if (permission === "denied") toast.error(t("settings.pushDeniedToast"));
      else toast.error(t("settings.pushErrorToast"));
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    await updateProfile({ display_name: name.trim() || displayName });
    setSaving(false);
    toast.success(t("settings.nameUpdated"));
  };

  const handleSeedProjects = async () => {
    setSeedingProjects(true);
    let created = 0;
    for (const sample of SAMPLE_PROJECTS) {
      if (projects.some((p) => p.name === sample.name)) continue;
      const result = await addProject(sample);
      if (result) created++;
    }
    setSeedingProjects(false);
    if (created === 0) {
      toast.info(t("settings.allProjectsExist"));
    } else {
      toast.success(`${created} ${t("settings.projectsCreated")}`);
    }
  };

  const handleSeedContacts = async () => {
    if (!user) return;
    setSeedingContacts(true);
    let profCreated = 0;
    let ratingsCreated = 0;

    // Check which professionals already exist
    const { data: existing } = await supabase
      .from("professionals")
      .select("email")
      .eq("user_id", user.id);
    const existingEmails = new Set((existing ?? []).map((r: any) => r.email));

    // Insert professionals that don't exist yet
    const newProfs = SAMPLE_PROFESSIONALS.filter((p) => !existingEmails.has(p.email));
    if (newProfs.length > 0) {
      const { data: inserted, error } = await supabase
        .from("professionals")
        .insert(newProfs.map((p) => ({ ...p, user_id: user.id, allow_global_listing: false })))
        .select("id, email");
      if (!error && inserted) profCreated = inserted.length;
    }

    // Insert ratings — skip if already seeded
    const { data: existingRatings } = await supabase
      .from("professional_ratings")
      .select("id")
      .eq("user_id", user.id);
    if (!existingRatings || (existingRatings as any[]).length === 0) {
      // Use a dummy project_id (first project available or a placeholder uuid)
      const firstProject = projects[0];
      const projectId = firstProject?.id ?? "00000000-0000-0000-0000-000000000000";
      const { data: rInserted, error: rError } = await supabase
        .from("professional_ratings")
        .insert(SAMPLE_RATINGS.map((r) => ({ ...r, user_id: user.id, project_id: projectId })));
      if (!rError) ratingsCreated = SAMPLE_RATINGS.length;
    }

    setSeedingContacts(false);
    if (profCreated === 0 && ratingsCreated === 0) {
      toast.info(t("settings.contactsExist"));
    } else {
      toast.success("🎉");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("settings.title")}</h1>

      {/* Meu Perfil — acesso rápido */}
      <Card
        className="glass-card cursor-pointer hover:border-primary/40 transition-all active:scale-[0.99]"
        onClick={() => navigate("/perfil")}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{displayName || t("settings.myProfile")}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {profile?.city && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />{profile.city}
                </span>
              )}
              {profile?.allow_global_listing && (
                <span className="flex items-center gap-1 text-xs text-primary/80">
                  <Globe className="h-3 w-3" />{t("settings.inGlobalBank")}
                </span>
              )}
              {profile?.specialties && profile.specialties.length > 0 && (
                <span className="text-xs text-muted-foreground">{profile.specialties.slice(0, 2).join(", ")}</span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {t("settings.displayName")}
          </CardTitle>
          <CardDescription>{t("settings.displayNameDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">{t("settings.name")}</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={displayName}
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>E-mail: {user?.email}</p>
          </div>
          <Button onClick={handleSaveName} disabled={saving || !name.trim()} size="sm" className="gap-2">
            <Save className="h-3.5 w-3.5" />
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>
        </CardContent>
      </Card>

      <CaptadorOptInSection />

      <PublicProfileSection />




      {/* Notificações Push */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {t("settings.pushNotifications")}
          </CardTitle>
          <CardDescription>{t("settings.pushDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-xs text-muted-foreground">{t("settings.pushNotSupported")}</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {subscribed ? t("settings.pushEnabled") : t("settings.pushDisabled")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {permission === "denied"
                    ? t("settings.pushDenied")
                    : subscribed
                    ? t("settings.pushEnabledDesc")
                    : t("settings.pushDisabledDesc")}
                </p>
              </div>
              <Button
                size="sm"
                variant={subscribed ? "secondary" : "default"}
                className="gap-2 shrink-0"
                onClick={handleTogglePush}
                disabled={pushLoading || permission === "denied"}
              >
                {pushLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : subscribed ? (
                  <BellOff className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                {subscribed ? t("settings.disable") : t("settings.enable")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Data */}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            {t("settings.demoData")}
          </CardTitle>
          <CardDescription>{t("settings.demoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Projects seed */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("settings.demoProjects")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {SAMPLE_PROJECTS.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span><span className="text-foreground font-medium">{p.name}</span> — {p.stage} · {p.projectType}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleSeedProjects} disabled={seedingProjects} size="sm" className="neon-glow gap-2 w-full sm:w-auto">
              {seedingProjects
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("settings.creatingSampleProjects")}</>
                : <><FlaskConical className="h-3.5 w-3.5" /> {t("settings.createSampleProjects")}</>
              }
            </Button>
          </div>

          {/* Contacts + ratings seed */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("settings.demoContacts")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {SAMPLE_PROFESSIONALS.map((p) => (
                <div key={p.email} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span><span className="text-foreground font-medium">{p.name}</span> — {p.specialty}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70">{SAMPLE_RATINGS.length} {t("settings.demoRatings")}</p>
            <Button onClick={handleSeedContacts} disabled={seedingContacts} size="sm" variant="secondary" className="gap-2 w-full sm:w-auto">
              {seedingContacts
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("settings.creatingSampleContacts")}</>
                : <><Users className="h-3.5 w-3.5" /> {t("settings.createSampleContacts")}</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Rules */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {t("settings.checklistRules")}
          </CardTitle>
          <CardDescription>{t("settings.checklistDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rulesLoading && <p className="text-xs text-muted-foreground animate-pulse">{t("dashboard.loading")}</p>}
          {rules.map((rule) => {
            const meta = RULE_LABELS[rule.ruleType];
            if (!meta) return null;
            const Icon = RULE_ICONS[rule.ruleType] ?? Activity;
            const paramKey = meta.paramKey;
            const currentVal = paramKey ? (Number(rule.parameters[paramKey]) || 0) : 0;
            return (
              <div
                key={rule.ruleType}
                className={`rounded-xl border p-4 space-y-3 transition-opacity ${rule.isActive ? "border-border" : "border-border/40 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-secondary/50">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{t(`rule.${rule.ruleType}`)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t(`rule.${rule.ruleType}.desc`)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(v) => {
                      updateRule(rule.ruleType, { isActive: v });
                      toast.success(`${t(`rule.${rule.ruleType}`)} ${v ? t("settings.ruleEnabled") : t("settings.ruleDisabled")}`);
                    }}
                    className="shrink-0"
                  />
                </div>

                {/* Threshold slider — only shown when rule is active and has a param */}
                {rule.isActive && paramKey && meta.paramMin !== undefined && meta.paramMax !== undefined && (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t(`rule.${rule.ruleType}.param`)}</Label>
                      <Badge variant="outline" className="text-xs font-mono-nums h-5 px-2">
                        {currentVal}{rule.ruleType === "budget" ? "%" : "d"}
                      </Badge>
                    </div>
                    <Slider
                      min={meta.paramMin}
                      max={meta.paramMax}
                      step={1}
                      value={[currentVal]}
                      onValueChange={([v]) => {
                        updateRule(rule.ruleType, {
                          parameters: { ...rule.parameters, [paramKey]: v },
                        });
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{meta.paramMin}{rule.ruleType === "budget" ? "%" : "d"}</span>
                      <span>{meta.paramMax}{rule.ruleType === "budget" ? "%" : "d"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

