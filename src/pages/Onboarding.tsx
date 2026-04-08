import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, Mic2, ArrowRight, MapPin, Globe, Check } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  "Mixagem",
  "Masterização",
  "Gravação",
  "Composição",
  "Beatmaker",
  "Engenheiro de som",
  "Arranjador",
  "Multi-instrumentista",
  "Produtor Musical",
  "Vocal Coach",
  "Marketing Musical",
  "Social Media",
  "Designer Gráfico",
  "Assessor de Imprensa",
  "Videomaker",
];

const MAX_SPECIALTIES = 3;

export default function Onboarding() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [artistName, setArtistName] = useState("");
  const [city, setCity] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 — specialties only
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Step 3
  const [allowGlobalListing, setAllowGlobalListing] = useState(false);

  useEffect(() => {
    if (user?.email && !artistName) {
      setArtistName(user.email.split("@")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (step === 1) setTimeout(() => inputRef.current?.focus(), 300);
  }, [step]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s)
        : prev.length < MAX_SPECIALTIES
        ? [...prev, s]
        : prev
    );
  };

  const handleNext = () => setStep((s) => s + 1);

  const handleConfirm = async () => {
    setSubmitting(true);
    const name = artistName.trim() || user.email?.split("@")[0] || "Artista";
    await updateProfile({
      display_name: name,
      city: city.trim(),
      user_type: "artist",
      specialties,
      allow_global_listing: allowGlobalListing,
      onboarding_completed: true,
    });
    navigate("/dashboard", { replace: true });
  };

  const stepLabels = ["Identidade", "Especialidades", "Visibilidade"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold neon-text">StudioFlow</h1>
          <p className="text-muted-foreground text-sm">Configure seu perfil para começar</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const idx = i + 1;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-1.5 w-full rounded-full transition-all duration-300",
                    isDone ? "bg-primary" : isActive ? "bg-primary/60" : "bg-muted"
                  )}
                />
                <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 space-y-6 border border-border">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Como você quer ser chamado?</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="artistName" className="text-xs text-muted-foreground">Nome artístico ou apelido *</Label>
                <Input
                  ref={inputRef}
                  id="artistName"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
                  placeholder="Ex: DJ Marquinhos, Ana Silva..."
                  className="text-base"
                  maxLength={60}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Cidade <span className="text-muted-foreground/50">(opcional)</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
                  placeholder="Ex: São Paulo, Rio de Janeiro..."
                  maxLength={60}
                />
              </div>

              <Button
                onClick={handleNext}
                disabled={!artistName.trim()}
                className="w-full neon-glow gap-2"
                size="lg"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Suas especialidades</p>
              </div>

              {/* Specialties */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Especialidades <span className="text-muted-foreground/50">(máx. {MAX_SPECIALTIES})</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => {
                    const selected = specialties.includes(s);
                    const disabled = !selected && specialties.length >= MAX_SPECIALTIES;
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s)}
                        disabled={disabled}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          selected
                            ? "border-primary bg-primary/15 text-primary"
                            : disabled
                            ? "border-border text-muted-foreground/40 cursor-not-allowed"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {selected && <Check className="inline h-3 w-3 mr-1" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleNext} className="w-full neon-glow gap-2" size="lg">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Visibilidade na plataforma</p>
              </div>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Banco global de profissionais</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Outros profissionais poderão te encontrar e te convidar para projetos na plataforma.
                    </p>
                  </div>
                  <Switch
                    checked={allowGlobalListing}
                    onCheckedChange={setAllowGlobalListing}
                    className="mt-0.5 shrink-0"
                  />
                </div>

                {allowGlobalListing && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                    <p className="text-xs text-primary font-medium">
                      ✅ Seu perfil ficará visível para outros profissionais da plataforma.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground/70 text-center">
                Você pode alterar essa preferência a qualquer momento em Configurações.
              </p>

              <Button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full neon-glow gap-2"
                size="lg"
              >
                {submitting ? "Configurando..." : (
                  <>Entrar no StudioFlow <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Passo {step} de 3 — Você poderá editar tudo em Configurações.
        </p>
      </div>
    </div>
  );
}
