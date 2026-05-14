import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Link2, ExternalLink, RefreshCw, FileText, Share2, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VisualBriefing } from "./types";

interface Props {
  briefing: VisualBriefing;
  onBack: () => void;
}

const TTL_PRESETS: { value: number; label: string }[] = [
  { value: 1, label: "1 hora" },
  { value: 24, label: "24 horas" },
  { value: 24 * 7, label: "7 dias" },
  { value: 24 * 30, label: "30 dias" },
];

export default function BriefingStep({ briefing, onBack }: Props) {
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(briefing.pdf_url ?? null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpires, setShareExpires] = useState<string | null>(null);
  const [shareTtl, setShareTtl] = useState<number>(24);
  const [creatingShare, setCreatingShare] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);

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
      toast.success("Link do PDF copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleCreateShare = async () => {
    setCreatingShare(true);
    try {
      // Garante que o PDF existe (assim o link público já consegue exibir prévia/baixar)
      if (!pdfUrl) await handleExport();
      const { data, error } = await supabase.functions.invoke("share-visual-briefing", {
        body: { briefing_id: briefing.id, ttl_hours: shareTtl },
      });
      if (error) throw error;
      const token = (data as { token?: string })?.token;
      const expiresAt = (data as { expires_at?: string })?.expires_at ?? null;
      if (!token) throw new Error("Token não retornado");
      const url = `${window.location.origin}/briefing/share/${token}`;
      setShareUrl(url);
      setShareExpires(expiresAt);
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      toast.success("Link de compartilhamento gerado e copiado");
      setSharePopoverOpen(false);
    } catch (e: any) {
      toast.error("Não foi possível gerar o link", { description: e?.message });
    } finally {
      setCreatingShare(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
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

      {pdfUrl && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2 min-w-0">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">PDF gerado</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir PDF do briefing em nova aba"
                      className="block font-mono text-xs text-muted-foreground hover:text-foreground underline truncate max-w-[420px]"
                    >
                      {pdfUrl}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[480px] break-all">{pdfUrl}</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">Link expira em 1h</Badge>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
              Ver preview
            </summary>
            <iframe
              src={pdfUrl}
              title="Preview do briefing PDF"
              aria-label="Preview do briefing PDF"
              className="w-full h-[480px] rounded-md border border-border mt-2 bg-background"
            />
          </details>
        </div>
      )}

      {shareUrl && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2 min-w-0">
              <Share2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Link de compartilhamento</p>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-mono text-xs text-muted-foreground hover:text-foreground underline truncate max-w-[420px]"
                >
                  {shareUrl}
                </a>
              </div>
            </div>
            {shareExpires && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                Expira em {new Date(shareExpires).toLocaleString("pt-BR")}
              </Badge>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleCopyShareUrl}>
              <Link2 className="h-4 w-4 mr-1.5" /> Copiar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Editar revisão</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {pdfUrl ? <RefreshCw className={`h-4 w-4 mr-1.5 ${exporting ? "animate-spin" : ""}`} /> : <Download className="h-4 w-4 mr-1.5" />}
            {exporting ? "Gerando…" : pdfUrl ? "Regenerar PDF" : "Baixar PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!pdfUrl}>
            <Link2 className="h-4 w-4 mr-1.5" /> Copiar link PDF
          </Button>

          <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" disabled={creatingShare || exporting}>
                {creatingShare ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Share2 className="h-4 w-4 mr-1.5" />}
                Compartilhar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div>
                <Label className="text-xs">Validade do link</Label>
                <RadioGroup
                  value={String(shareTtl)}
                  onValueChange={(v) => setShareTtl(Number(v))}
                  className="mt-2 space-y-1.5"
                >
                  {TTL_PRESETS.map((p) => (
                    <div key={p.value} className="flex items-center gap-2">
                      <RadioGroupItem value={String(p.value)} id={`ttl-${p.value}`} />
                      <Label htmlFor={`ttl-${p.value}`} className="text-xs font-normal cursor-pointer">{p.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <Button size="sm" className="w-full" onClick={handleCreateShare} disabled={creatingShare}>
                {creatingShare ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Share2 className="h-4 w-4 mr-1.5" />}
                Gerar link
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Quem tiver o link verá o briefing e o PDF até a data de expiração.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
