import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Music2,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Loader2,
  Check,
  X,
  ArrowRight,
  LogIn,
  LogOut,
  AlertTriangle,
} from "lucide-react";

interface InvitationData {
  id: string;
  token: string;
  professional_name: string;
  professional_email: string;
  professional_role: string;
  fee: number;
  deadline: string;
  schedule_notes: string;
  status: string;
  expires_at: string;
  project: { name: string; artist: string } | null;
}

type PageState =
  | "loading"
  | "ready"
  | "submitting"
  | "accepted"
  | "declined"
  | "already_responded"
  | "expired"
  | "revoked"
  | "not_found"
  | "email_mismatch"
  | "error";

/* ── layout helpers ── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function AppLogo() {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
        <Music2 className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">StudioFlow</h1>
      <p className="text-xs text-muted-foreground mt-0.5">Convite de participação</p>
    </div>
  );
}

function StatusScreen({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PageShell>
      <AppLogo />
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-5">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <div className="text-sm text-muted-foreground leading-relaxed">{message}</div>
        {children}
      </div>
    </PageShell>
  );
}

function ConfirmationOverlay({ decision }: { decision: "accepted" | "declined" }) {
  const isAccepted = decision === "accepted";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-background/60 backdrop-blur-sm">
      <div
        className={`relative w-20 h-20 rounded-full flex items-center justify-center animate-scale-in shadow-lg ${
          isAccepted ? "bg-success" : "bg-destructive"
        }`}
      >
        {isAccepted ? (
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        ) : (
          <X className="h-10 w-10 text-white" strokeWidth={3} />
        )}
      </div>
    </div>
  );
}

/* ── main page ── */

export default function InviteResponse() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [allowGlobalListing, setAllowGlobalListing] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedEmail, setLoggedEmail] = useState<string | null>(null);
  const [mismatchInfo, setMismatchInfo] = useState<{ invited: string; logged: string } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDecision, setOverlayDecision] = useState<"accepted" | "declined">("accepted");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setLoggedEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!token) { setPageState("not_found"); return; }
    supabase
      .from("project_invitations")
      .select("*, project:projects(name, artist)")
      .eq("token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setPageState("not_found"); return; }
        const inv = data as unknown as InvitationData;
        if (inv.status !== "pending") { setPageState("already_responded"); setInvitation(inv); return; }
        if (new Date(inv.expires_at) < new Date()) { setPageState("expired"); return; }
        setInvitation(inv);
        setArtistName((inv.project as any)?.artist ?? "Artista");
        setPageState("ready");
      });
  }, [token]);

  const handleRespond = async (decision: "accepted" | "declined") => {
    if (!token) return;
    setPageState("submitting");
    setOverlayDecision(decision);
    setShowOverlay(true);

    const session = (await supabase.auth.getSession()).data.session;

    const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/respond-to-invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          token,
          status: decision,
          allow_global_listing: decision === "accepted" ? allowGlobalListing : false,
        }),
      }
    );

    await new Promise((r) => setTimeout(r, 900));
    setShowOverlay(false);

    if (res.ok) {
      const body = await res.json();
      setArtistName(body.artist_name ?? artistName);
      if (body.project_id) setProjectId(body.project_id);
      setPageState(decision);
    } else {
      const body = await res.json().catch(() => ({}));
      if (body.error === "email_mismatch") {
        setMismatchInfo({
          invited: body.invited_email ?? invitation?.professional_email ?? "",
          logged: body.logged_email ?? loggedEmail ?? "",
        });
        setPageState("email_mismatch");
      }
      else if (body.error === "already_responded") setPageState("already_responded");
      else if (body.error === "invitation_expired") setPageState("expired");
      else setPageState("error");
    }
  };

  const handleSwitchAccount = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  /* ── loading ── */
  if (pageState === "loading") {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Music2 className="h-6 w-6 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando convite…</p>
        </div>
      </PageShell>
    );
  }

  /* ── terminal states ── */
  if (pageState === "not_found")
    return <StatusScreen icon={<XCircle className="h-8 w-8 text-destructive" />} title="Convite não encontrado" message="Este link é inválido ou já foi removido." />;
  if (pageState === "expired")
    return <StatusScreen icon={<Clock className="h-8 w-8 text-warning" />} title="Convite expirado" message="Este convite não é mais válido. Entre em contato com o artista para receber um novo." />;
  if (pageState === "already_responded")
    return (
      <StatusScreen
        icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
        title="Resposta já registrada"
        message={`Você já respondeu a este convite (${invitation?.status === "accepted" ? "aceito" : "recusado"}).`}
      />
    );
  if (pageState === "error")
    return <StatusScreen icon={<XCircle className="h-8 w-8 text-destructive" />} title="Erro ao processar" message="Tente novamente mais tarde ou entre em contato com o artista." />;

  if (pageState === "email_mismatch" && mismatchInfo) {
    return (
      <StatusScreen
        icon={<AlertTriangle className="h-8 w-8 text-warning" />}
        title="Este convite é para outro email"
        message={
          <>
            O convite foi enviado para <span className="font-medium text-foreground">{mismatchInfo.invited}</span>,
            mas você está logado como <span className="font-medium text-foreground">{mismatchInfo.logged}</span>.
            Saia da conta atual ou entre com o email correto.
          </>
        }
      >
        <div className="mt-6 space-y-2">
          <Button onClick={handleSwitchAccount} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Sair e trocar de conta
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setPageState("ready")}>
            Voltar
          </Button>
        </div>
      </StatusScreen>
    );
  }

  if (pageState === "accepted") {
    const projectPath = projectId ? `/projects/${projectId}` : "/projects";
    const invitedEmail = invitation?.professional_email ?? "";
    const baseRedirect = projectId ? `/projects/${projectId}` : "/dashboard";
    const loginPath = `/auth?redirect=${encodeURIComponent(baseRedirect)}${
      invitedEmail ? `&invited_email=${encodeURIComponent(invitedEmail)}` : ""
    }`;
    return (
      <StatusScreen
        icon={<CheckCircle2 className="h-8 w-8 text-success" />}
        title="Participação confirmada"
        message={`Obrigado, ${invitation?.professional_name}. ${artistName} foi notificado.`}
      >
        <div className="mt-6 space-y-3">
          {isLoggedIn ? (
            <Link to={projectPath}>
              <Button className="w-full gap-2">
                <ArrowRight className="h-4 w-4" /> Ir para o projeto
              </Button>
            </Link>
          ) : (
            <Link to={loginPath}>
              <Button className="w-full gap-2">
                <LogIn className="h-4 w-4" /> Entrar na plataforma
              </Button>
            </Link>
          )}
          <p className="text-xs text-muted-foreground">Você pode fechar esta aba com segurança.</p>
        </div>
      </StatusScreen>
    );
  }

  if (pageState === "declined")
    return (
      <StatusScreen
        icon={<XCircle className="h-8 w-8 text-muted-foreground" />}
        title="Recusa registrada"
        message={`Obrigado pela resposta, ${invitation?.professional_name}. O artista será notificado.`}
      />
    );

  if (!invitation) return null;

  const project = invitation.project as any;
  const daysLeft = Math.ceil(
    (new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const emailMismatchWarning =
    isLoggedIn && loggedEmail &&
    loggedEmail.toLowerCase() !== invitation.professional_email.toLowerCase();

  /* ── main invite card ── */
  return (
    <>
      {showOverlay && <ConfirmationOverlay decision={overlayDecision} />}
      <PageShell>
        <AppLogo />

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {/* header band */}
          <div className="px-6 py-5 border-b border-border bg-muted/30">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              Você foi convidado por
            </p>
            <p className="text-xl font-semibold text-foreground truncate">{artistName}</p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              para o projeto{" "}
              <span className="text-foreground font-medium">{project?.name ?? "—"}</span>
            </p>
          </div>

          <div className="p-6 space-y-4">
            {emailMismatchWarning && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-foreground/90 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  Este convite é para <span className="font-medium">{invitation.professional_email}</span>,
                  mas você está logado como <span className="font-medium">{loggedEmail}</span>.
                  Saia e entre com o email correto antes de aceitar.
                </div>
              </div>
            )}

            {/* role */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sua função</p>
                <p className="font-medium text-foreground text-sm">{invitation.professional_role || "—"}</p>
              </div>
            </div>

            {/* fee + deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <DollarSign className="h-3.5 w-3.5" /> Cachê
                </div>
                <p className="font-semibold text-base text-primary leading-tight">
                  {invitation.fee > 0
                    ? `R$\u00a0${Number(invitation.fee).toLocaleString("pt-BR")}`
                    : "A combinar"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <Calendar className="h-3.5 w-3.5" /> Prazo
                </div>
                <p className="font-medium text-sm text-foreground leading-tight">
                  {invitation.deadline || <span className="text-muted-foreground italic font-normal">A definir</span>}
                </p>
              </div>
            </div>

            {/* schedule notes */}
            {invitation.schedule_notes && (
              <div className="rounded-xl bg-muted/30 border border-border p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <Clock className="h-3.5 w-3.5" /> Observações / Horário
                </div>
                <p className="text-sm text-foreground leading-relaxed">{invitation.schedule_notes}</p>
              </div>
            )}

            {/* opt-in */}
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3">
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
              <Button
                variant="outline"
                onClick={() => handleRespond("declined")}
                disabled={pageState === "submitting"}
              >
                {pageState === "submitting" && overlayDecision === "declined"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><X className="h-4 w-4" /> Recusar</>}
              </Button>
              <Button
                onClick={() => handleRespond("accepted")}
                disabled={pageState === "submitting"}
              >
                {pageState === "submitting" && overlayDecision === "accepted"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Check className="h-4 w-4" /> Aceitar</>}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {daysLeft > 0
            ? `Este convite expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} · ${new Date(invitation.expires_at).toLocaleDateString("pt-BR")}`
            : "Este convite expira hoje"}
        </p>
      </PageShell>
    </>
  );
}
