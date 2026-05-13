import { ExternalLink, MapPin, Calendar, DollarSign, Trophy, Mic2, ClipboardList, Tag, Users, FileText, Loader2, AlertTriangle, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TIPO_PALCO_LABELS, type TipoPalco, PORTE_LABELS, type Porte, type PalcoCurado } from "@/hooks/usePalcos";
import type { Edital } from "@/hooks/useEditais";
import type { Opportunity } from "./types";
import { buildGoogleFallbackUrl, formatLinkChecked } from "./linkHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    const date = new Date(d + "T12:00:00-03:00");
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(date);
  } catch { return d; }
}

interface Props {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (op: Opportunity) => void;
  onSave?: (op: Opportunity) => void;
  alreadyApplied?: boolean;
  pending?: boolean;
}

export default function OpportunityDetailSheet({ opportunity: op, open, onOpenChange, onApply, onSave, alreadyApplied, pending }: Props) {
  if (!op) return null;
  const isEdital = op.tipo === "edital";
  const TypeIcon = isEdital ? Trophy : Mic2;
  const palco = !isEdital ? (op.raw as PalcoCurado) : null;
  const edital = isEdital ? (op.raw as Edital) : null;
  const typeLabel = isEdital
    ? "Edital de fomento"
    : (op.porteOuTipo ? TIPO_PALCO_LABELS[op.porteOuTipo as TipoPalco] || "Palco" : "Palco");

  const { toast } = useToast();
  const [reporting, setReporting] = useState(false);
  const linkBroken = op.linkStatus === "broken";
  const linkCheckedLabel = formatLinkChecked(op);

  async function handleReportBroken() {
    if (!op.editalId) return;
    setReporting(true);
    const table = op.tipo === "edital" ? "editais" : "palcos_curados";
    const { error } = await supabase
      .from(table)
      .update({ link_status: "broken", link_checked_at: new Date().toISOString() })
      .eq("id", op.editalId);
    setReporting(false);
    if (error) {
      toast({ title: "Não foi possível reportar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Obrigado!", description: "Marcamos o link como indisponível." });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className="text-[11px] gap-1 bg-primary/10 text-primary border-primary/30">
              <TypeIcon className="h-3 w-3" /> {typeLabel}
            </Badge>
            <Badge variant="outline" className="text-[11px]">{op.status}</Badge>
            {op.area && isEdital && <Badge variant="secondary" className="text-[11px]">{op.area}</Badge>}
          </div>
          <SheetTitle className="text-base leading-snug">{op.titulo}</SheetTitle>
          {op.organizador && <SheetDescription>{op.organizador}</SheetDescription>}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Meta básica */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {op.estado && (
              <div>
                <div className="text-muted-foreground inline-flex items-center gap-1 mb-0.5"><MapPin className="h-3 w-3" /> Local</div>
                <div className="font-medium">{op.estado}</div>
              </div>
            )}
            {op.prazo && (
              <div>
                <div className="text-muted-foreground inline-flex items-center gap-1 mb-0.5"><Calendar className="h-3 w-3" /> Prazo</div>
                <div className="font-medium">{formatDate(op.prazo)}</div>
              </div>
            )}
            {op.valor && (
              <div>
                <div className="text-muted-foreground inline-flex items-center gap-1 mb-0.5"><DollarSign className="h-3 w-3" /> {isEdital ? "Valor" : "Cachet médio"}</div>
                <div className="font-medium text-green-700">{op.valor}</div>
              </div>
            )}
            {palco?.porte && (
              <div>
                <div className="text-muted-foreground inline-flex items-center gap-1 mb-0.5"><Users className="h-3 w-3" /> Porte</div>
                <div className="font-medium">{PORTE_LABELS[palco.porte as Porte]}</div>
              </div>
            )}
            {palco?.publico_estimado && (
              <div>
                <div className="text-muted-foreground inline-flex items-center gap-1 mb-0.5"><Users className="h-3 w-3" /> Público estimado</div>
                <div className="font-medium">{palco.publico_estimado}</div>
              </div>
            )}
            {palco?.periodo_inscricao && (
              <div className="col-span-2">
                <div className="text-muted-foreground mb-0.5">Período de inscrição</div>
                <div className="font-medium">{palco.periodo_inscricao}</div>
              </div>
            )}
            {edital?.abertura && (
              <div>
                <div className="text-muted-foreground mb-0.5">Abertura</div>
                <div className="font-medium">{formatDate(edital.abertura)}</div>
              </div>
            )}
          </div>

          {op.generos && op.generos.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 inline-flex items-center gap-1"><Tag className="h-3 w-3" /> Gêneros</div>
                <div className="flex flex-wrap gap-1.5">
                  {op.generos.map((g) => (
                    <Badge key={g} variant="outline" className="text-[11px]">{g}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {op.resumo && (
            <>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 inline-flex items-center gap-1"><FileText className="h-3 w-3" /> Resumo</div>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{op.resumo}</p>
              </div>
            </>
          )}

          {edital?.publico_alvo && (
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Público-alvo</div>
              <p className="text-sm">{edital.publico_alvo}</p>
            </div>
          )}

          {edital?.documentos_resumo && (
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Documentos exigidos</div>
              <p className="text-sm whitespace-pre-wrap">{edital.documentos_resumo}</p>
            </div>
          )}

          {!op.resumo && !edital?.publico_alvo && !edital?.documentos_resumo && (
            <p className="text-xs text-muted-foreground italic">
              Sem detalhes adicionais. Abra o link oficial para o regulamento completo.
            </p>
          )}
        </div>

        {/* Aviso de link quebrado */}
        {linkBroken && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
            <div className="flex-1">
              <div className="font-medium text-foreground">Link oficial indisponível</div>
              <div className="text-muted-foreground">
                A página caiu ou mudou de endereço{linkCheckedLabel ? ` (verificado em ${linkCheckedLabel})` : ""}. Use a busca para encontrar a versão atual.
              </div>
            </div>
          </div>
        )}

        {/* Ações fixas no rodapé */}
        <div className="sticky bottom-0 -mx-6 mt-6 px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center gap-2 flex-wrap">
          {linkBroken ? (
            <Button variant="outline" size="sm" asChild>
              <a href={buildGoogleFallbackUrl(op)} target="_blank" rel="noopener noreferrer">
                <Search className="h-3.5 w-3.5 mr-1.5" /> Buscar no Google
              </a>
            </Button>
          ) : op.link ? (
            <Button variant="outline" size="sm" asChild>
              <a href={op.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir oficial
              </a>
            </Button>
          ) : null}
          {!linkBroken && op.link && op.editalId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              disabled={reporting}
              onClick={handleReportBroken}
              title="Reportar link quebrado"
            >
              {reporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              Reportar link
            </Button>
          )}
          {onSave && op.origem === "ai" && (
            <Button variant="outline" size="sm" onClick={() => onSave(op)}>Salvar</Button>
          )}
          {onApply && (
            alreadyApplied ? (
              <Button size="sm" variant="secondary" disabled className="ml-auto">
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Já no pipeline
              </Button>
            ) : (
              <Button size="sm" className="ml-auto" disabled={pending} onClick={() => onApply(op)}>
                {pending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5 mr-1.5" />}
                {isEdital ? "Iniciar candidatura" : "Marcar interesse"}
              </Button>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
