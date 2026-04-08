import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Music, Mic2, ArrowRight, MapPin, Globe, Check, FolderPlus, Layers } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_SPECIALTIES = 3;

export default function Onboarding() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const { addProject } = useProjects();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Identity
  const [artistName, setArtistName] = useState("");
  const [city, setCity] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 — First project
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<string>("single");

  // Step 3 — Mode selection
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");

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

  const handleNext = () => setStep((s) => s + 1);

  const handleConfirm = async () => {
    setSubmitting(true);
    const name = artistName.trim() || user.email?.split("@")[0] || "Artista";

    // Create the first project if name was provided
    if (projectName.trim()) {
      try {
        await addProject({
          name: projectName.trim(),
          artist: name,
          bpm: 120,
          key: "C",
          stage: "inicio",
          projectType: projectType as any,
        });
      } catch {
        toast.error("Erro ao criar projeto, mas seu perfil foi salvo.");
      }
    }

    await updateProfile({
      display_name: name,
      city: city.trim(),
      user_type: "artist",
      track_view_mode: viewMode,
      onboarding_completed: true,
    });
    navigate("/dashboard", { replace: true });
  };

  const stepLabels = ["Identidade", "Primeiro Projeto", "Modo de Uso", "Pronto"];

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
        <div className="flex items-center gap-1.5">
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
                <span className={cn("text-[9px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 space-y-6 border border-border">

          {/* STEP 1 — Identity */}
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
              <Button onClick={handleNext} disabled={!artistName.trim()} className="w-full neon-glow gap-2" size="lg">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 — First Project */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Seu primeiro projeto</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comece registrando a música que você está trabalhando agora. Você pode pular e criar depois.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="projectName" className="text-xs text-muted-foreground">Nome do projeto</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
                  placeholder="Ex: Meu Primeiro Single, EP Novo..."
                  className="text-base"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Álbum</SelectItem>
                    <SelectItem value="beat">Beat / Base</SelectItem>
                    <SelectItem value="feat">Feat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleNext} className="w-full neon-glow gap-2" size="lg">
                {projectName.trim() ? "Próximo" : "Pular"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 3 — Mode Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Como você quer usar o StudioFlow?</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Escolha o modo que combina com seu estilo. Você pode mudar a qualquer momento em Configurações.
              </p>
              <div className="space-y-3">
                {([
                  { value: "basic" as const, label: "Simples", desc: "Foco em projetos, tarefas e equipe. Interface limpa e direta.", icon: "🎯" },
                  { value: "advanced" as const, label: "Completo", desc: "Tudo habilitado: tracks de mix, margem financeira, dados detalhados.", icon: "⚡" },
                ]).map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setViewMode(mode.value)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      viewMode === mode.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-card/80"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.icon}</span>
                      <div>
                        <p className={cn("text-sm font-semibold", viewMode === mode.value ? "text-primary" : "text-foreground")}>{mode.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{mode.desc}</p>
                      </div>
                      {viewMode === mode.value && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
              <Button onClick={handleNext} className="w-full neon-glow gap-2" size="lg">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 4 — Summary / Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Tudo pronto!</p>
              </div>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Nome</span>
                    <span className="text-sm font-medium">{artistName.trim() || "—"}</span>
                  </div>
                  {city.trim() && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Cidade</span>
                      <span className="text-sm font-medium">{city.trim()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primeiro projeto</span>
                    <span className="text-sm font-medium">{projectName.trim() || "Nenhum"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Modo</span>
                    <span className="text-sm font-medium">{viewMode === "basic" ? "🎯 Simples" : "⚡ Completo"}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/70 text-center">
                Você pode alterar tudo a qualquer momento em Configurações.
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
          Passo {step} de 4 — Você poderá editar tudo em Configurações.
        </p>
      </div>
    </div>
  );
}
