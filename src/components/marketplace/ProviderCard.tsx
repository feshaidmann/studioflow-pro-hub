import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Send, ShieldCheck, Users, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { avatarColor, avatarInitials } from "@/components/professionals/types";
import type { MarketplaceProvider } from "@/types/marketplace";


interface Props {
  provider: MarketplaceProvider;
  onRequestQuote: (p: MarketplaceProvider) => void;
  onOpenProfile?: (p: MarketplaceProvider) => void;
}

const SOURCE_BADGE: Record<MarketplaceProvider["source"], { label: string; icon: typeof ShieldCheck; cls: string }> = {
  user: { label: "Artista MusicOS.ai", icon: Users, cls: "bg-primary/10 text-primary border-primary/20" },
  contact: { label: "Indicado", cls: "bg-accent text-accent-foreground border-border", icon: ShieldCheck },
  curated: { label: "Curado", cls: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: ShieldCheck },
};

export function ProviderCard({ provider, onRequestQuote, onOpenProfile }: Props) {
  const badge = SOURCE_BADGE[provider.source];
  const BadgeIcon = badge.icon;
  const navigate = useNavigate();

  const goToProfile = () => {
    if (provider.handle) {
      navigate(`/u/${provider.handle}`);
    } else {
      onOpenProfile?.(provider);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToProfile();
        }
      }}
      className="group rounded-[14px] border border-border bg-card p-4 flex flex-col gap-3 transition-all cursor-pointer hover:shadow-md hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{provider.name}</p>
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
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      {provider.bio && <p className="text-xs text-muted-foreground line-clamp-2">{provider.bio}</p>}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 text-chart-3" />
          {provider.projects_completed > 0 ? `${provider.projects_completed} projetos` : "Novo"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Ver perfil</span>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onRequestQuote(provider);
            }}
          >
            <Send className="h-3.5 w-3.5" /> Orçamento
          </Button>
        </div>
      </div>
    </div>
  );
}
