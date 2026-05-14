import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Link2, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VisualBriefing } from "./types";

interface Props {
  briefing: VisualBriefing;
  onBack: () => void;
}

export default function BriefingStep({ briefing, onBack }: Props) {
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(briefing.pdf_url ?? null);

  const selected = (briefing.approved_images?.length ? briefing.approved_images : briefing.generated_images?.filter((i) => i.selected)) ?? [];
  const palette = briefing.generated_palette;

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-visual-briefing", {
        body: { briefing_id: briefing.id },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("URL não retornada");
      setPdfUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Briefing PDF gerado");
    } catch (e: any) {
      toast.error("Não foi possível gerar o PDF", { description: e?.message });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!pdfUrl) {
      toast.error("Gere o PDF antes de copiar o link");
      return;
    }
    try {
      await navigator.clipboard.writeText(pdfUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <header className="space-y-1 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold">Briefing de Direção Visual</h2>
          <p className="text-xs text-muted-foreground">Entregue ao seu designer. Inclui referências, paleta, copy e notas.</p>
        </header>

        <section className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Gêneros</p>
            <p>{briefing.artistic_profile?.genres?.join(" · ") || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Mood</p>
            <p>{briefing.artistic_profile?.moods?.join(" · ") || "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Artistas de referência</p>
            <p>{briefing.artistic_profile?.artist_refs || "—"}</p>
          </div>
          {briefing.artistic_profile?.identity_phrase && (
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Frase identitária</p>
              <p className="italic">"{briefing.artistic_profile.identity_phrase}"</p>
            </div>
          )}
        </section>

        {selected.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Referências de estilo aprovadas</p>
            <div className="grid grid-cols-3 gap-2">
              {selected.map((img) => (
                <div key={img.id} className="aspect-square rounded-md overflow-hidden border border-border">
                  <img src={img.url} alt={`Referência de estilo — ${img.style_tag}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {palette?.colors?.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Paleta</p>
            <div className="flex flex-wrap gap-2">
              {palette.colors.map((hex) => (
                <div key={hex} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: hex }} />
                  <span className="text-xs font-mono">{hex}</span>
                </div>
              ))}
            </div>
            {palette.rationale && <p className="text-xs text-muted-foreground">{palette.rationale}</p>}
          </section>
        )}

        {briefing.approved_copy && (
          <section className="space-y-1">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Copy aprovada</p>
            <p className="text-sm whitespace-pre-wrap">{briefing.approved_copy}</p>
          </section>
        )}

        {briefing.designer_notes && (
          <section className="space-y-1">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Notas para o designer</p>
            <p className="text-sm whitespace-pre-wrap">{briefing.designer_notes}</p>
          </section>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Editar revisão</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? "Gerando…" : "Baixar PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!pdfUrl}>
            <Link2 className="h-4 w-4 mr-1.5" /> Copiar link
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" disabled className="opacity-60 cursor-not-allowed">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Enviar a designer
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Em breve — marketplace de designers parceiros</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
