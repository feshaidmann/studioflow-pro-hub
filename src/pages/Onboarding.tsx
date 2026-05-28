import { useState, useRef, useEffect, useMemo } from "react";
import { trackAppEvent } from "@/lib/analytics";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Music, ArrowRight, ArrowLeft, User, Mic2, Phone, Mail,
  MapPin, Sparkles, Briefcase, ExternalLink, Calendar,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GENRE_OPTIONS } from "@/constants/genreOptions";
import { BRAZIL_STATES } from "@/constants/brazilStates";
import { ProfessionalDetailModal } from "@/components/professionals/ProfessionalDetailModal";
import type { Professional } from "@/components/professionals/types";

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const MOMENT_OPTIONS = [
  { value: "começando", label: "Começando agora" },
  { value: "em desenvolvimento", label: "Em desenvolvimento" },
  { value: "lançando agora", label: "Lançando agora" },
];

type EditalMatch = {
  id: string;
  titulo: string;
  orgao: string | null;
  estado: string | null;
  prazo: string | null;
  valor: string | null;
};
type ProMatch = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  bio: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export default function Onboarding() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 2
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [currentMoment, setCurrentMoment] = useState("");

  // Step 3
  const [matches, setMatches] = useState<{ editais: EditalMatch[]; pros: ProMatch[] } | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);

  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) setTimeout(() => fullNameRef.current?.focus(), 200);
  }, [step]);

  const headerCount = useMemo(() => {
    const n = matches?.editais.length ?? 0;
    const m = matches?.pros.length ?? 0;
    return { n, m };
  }, [matches]);

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
  const canStep1 =
    fullName.trim().length >= 2 &&
    artistName.trim().length >= 1 &&
    whatsappDigits.length >= 10;
  const canStep2 = !!primaryGenre && !!stateUf;

  const goToStep2 = () => {
    if (!canStep1) return;
    setStep(2);
  };

  const goToStep3 = async () => {
    if (!canStep2) return;
    setStep(3);
    setMatchesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-matches", {
        body: { state: stateUf, genre: primaryGenre },
      });
      if (error) throw error;
      setMatches({
        editais: (data?.editais ?? []) as EditalMatch[],
        pros: (data?.professionals ?? []) as ProMatch[],
      });
    } catch (err) {
      console.error("[onboarding] matches failed", err);
      setMatches({ editais: [], pros: [] });
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleFinish = async (destination: "/projects?new=1" | "/dashboard") => {
    if (submitting) return;
    setSubmitting(true);
    setSaveStatus("saving");
    try {
      await updateProfile({
        full_name: fullName.trim(),
        display_name: artistName.trim(),
        whatsapp: whatsapp.trim(),
        user_type: "artist",
        track_view_mode: "basic",
        primary_genre: primaryGenre || null,
        state: stateUf || null,
        current_moment: currentMoment,
        onboarding_version: 4,
        onboarding_completed: true,
      });
      trackAppEvent("onboarding_completed", { onboarding_version: 4 });
      setSaveStatus("success");
      navigate(destination, { replace: true });
    } catch (err) {
      setSaveStatus("error");
      toast.error("Não foi possível salvar. Tente novamente.");
      setSubmitting(false);
    }
  };

  const openProModal = (p: ProMatch) => {
    const nowIso = new Date().toISOString();
    setSelectedPro({
      id: p.id,
      name: p.name,
      email: "",
      phone: "",
      specialty: p.specialty,
      bio: p.bio,
      active: true,
      allow_global_listing: true,
      created_at: nowIso,
      favorite: false,
    });
  };




  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-5 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MusicOS.ai</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2" aria-label={`Passo ${step} de 3`}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step ? "w-8 bg-primary" : n < step ? "w-6 bg-primary/60" : "w-6 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4 border border-border">
          {step === 1 && (
            <>
              <p className="text-muted-foreground text-sm text-center">Só precisamos de alguns dados pra começar.</p>

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
                <Input id="email" value={user.email ?? ""} readOnly disabled className="bg-muted/50" />
              </div>

              <Button onClick={goToStep2} disabled={!canStep1} className="w-full gap-2" size="lg">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Sobre sua música</h2>
                <p className="text-muted-foreground text-sm">Ajuda a personalizar recomendações.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Gênero principal *
                </Label>
                <Select value={primaryGenre} onValueChange={setPrimaryGenre}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger>
                  <SelectContent>
                    {GENRE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Estado *
                </Label>
                <Select value={stateUf} onValueChange={setStateUf}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {BRAZIL_STATES.map((s) => (
                      <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Momento atual <span className="opacity-60">(opcional)</span>
                </Label>
                <Select value={currentMoment} onValueChange={setCurrentMoment}>
                  <SelectTrigger><SelectValue placeholder="Como você está hoje?" /></SelectTrigger>
                  <SelectContent>
                    {MOMENT_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2" size="lg">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button onClick={goToStep3} disabled={!canStep2} className="flex-1 gap-2" size="lg">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center space-y-1" aria-live="polite">
                {matchesLoading ? (
                  <>
                    <h2 className="text-lg font-semibold text-foreground">Buscando o que já é seu…</h2>
                    <p className="text-muted-foreground text-sm">Filtrando editais e profissionais.</p>
                  </>
                ) : headerCount.n === 0 && headerCount.m === 0 ? (
                  <>
                    <h2 className="text-lg font-semibold text-foreground">
                      {artistName || "Olá"}, seu cadastro está pronto.
                    </h2>
                    <p className="text-muted-foreground text-sm">Vamos criar seu primeiro projeto?</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-foreground">
                      {artistName}, encontrei {headerCount.n} {headerCount.n === 1 ? "edital" : "editais"} e{" "}
                      {headerCount.m} {headerCount.m === 1 ? "profissional" : "profissionais"} para você começar
                    </h2>
                  </>
                )}
              </div>

              {/* Editais */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" /> Editais abertos
                </div>
                {matchesLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                  </div>
                ) : matches && matches.editais.length > 0 ? (
                  <div className="space-y-2">
                    {matches.editais.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => window.open(`/editais/inscricao/${e.id}`, "_blank", "noopener")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-background/50 hover:bg-accent/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground line-clamp-1">{e.titulo}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              {e.orgao && <span>{e.orgao}</span>}
                              {e.estado && <span>· {e.estado}</span>}
                              {e.prazo && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {dateFmt.format(new Date(e.prazo))}
                                </span>
                              )}
                              {e.valor && <span>· {e.valor}</span>}
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
                    Cadastramos novos editais toda semana — vai chegar matched no seu perfil.
                  </p>
                )}
              </div>

              {/* Profissionais */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Briefcase className="h-3.5 w-3.5" /> Profissionais sugeridos
                </div>
                {matchesLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : matches && matches.pros.length > 0 ? (
                  <div className="space-y-2">
                    {matches.pros.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openProModal(p)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-background/50 hover:bg-accent/30 transition-colors"
                      >
                        <div className="font-medium text-sm text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.specialty}{p.city ? ` · ${p.city}` : ""}
                        </div>
                        {p.bio && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.bio}</div>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
                    Marketplace de profissionais em crescimento — você pode convidar quem já trabalha com você.
                  </p>
                )}
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleFinish("/projects?new=1")}
                  disabled={submitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  {submitting ? "Salvando..." : <>Criar meu primeiro projeto <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={submitting} className="gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFinish("/dashboard")}
                    disabled={submitting}
                    className="text-muted-foreground"
                  >
                    Ir para o dashboard
                  </Button>
                </div>
              </div>
            </>
          )}

          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {saveStatus === "saving" && "Salvando suas informações..."}
            {saveStatus === "success" && "Salvo com sucesso. Redirecionando."}
            {saveStatus === "error" && "Não foi possível salvar. Tente novamente."}
          </div>
        </div>
      </div>

      <ProfessionalDetailModal
        professional={selectedPro}
        onClose={() => setSelectedPro(null)}
        onEdit={() => { /* read-only no onboarding */ }}
      />
    </div>
  );
}
