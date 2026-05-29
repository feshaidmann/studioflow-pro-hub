import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, ArrowRight, User, Mic2, Phone, Mail, Briefcase } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trackAppEvent } from "@/lib/analytics";

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface InviteCtx {
  projectId?: string;
  projectName?: string;
  artistName?: string;
  role?: string;
}

const INVITE_CTX_KEY = "sfp_invite_ctx";

export default function OnboardingGuest() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [inviteCtx, setInviteCtx] = useState<InviteCtx | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INVITE_CTX_KEY);
      if (stored) {
        const ctx = JSON.parse(stored) as InviteCtx;
        setInviteCtx(ctx);
        if (ctx.role) setSpecialty(ctx.role);
      }
    } catch {}
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

      try { localStorage.removeItem(INVITE_CTX_KEY); } catch {}

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
          {hasCtx ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Você foi convidado por{" "}
              <span className="text-foreground font-medium">{inviteCtx!.artistName}</span>{" "}
              para participar de{" "}
              <span className="text-primary font-medium">{inviteCtx!.projectName}</span>
              {inviteCtx!.role && (
                <> como <span className="text-foreground font-medium">{inviteCtx!.role}</span></>
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
        {hasCtx && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <Music className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Seu acesso ao finalizar</p>
              <p className="text-sm font-medium text-foreground truncate">{inviteCtx!.projectName}</p>
              <p className="text-xs text-muted-foreground">{inviteCtx!.artistName}</p>
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
              <Mic2 className="h-3 w-3" /> Nome artístico *
            </Label>
            <Input
              id="g-artistName"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Ex: Mc João, Ana Castela…"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-specialty" className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Especialidade
            </Label>
            <Input
              id="g-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ex: Guitarrista, Produtor, Engenheiro de Som…"
              maxLength={80}
            />
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
            {submitting
              ? "Salvando..."
              : inviteCtx?.projectId
                ? <><ArrowRight className="h-4 w-4" /> Acessar o projeto</>
                : <><ArrowRight className="h-4 w-4" /> Começar</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
