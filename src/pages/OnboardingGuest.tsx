import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, ArrowRight, User, Briefcase, Phone, Mail } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trackAppEvent } from "@/lib/analytics";
import { maskWhatsapp } from "@/lib/masks";
import { readInviteCtx, clearInviteCtx, type InviteCtx } from "@/lib/inviteCtx";
import { SPECIALTY_OPTIONS, isPresetSpecialty } from "@/constants/specialtyOptions";

export default function OnboardingGuest() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [specialtyCustom, setSpecialtyCustom] = useState(false);
  const [inviteCtx, setInviteCtx] = useState<InviteCtx | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctx = readInviteCtx();
    if (ctx) {
      setInviteCtx(ctx);
      if (ctx.role) {
        setSpecialty(ctx.role);
        if (!isPresetSpecialty(ctx.role)) setSpecialtyCustom(true);
      }
    }
    setTimeout(() => fullNameRef.current?.focus(), 200);
  }, []);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  const whatsappDigits = whatsapp.replace(/\D/g, "");
  const canSubmit =
    fullName.trim().length >= 2 &&
    artistName.trim().length >= 1 &&
    whatsappDigits.length >= 10;

  const finish = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        display_name: artistName.trim(),
        whatsapp: whatsapp.trim(),
        user_type: "artist",
        specialties: specialty.trim() ? [specialty.trim()] : [],
        track_view_mode: "basic",
        onboarding_version: 3,
        onboarding_completed: true,
      });
      trackAppEvent("onboarding_completed", { onboarding_version: 3, origin: "guest" });
      clearInviteCtx();
      const redirectTo = inviteCtx?.projectId ? `/projects/${inviteCtx.projectId}` : "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
      setSubmitting(false);
    }
  };

  const hasCtx = !!(inviteCtx?.projectName && inviteCtx?.artistName);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao MusicOS.ai</h1>
          {hasCtx && inviteCtx ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Você foi convidado por{" "}
              <span className="text-foreground font-medium">{inviteCtx.artistName}</span>{" "}
              para participar de{" "}
              <span className="text-primary font-medium">{inviteCtx.projectName}</span>
              {inviteCtx.role && (
                <> como <span className="text-foreground font-medium">{inviteCtx.role}</span></>
              )}
              .
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Você foi convidado para um projeto. Só uns dados rápidos.
            </p>
          )}
        </div>

        {/* Project context pill */}
        {hasCtx && inviteCtx && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <Music className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Seu acesso ao finalizar</p>
              <p className="text-sm font-medium text-foreground truncate">{inviteCtx.projectName}</p>
              <p className="text-xs text-muted-foreground">{inviteCtx.artistName}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-border">
          <div className="space-y-1.5">
            <Label htmlFor="g-fullName" className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Nome completo *
            </Label>
            <Input
              ref={fullNameRef}
              id="g-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: João da Silva"
              maxLength={120}
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-artistName" className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Nome profissional *
            </Label>
            <Input
              id="g-artistName"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Ex: João Silva, Mc João…"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Especialidade
            </Label>
            {specialtyCustom ? (
              <div className="space-y-1.5">
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex: Fotógrafo de shows, Coreógrafo…"
                  maxLength={80}
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={() => { setSpecialtyCustom(false); setSpecialty(""); }}
                >
                  ← Escolher da lista
                </button>
              </div>
            ) : (
              <Select
                value={specialty || "__none__"}
                onValueChange={(v) => {
                  if (v === "__other__") { setSpecialtyCustom(true); setSpecialty(""); }
                  else { setSpecialty(v === "__none__" ? "" : v); }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar especialidade..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {SPECIALTY_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Outra…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-whatsapp" className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> WhatsApp *
            </Label>
            <Input
              id="g-whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-email" className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input id="g-email" value={user.email ?? ""} readOnly disabled className="bg-muted/50" />
          </div>

          <Button onClick={finish} disabled={!canSubmit || submitting} className="w-full gap-2" size="lg">
            {submitting ? "Salvando..." : (
              <><ArrowRight className="h-4 w-4" />{inviteCtx?.projectId ? "Acessar o projeto" : "Começar"}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
