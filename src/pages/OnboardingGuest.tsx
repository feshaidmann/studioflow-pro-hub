import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, Mic2, ArrowRight, MapPin, Check, Lightbulb, Disc3, Radio, Rocket } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MOMENTS = [
  { value: "idea", label: "Tenho uma ideia", icon: Lightbulb },
  { value: "producing", label: "Já estou produzindo", icon: Disc3 },
  { value: "ready", label: "Tenho música pronta", icon: Radio },
  { value: "launching", label: "Quero lançar", icon: Rocket },
] as const;

export default function OnboardingGuest() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [moment, setMoment] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) setTimeout(() => nameRef.current?.focus(), 300);
  }, [step]);

  if (authLoading || profileLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  const canAdvance = !!name.trim();

  const finish = async (selectedMoment?: string) => {
    setSubmitting(true);
    await updateProfile({
      display_name: name.trim(),
      city: city.trim(),
      user_type: "artist",
      track_view_mode: "basic",
      current_moment: selectedMoment || moment || "producing",
      main_pain: "organization",
      onboarding_version: 2,
      onboarding_completed: true,
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao StudioFlow</h1>
          <p className="text-muted-foreground text-sm">Você foi convidado para um projeto. Vamos te apresentar rapidinho.</p>
        </div>

        <div className="flex items-center gap-1">
          {["Identidade", "Momento"].map((label, i) => {
            const idx = i + 1;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn("h-1.5 w-full rounded-full transition-all", isDone ? "bg-primary" : isActive ? "bg-primary/60" : "bg-muted")} />
                <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5 border border-border">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Como você quer ser chamado?</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-name" className="text-xs text-muted-foreground">Nome artístico ou apelido *</Label>
                <Input
                  ref={nameRef}
                  id="g-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance) setStep(2); }}
                  placeholder="Ex: Mc João, Ana Castela, Seu Jorge…"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-city" className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Cidade <span className="text-muted-foreground/50">(opcional)</span>
                </Label>
                <Input
                  id="g-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance) setStep(2); }}
                  placeholder="Ex: São Paulo, Rio de Janeiro…"
                  maxLength={60}
                />
              </div>
              <Button onClick={() => setStep(2)} disabled={!canAdvance} className="w-full gap-2" size="lg">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Onde você está agora?</p>
              <p className="text-xs text-muted-foreground">Nos conta onde você está para personalizar sua experiência.</p>
              <div className="space-y-2.5">
                {MOMENTS.map((m) => {
                  const Icon = m.icon;
                  const selected = moment === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMoment(m.value)}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-all flex items-center gap-3",
                        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-card/80"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold flex-1", selected ? "text-primary" : "text-foreground")}>{m.label}</span>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" size="lg">Voltar</Button>
                <Button variant="ghost" onClick={() => finish("producing")} disabled={submitting} className="flex-1" size="lg">Pular</Button>
                <Button onClick={() => finish()} disabled={submitting || !moment} className="flex-1 gap-2" size="lg">
                  {submitting ? "Salvando…" : <>Começar <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
