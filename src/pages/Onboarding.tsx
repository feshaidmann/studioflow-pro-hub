import { useState, useRef, useEffect } from "react";
import { trackAppEvent } from "@/lib/analytics";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, ArrowRight, User, Mic2, Phone, Mail } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Onboarding() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [fullName, setFullName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSaveStatus("saving");
    try {
      await updateProfile({
        full_name: fullName.trim(),
        display_name: artistName.trim(),
        whatsapp: whatsapp.trim(),
        user_type: "artist",
        track_view_mode: "basic",
        onboarding_version: 3,
        onboarding_completed: true,
      });
      trackAppEvent("onboarding_completed", { onboarding_version: 3 });
      setSaveStatus("success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSaveStatus("error");
      toast.error("Não foi possível salvar. Tente novamente.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">StudioFlow</h1>
          <p className="text-muted-foreground text-sm">Só precisamos de alguns dados pra começar.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4 border border-border">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Nome completo *
            </Label>
            <Input
              ref={fullNameRef}
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: João da Silva"
              maxLength={120}
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artistName" className="text-xs text-muted-foreground flex items-center gap-1">
              <Mic2 className="h-3 w-3" /> Nome artístico *
            </Label>
            <Input
              id="artistName"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Ex: Mc João, Ana Castela…"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp" className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> WhatsApp *
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              id="email"
              value={user.email ?? ""}
              readOnly
              disabled
              className="bg-muted/50"
            />
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? "Salvando..." : <>Começar <ArrowRight className="h-4 w-4" /></>}
          </Button>

          {/* Status acessível para leitores de tela */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {saveStatus === "saving" && "Salvando suas informações..."}
            {saveStatus === "success" && "Salvo com sucesso. Redirecionando para o painel."}
            {saveStatus === "error" && "Não foi possível salvar. Tente novamente."}
          </div>
        </div>
      </div>
    </div>
  );
}
