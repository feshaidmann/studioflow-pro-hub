import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Mail, Phone, Star, Briefcase, CalendarDays,
  Share2, Check, Music, ExternalLink, AlertCircle, Send, UserPlus, Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { RequestQuoteModal } from "@/components/marketplace/RequestQuoteModal";
import type { MarketplaceProvider } from "@/types/marketplace";
import { toast } from "sonner";


interface PublicProfileData {
  id: string;
  display_name: string;
  username: string;
  bio: string;
  city: string;
  specialties: string[];
  accept_invites: boolean;
  projects_completed: number;
  public_email: string;
  whatsapp: string;
  allow_global_listing: boolean;
  created_at: string;
}

interface RatingsData {
  avg_stars: number | null;
  rating_count: number;
}

interface DeliveryHistoryItem {
  project_name: string;
  role: string;
  delivery_status: string;
  delivery_due_date: string | null;
  joined_at: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [ratings, setRatings] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [contactCopied, setContactCopied] = useState<"email" | "wa" | null>(null);
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [workLinks, setWorkLinks] = useState<Array<{ title: string; url: string }>>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);


  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_profile", {
        p_username: username,
      });
      if (error || !data || (data as any[]).length === 0) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const p = (data as any[])[0] as PublicProfileData & { work_links?: any };
      setProfile(p);

      if (Array.isArray((p as any).work_links)) {
        setWorkLinks((p as any).work_links as Array<{ title: string; url: string }>);
      }

      // Fetch ratings
      const { data: rData } = await supabase.rpc("get_public_profile_ratings", {
        p_profile_id: p.id,
      });
      if (rData && (rData as any[]).length > 0) {
        const r = (rData as any[])[0];
        setRatings({ avg_stars: r.avg_stars, rating_count: Number(r.rating_count) });
      }

      // Fetch delivery history
      if (p.public_email) {
        const { data: hData } = await supabase.rpc("get_public_profile_history", {
          p_email: p.public_email,
        });
        if (hData) setHistory(hData as DeliveryHistoryItem[]);
      }

      setLoading(false);
    })();
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : "—";

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── 404 ─────────────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Perfil não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Este perfil não existe ou não está visível publicamente.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  // ── Profile page ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">JSP</span>
            <span className="text-muted-foreground">· Perfil Público</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Compartilhar"}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Identity card */}
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/15 border-2 border-primary/25 flex items-center justify-center text-3xl shrink-0">
            🎵
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold leading-tight truncate">{profile.display_name}</h1>
            {profile.specialties[0] && (
              <p className="text-sm font-medium text-primary mt-0.5">{profile.specialties[0]}</p>
            )}
            {profile.city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.city}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              {profile.accept_invites ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Disponível para projetos
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  Não disponível no momento
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border/60 p-4 text-center">
            <Briefcase className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{profile.projects_completed}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Projetos<br />concluídos</p>
          </div>
          <div className="rounded-xl bg-card border border-border/60 p-4 text-center">
          <Star className="h-4 w-4 text-chart-3 mx-auto mb-1" />
            {ratings && ratings.rating_count > 0 ? (
              <>
                <p className="text-2xl font-bold text-chart-3">{ratings.avg_stars?.toFixed(1)}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{ratings.rating_count} avalia{ratings.rating_count === 1 ? "ção" : "ções"}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Sem avaliações</p>
              </>
            )}
          </div>
          <div className="rounded-xl bg-card border border-border/60 p-4 text-center">
            <CalendarDays className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-semibold leading-tight">{memberSince}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Na plataforma</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="rounded-xl bg-card border border-border/60 p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* Specialties */}
        {profile.specialties.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s, i) => (
                <Badge key={s} variant={i === 0 ? "default" : "secondary"} className="text-sm py-1 px-3">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Ratings stars visual */}
        {ratings && ratings.rating_count > 0 && (
          <div className="rounded-xl bg-card border border-border/60 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Avaliação na Plataforma</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= Math.round(ratings.avg_stars ?? 0)
                        ? "fill-chart-3 text-chart-3"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-bold">{ratings.avg_stars?.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({ratings.rating_count} avalia{ratings.rating_count === 1 ? "ção" : "ções"})
              </span>
            </div>
          </div>
        )}

        {/* Delivery history */}
        {history.length > 0 && (
          <div className="rounded-xl bg-card border border-border/60 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Histórico de Entregas</p>
            <div className="space-y-2">
              {history.map((h, i) => {
                const statusColor = h.delivery_status === "entregue" ? "text-primary" : h.delivery_status === "atrasado" ? "text-destructive" : "text-muted-foreground";
                const statusLabel = h.delivery_status === "entregue" ? "Entregue" : h.delivery_status === "atrasado" ? "Atrasado" : h.delivery_status === "ativo" ? "Em andamento" : h.delivery_status;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{h.project_name}</span>
                    <span className="text-xs text-muted-foreground">{h.role}</span>
                    <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Work links */}
        {workLinks.length > 0 && (
          <div className="rounded-xl bg-card border border-border/60 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trabalhos</p>
            {workLinks.filter((l) => l.title && l.url).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{link.title}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            ))}
          </div>
        )}

        {/* Contact */}
        {(profile.public_email || profile.whatsapp) && (
          <div className="rounded-xl bg-card border border-border/60 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</p>
            {profile.public_email && (
              <a
                href={`mailto:${profile.public_email}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                {profile.public_email}
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            )}
            {profile.whatsapp && (
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                {profile.whatsapp}
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="pt-2 pb-8 space-y-2">
          <Button
            className="w-full gap-2 h-11 text-base"
            size="lg"
            onClick={() => {
              if (!user) {
                navigate(`/auth?return_to=/u/${username}`);
                return;
              }
              setQuoteOpen(true);
            }}
          >
            <Send className="h-4 w-4" />
            Solicitar orçamento
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2 h-10"
              onClick={() => {
                if (!user) {
                  navigate(`/auth?return_to=/u/${username}`);
                  return;
                }
                navigate(`/?invite=${profile.username}`);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Convidar
            </Button>
            {(profile.public_email || profile.whatsapp) ? (
              <Button
                variant="outline"
                className="gap-2 h-10"
                onClick={() => {
                  const value = profile.public_email || profile.whatsapp;
                  navigator.clipboard.writeText(value);
                  setContactCopied(profile.public_email ? "email" : "wa");
                  toast.success("Contato copiado!");
                  setTimeout(() => setContactCopied(null), 2000);
                }}
              >
                {contactCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {contactCopied ? "Copiado" : "Copiar contato"}
              </Button>
            ) : (
              <Button variant="outline" className="gap-2 h-10" onClick={handleCopyLink}>
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            )}
          </div>
          {!user && (
            <p className="text-center text-xs text-muted-foreground pt-1">
              É necessário ter uma conta para solicitar orçamento ou convidar.
            </p>
          )}
        </div>
      </div>

      {/* Quote modal */}
      <RequestQuoteModal
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        provider={profile ? ({
          provider_ref: profile.id,
          source: "user",
          name: profile.display_name,
          handle: profile.username,
          avatar_url: "",
          bio: profile.bio,
          city: profile.city,
          state: "",
          specialties: profile.specialties,
          genres: [],
          projects_completed: profile.projects_completed,
          accept_invites: profile.accept_invites,
          is_user: true,
        } satisfies MarketplaceProvider) : null}
      />
    </div>
  );

}
