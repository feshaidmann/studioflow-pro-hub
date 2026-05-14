import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check } from "lucide-react";
import { VisualBriefing } from "./types";

interface Props {
  briefing: VisualBriefing;
  onToggleImage: (id: string) => void;
  onRegenerate: () => void;
  onNext: () => void;
  regenerating?: boolean;
}

export default function GenerationStep({ briefing, onToggleImage, onRegenerate, onNext, regenerating }: Props) {
  const images = briefing.generated_images ?? [];
  const selectedCount = images.filter((i) => i.selected).length;
  const regenLeft = 5 - (briefing.regeneration_count ?? 0);

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
        ⚠️ Todas as imagens são <strong>Referências de estilo</strong> geradas por IA — não são arte final. Servem para alinhar a direção visual com seu designer.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onToggleImage(img.id)}
            className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-square bg-muted ${
              img.selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
            }`}
            aria-pressed={!!img.selected}
            aria-label={`${img.selected ? "Desmarcar" : "Selecionar"} referência: ${img.style_tag}`}
          >
            {img.url ? (
              <img src={img.url} alt={`Referência de estilo — ${img.style_tag}`} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Falha ao gerar</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Referência de estilo</p>
              <p className="text-xs text-white font-medium truncate">{img.style_tag}</p>
            </div>
            {img.selected && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            )}
          </button>
        ))}
      </div>

      {briefing.copy_options?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Sugestões de copy</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {briefing.copy_options.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                <Badge variant="outline" className="text-[10px]">{c.id} · {c.label}</Badge>
                <p className="text-xs text-foreground/80 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>Regenerações: {briefing.regeneration_count}/5</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating || regenLeft <= 0}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Gerando…" : `Regenerar (${regenLeft} restantes)`}
          </Button>
          <Button size="sm" onClick={onNext} disabled={selectedCount === 0}>
            Revisar →
          </Button>
        </div>
      </div>
    </div>
  );
}
