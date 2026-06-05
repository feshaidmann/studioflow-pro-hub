import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Send, ShieldCheck, Music } from "lucide-react";
import { avatarColor, avatarInitials } from "@/components/professionals/types";
import type { MarketplaceProvider } from "@/types/marketplace";

interface Props {
  provider: MarketplaceProvider | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestQuote: (p: MarketplaceProvider) => void;
}

export function ProviderProfileSheet({ provider, open, onOpenChange, onRequestQuote }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Perfil do profissional</SheetTitle>
          <SheetDescription>
            {provider
              ? `Informações disponíveis sobre ${provider.display_name ?? provider.name}.`
              : "Informações disponíveis sobre este profissional."}
          </SheetDescription>
        </SheetHeader>

        {provider && (
        <div className="mt-6 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-base font-semibold text-foreground/70 shrink-0"
              style={{ background: avatarColor(provider.display_name ?? provider.name) }}
            >
              {avatarInitials(provider.display_name ?? provider.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">{provider.display_name ?? provider.name}</h3>
              {provider.verified_by_jsp && (
                <Badge variant="outline" className="text-[10px] gap-1 mt-1 bg-chart-3/15 text-chart-3 border-chart-3/30">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verificado JSP
                </Badge>
              )}
              {(provider.city || provider.state) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="h-3 w-3" /> {[provider.city, provider.state].filter(Boolean).join(" / ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-chart-3" />
                {(provider.review_count ?? 0) > 0
                  ? `${provider.avg_rating?.toFixed(1)} ★  ·  ${provider.review_count} avaliações`
                  : "Sem avaliações ainda"}
              </p>
              {provider.base_rate_brl && (
                <p className="text-xs text-muted-foreground mt-1">
                  A partir de R$ {provider.base_rate_brl.toLocaleString("pt-BR")}
                  /{provider.rate_unit}
                </p>
              )}
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

          {provider.portfolio_links?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Portfólio
              </p>
              <div className="flex flex-col gap-1">
                {provider.portfolio_links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank"
                     rel="noopener noreferrer"
                     className="text-xs text-primary hover:underline truncate">
                    {link.label || link.url}
                  </a>
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

          <Button className="w-full gap-1.5" onClick={() => onRequestQuote(provider)}>
            <Send className="h-3.5 w-3.5" /> Solicitar orçamento
          </Button>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
