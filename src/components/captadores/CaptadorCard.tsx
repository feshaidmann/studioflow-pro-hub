import { Mail, MessageCircle, ExternalLink, BadgeCheck, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { CaptadorProfile } from "@/hooks/useCaptadores";
import { avatarColor, avatarInitials } from "@/components/professionals/types";

interface Props {
  c: CaptadorProfile;
  onContact: (c: CaptadorProfile) => void;
}

export default function CaptadorCard({ c, onContact }: Props) {
  return (
    <Card className="glass-card hover:border-primary/40 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold text-foreground/70 shrink-0"
            style={{ background: avatarColor(c.display_name || "?") }}
            aria-hidden
          >
            {avatarInitials(c.display_name || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm leading-tight truncate">{c.display_name || "Sem nome"}</p>
              {c.captador_verificado && (
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-0.5 h-5 text-[10px]">
                  <BadgeCheck className="h-3 w-3" /> Verificado
                </Badge>
              )}
            </div>
            {(c.city || c.state) && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />{[c.city, c.state].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {c.bio && <p className="text-xs text-muted-foreground line-clamp-2">{c.bio}</p>}

        {c.captador_palco_tipos?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.captador_palco_tipos.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] h-5 px-1.5">{t}</Badge>
            ))}
            {c.captador_palco_tipos.length > 4 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">+{c.captador_palco_tipos.length - 4}</Badge>
            )}
          </div>
        )}

        {c.captador_taxa && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Taxa:</span> {c.captador_taxa}
          </p>
        )}

        <div className="flex gap-2 pt-1 flex-wrap">
          <Button size="sm" onClick={() => onContact(c)} className="gap-1.5 h-7 text-xs">
            <Mail className="h-3 w-3" /> Contato
          </Button>
          {c.username && (
            <Button size="sm" variant="outline" asChild className="gap-1.5 h-7 text-xs">
              <Link to={`/u/${c.username}`}>
                <ExternalLink className="h-3 w-3" /> Perfil
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
