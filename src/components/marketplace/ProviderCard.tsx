import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Send, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { avatarColor, avatarInitials } from "@/components/professionals/types";
import type { MarketplaceProvider } from "@/types/marketplace";


interface Props {
  provider: MarketplaceProvider;
  onRequestQuote: (p: MarketplaceProvider) => void;
}

const SOURCE_BADGE: Record<MarketplaceProvider["source"], { label: string; icon: typeof ShieldCheck; cls: string }> = {
  user: { label: "Artista StudioFlow", icon: Users, cls: "bg-primary/10 text-primary border-primary/20" },
  contact: { label: "Indicado", cls: "bg-accent text-accent-foreground border-border", icon: ShieldCheck },
  curated: { label: "Curado", cls: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: ShieldCheck },
};

export function ProviderCard({ provider, onRequestQuote }: Props) {
  const badge = SOURCE_BADGE[provider.source];
  const BadgeIcon = badge.icon;
  const navigate = useNavigate();

  const goToProfile = () => {
    if (provider.handle) navigate(`/u/${provider.handle}`);
  };

  const clickable = Boolean(provider.handle);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? goToProfile : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToProfile();
              }
            }
          : undefined
      }
      className={`rounded-[14px] border border-border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${
        clickable ? "cursor-pointer hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {provider.avatar_url ? (
          <img src={provider.avatar_url} alt={provider.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold text-foreground/70 shrink-0"
            style={{ background: avatarColor(provider.name) }}
          >
            {avatarInitials(provider.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{provider.name}</p>
            <Badge variant="outline" className={`text-[10px] gap-1 ${badge.cls}`}>
              <BadgeIcon className="h-2.5 w-2.5" />
              {badge.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{provider.specialties.filter(Boolean).join(" · ") || "Sem especialidade"}</p>

          {(provider.city || provider.state) && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {[provider.city, provider.state].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
      </div>

      {provider.bio && <p className="text-xs text-muted-foreground line-clamp-2">{provider.bio}</p>}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 text-chart-3" />
          {provider.projects_completed > 0 ? `${provider.projects_completed} projetos` : "Novo"}
        </span>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onRequestQuote(provider);
          }}
        >
          <Send className="h-3.5 w-3.5" /> Solicitar orçamento
        </Button>
      </div>
    </div>
  );
}
