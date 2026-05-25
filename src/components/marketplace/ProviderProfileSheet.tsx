import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Send, ShieldCheck, Users, Music } from "lucide-react";
import { avatarColor, avatarInitials } from "@/components/professionals/types";
import type { MarketplaceProvider } from "@/types/marketplace";

interface Props {
  provider: MarketplaceProvider | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestQuote: (p: MarketplaceProvider) => void;
}

const SOURCE_BADGE: Record<MarketplaceProvider["source"], { label: string; icon: typeof ShieldCheck; cls: string }> = {
  user: { label: "Artista StudioFlow", icon: Users, cls: "bg-primary/10 text-primary border-primary/20" },
  contact: { label: "Indicado", cls: "bg-accent text-accent-foreground border-border", icon: ShieldCheck },
  curated: { label: "Curado", cls: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: ShieldCheck },
};

export function ProviderProfileSheet({ provider, open, onOpenChange, onRequestQuote }: Props) {
  const badge = provider ? SOURCE_BADGE[provider.source] : null;
  const BadgeIcon = badge?.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Perfil do profissional</SheetTitle>
          <SheetDescription>
            Informações disponíveis sobre este profissional indicado.
          </SheetDescription>
        </SheetHeader>

        {provider && badge && BadgeIcon && (
        <div className="mt-6 space-y-5">
          <div className="flex items-start gap-4">
            {provider.avatar_url ? (
              <img src={provider.avatar_url} alt={provider.name} className="h-16 w-16 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-base font-semibold text-foreground/70 shrink-0"
                style={{ background: avatarColor(provider.name) }}
              >
                {avatarInitials(provider.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">{provider.name}</h3>
              <Badge variant="outline" className={`text-[10px] gap-1 mt-1 ${badge.cls}`}>
                <BadgeIcon className="h-2.5 w-2.5" />
                {badge.label}
              </Badge>
              {(provider.city || provider.state) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="h-3 w-3" /> {[provider.city, provider.state].filter(Boolean).join(" / ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-chart-3" />
                {provider.projects_completed > 0 ? `${provider.projects_completed} projetos concluídos` : "Novo no marketplace"}
              </p>
            </div>
          </div>

          {provider.specialties.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Especialidades</p>
              <div className="flex flex-wrap gap-1.5">
                {provider.specialties.filter(Boolean).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {provider.genres?.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Music className="h-3 w-3" /> Gêneros
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.genres.filter(Boolean).map((g) => (
                  <Badge key={g} variant="outline" className="text-[11px]">{g}</Badge>
                ))}
              </div>
            </div>
          )}

          {provider.bio && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Sobre</p>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{provider.bio}</p>
            </div>
          )}

          {provider.source === "contact" && (
            <p className="text-[11px] text-muted-foreground rounded-md border border-border bg-muted/30 p-2">
              Este profissional foi indicado por contatos da plataforma e ainda não possui um perfil público no StudioFlow.
            </p>
          )}

          <Button className="w-full gap-1.5" onClick={() => onRequestQuote(provider)}>
            <Send className="h-3.5 w-3.5" /> Solicitar orçamento
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
