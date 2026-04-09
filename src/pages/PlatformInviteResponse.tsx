import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, XCircle, Music2, Users, Clock, Loader2, Check, X, Sparkles,
} from "lucide-react";

/* ─── types ─── */
interface PlatformInvitation {
  id: string;
  token: string;
  invitee_name: string;
  invitee_email: string;
  status: string;
  expires_at: string;
  invited_by: string;
}

type PageState =
  | "loading" | "ready" | "submitting"
  | "accepted" | "declined"
  | "already_responded" | "expired" | "not_found" | "error";

/* ─── helpers ─── */
function GradientBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(240 10% 3.9%) 0%, hsl(260 20% 6%) 50%, hsl(240 10% 3.9%) 100%)" }}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "hsl(var(--primary))" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "hsl(var(--neon-pink))" }} />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

function AppLogo() {
  return (
    <div className="text-center mb-8 animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-lg relative"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--neon-pink) / 0.8))" }}>
        <Music2 className="h-8 w-8 text-white" />
        <div className="absolute inset-0 rounded-2xl blur-md opacity-40"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--neon-pink)))" }} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">StudioFlow</h1>
      <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Convite de Agenda</p>
    </div>
  );
}

function StatusScreen({ icon, title, message, accent, children }: {
  icon: React.ReactNode; title: string; message: string;
  accent?: "success" | "error" | "warning" | "muted"; children?: React.ReactNode;
}) {
  const ringColor =
    accent === "success" ? "hsl(var(--success))"
    : accent === "error" ? "hsl(var(--destructive))"
    : accent === "warning" ? "hsl(var(--warning))"
    : "hsl(var(--border))";
  return (
    <GradientBg>
      <AppLogo />
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 text-center shadow-2xl animate-scale-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
          style={{ background: `${ringColor}18`, boxShadow: `0 0 0 1px ${ringColor}40, 0 0 40px ${ringColor}20` }}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground leading-relaxed">{message}</p>
        {children}
      </div>
    </GradientBg>
  );
}

function ConfirmationOverlay({ decision }: { decision: "accepted" | "declined" }) {
  const isAccepted = decision === "accepted";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {isAccepted && (
        <>
          <div className="absolute w-64 h-64 rounded-full animate-ping opacity-20"
            style={{ background: "hsl(var(--success))", animationDuration: "0.8s" }} />
          <div className="absolute w-48 h-48 rounded-full animate-ping opacity-30"
            style={{ background: "hsl(var(--success))", animationDuration: "0.6s", animationDelay: "0.1s" }} />
        </>
      )}
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center animate-scale-in shadow-2xl"
        style={{
          background: isAccepted
            ? "linear-gradient(135deg, hsl(var(--success)), hsl(142 71% 35%))"
            : "linear-gradient(135deg, hsl(var(--destructive)), hsl(0 72% 40%))",
          boxShadow: isAccepted
            ? "0 0 60px hsl(var(--success) / 0.5)"
            : "0 0 60px hsl(var(--destructive) / 0.5)",
        }}>
        {isAccepted
          ? <Check className="h-14 w-14 text-white" strokeWidth={3} />
          : <X className="h-14 w-14 text-white" strokeWidth={3} />
        }
      </div>
    </div>
  );
}

/* ─── main ─── */
export default function PlatformInviteResponse() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [invitation, setInvitation] = useState<PlatformInvitation | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [allowGlobalListing, setAllowGlobalListing] = useState(false);
  const [inviterName, setInviterName] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDecision, setOverlayDecision] = useState<"accepted" | "declined">("accepted");

  useEffect(() => {
    if (!token) { setPageState("not_found"); return; }
    supabase
      .from("platform_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) { setPageState("not_found"); return; }
        const inv = data as unknown as PlatformInvitation;
        if (inv.status !== "pending") { setPageState("already_responded"); setInvitation(inv); return; }
        if (new Date(inv.expires_at) < new Date()) { setPageState("expired"); return; }
        setInvitation(inv);

        // Fetch inviter display name
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", inv.invited_by)
          .single();
        setInviterName((profile as any)?.display_name ?? "Um usuário");

        // Pre-select action from email link but always show the page for user confirmation
        const action = searchParams.get("action");
        if (action === "accept") {
          setAllowGlobalListing(false); // user can toggle before confirming
        }

        setPageState("ready");
      });
  }, [token]);

  const handleRespond = async (decision: "accepted" | "declined", tokenOverride?: string) => {
    const t = tokenOverride ?? token;
    if (!t) return;
    setPageState("submitting");
    setOverlayDecision(decision);
    setShowOverlay(true);

    const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/respond-to-platform-invite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: t,
          status: decision,
          allow_global_listing: decision === "accepted" ? allowGlobalListing : false,
        }),
      }
    );

    await new Promise((r) => setTimeout(r, 1200));
    setShowOverlay(false);

    if (res.ok) {
      const body = await res.json();
      setInviterName(body.inviter_name ?? inviterName);
      setPageState(decision);
    } else {
      const body = await res.json().catch(() => ({}));
      if (body.error === "already_responded") setPageState("already_responded");
      else if (body.error === "invitation_expired") setPageState("expired");
      else setPageState("error");
    }
  };

  /* ── terminal states ── */
  if (pageState === "loading")
    return (
      <GradientBg>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--neon-pink) / 0.8))" }}>
            <Music2 className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando convite…</p>
        </div>
      </GradientBg>
    );

  if (pageState === "not_found")
    return <StatusScreen accent="error" icon={<XCircle className="h-12 w-12 text-destructive" />} title="Convite não encontrado" message="Este link é inválido ou já foi removido." />;
  if (pageState === "expired")
    return <StatusScreen accent="warning" icon={<Clock className="h-12 w-12 text-warning" />} title="Convite expirado" message="Este convite não é mais válido. Entre em contato com a pessoa para receber um novo." />;
  if (pageState === "already_responded")
    return <StatusScreen accent="muted" icon={<CheckCircle2 className="h-12 w-12 text-muted-foreground" />} title="Resposta já registrada" message={`Você já respondeu a este convite (${invitation?.status === "accepted" ? "aceito ✅" : "recusado ❌"}).`} />;
  if (pageState === "error")
    return <StatusScreen accent="error" icon={<XCircle className="h-12 w-12 text-destructive" />} title="Erro ao processar" message="Tente novamente mais tarde ou entre em contato com quem enviou o convite." />;

  if (pageState === "accepted")
    return (
      <StatusScreen accent="success" icon={<CheckCircle2 className="h-12 w-12 text-success" />}
        title="Convite aceito! 🎉"
        message={`Obrigado, ${invitation?.invitee_name}! ${inviterName} foi notificado e você foi adicionado à agenda de colaboradores.`}>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Você pode fechar esta aba com segurança.</span>
        </div>
      </StatusScreen>
    );

  if (pageState === "declined")
    return (
      <StatusScreen accent="muted" icon={<XCircle className="h-12 w-12 text-muted-foreground" />}
        title="Recusa registrada"
        message={`Tudo bem, ${invitation?.invitee_name}. ${inviterName} será notificado.`} />
    );

  if (!invitation) return null;

  /* ── main card ── */
  return (
    <>
      {showOverlay && <ConfirmationOverlay decision={overlayDecision} />}
      <GradientBg>
        <AppLogo />

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl animate-scale-in">
          {/* hero */}
          <div className="relative px-6 py-5 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--neon-pink) / 0.12))",
              borderBottom: "1px solid hsl(var(--border))",
            }}>
            <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30"
              style={{ background: "hsl(var(--primary))" }} />
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Convite de agenda enviado por</p>
            <p className="text-2xl font-bold text-foreground truncate">{inviterName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">quer adicionar você como colaborador</p>
          </div>

          <div className="p-6 space-y-5">
            {/* info card */}
            <div className="flex items-center gap-3 rounded-xl bg-secondary/40 border border-border px-4 py-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.18)" }}>
                <Users className="text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Você</p>
                <p className="font-semibold text-foreground text-sm">{invitation.invitee_name}</p>
                <p className="text-xs text-muted-foreground">{invitation.invitee_email}</p>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ao aceitar, <strong className="text-foreground">{inviterName}</strong> poderá te convidar para projetos musicais na plataforma e você entrará na agenda de colaboradores dele.
              </p>
            </div>

            {/* opt-in banco global */}
            <div className="rounded-xl border px-4 py-3 flex items-start gap-3 transition-all duration-200"
              style={{
                background: allowGlobalListing ? "hsl(var(--primary) / 0.08)" : "hsl(var(--secondary) / 0.4)",
                borderColor: allowGlobalListing ? "hsl(var(--primary) / 0.35)" : "hsl(var(--border))",
              }}>
              <Checkbox
                id="global-listing"
                checked={allowGlobalListing}
                onCheckedChange={(v) => setAllowGlobalListing(!!v)}
                disabled={pageState === "submitting"}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Label htmlFor="global-listing" className="text-sm font-medium cursor-pointer leading-snug">
                  Quero ser encontrado por outros artistas
                </Label>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ao marcar, seu nome e especialidade poderão aparecer em buscas de outros usuários da plataforma. Você pode solicitar remoção a qualquer momento.
                </p>
              </div>
            </div>

            {/* actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/70 transition-all"
                disabled={pageState === "submitting"}
                onClick={() => handleRespond("declined")}>
                {pageState === "submitting" && overlayDecision === "declined"
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <X className="h-4 w-4 mr-2" />}
                Recusar
              </Button>
              <Button
                className="neon-glow transition-all"
                disabled={pageState === "submitting"}
                onClick={() => handleRespond("accepted")}>
                {pageState === "submitting" && overlayDecision === "accepted"
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Check className="h-4 w-4 mr-2" />}
                Aceitar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Convite válido por 7 dias · Caso não reconheça, ignore este e-mail.
            </p>
          </div>
        </div>
      </GradientBg>
    </>
  );
}
