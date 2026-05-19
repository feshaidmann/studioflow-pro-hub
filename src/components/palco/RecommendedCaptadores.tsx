import { Megaphone, BadgeCheck, Mail, MessageCircle, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePalcoCaptadoresMatch } from "@/hooks/usePalcoCaptadoresMatch";

interface Props {
  applicationId: string;
  onUseContact: (recipient: string, channel: string) => void;
}

function onlyDigits(s: string) { return (s || "").replace(/\D/g, ""); }

export default function RecommendedCaptadores({ applicationId, onUseContact }: Props) {
  const { data, loading } = usePalcoCaptadoresMatch(applicationId);

  if (loading) return <p className="text-xs text-muted-foreground py-2">Buscando captadores recomendados…</p>;
  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">
        Nenhum captador no diretório atende ainda esse perfil de palco.{" "}
        <Link to="/captadores" className="text-primary underline">Ver diretório completo</Link>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground inline-flex items-center gap-1">
          <Megaphone className="h-3.5 w-3.5 text-primary" /> Captadores recomendados ({data.length})
        </p>
        <Link to="/captadores" className="text-[11px] text-primary hover:underline">Ver todos →</Link>
      </div>
      {data.map((c) => {
        const phone = onlyDigits(c.whatsapp);
        return (
          <Card key={c.id} className="p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium truncate">{c.display_name}</p>
                  {c.captador_verificado && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 gap-0.5 h-5 text-[10px]">
                      <BadgeCheck className="h-3 w-3" /> Verificado
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] h-5">match {c.match_score.toFixed(1)}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[c.city, c.state].filter(Boolean).join(" · ")}
                  {c.captador_palco_tipos?.length ? ` — ${c.captador_palco_tipos.slice(0, 3).join(", ")}` : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                {c.public_email && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => onUseContact(c.public_email, "email")}>
                    <Mail className="h-3 w-3" /> Usar e-mail
                  </Button>
                )}
                {phone && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => onUseContact(c.whatsapp, "whatsapp")}>
                    <MessageCircle className="h-3 w-3" /> Usar WhatsApp
                  </Button>
                )}
                {c.username && (
                  <Button size="sm" variant="ghost" asChild className="h-7 text-[11px] gap-1">
                    <Link to={`/u/${c.username}`}><ExternalLink className="h-3 w-3" /></Link>
                  </Button>
                )}
              </div>
            </div>

            {c.match_reasons && c.match_reasons.length > 0 && (
              <div className="rounded-md bg-muted/40 border border-border/60 px-2.5 py-1.5">
                <p className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Por que foi sugerido
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {c.match_reasons.map((r) => (
                    <li key={r.label}>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                        <span className="font-medium text-foreground">{r.label}:</span>
                        <span className="text-muted-foreground truncate max-w-[160px]">{r.detail}</span>
                        <span className="text-primary/70">+{r.weight}</span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
