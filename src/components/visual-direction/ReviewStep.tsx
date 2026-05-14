import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ArrowDownToLine } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VisualBriefing, CopyOption, PaletteResult } from "./types";

interface Props {
  briefing: VisualBriefing;
  onRemoveImage: (id: string) => void;
  onSave: (data: { approved_copy: string; designer_notes: string }) => Promise<void>;
  onChange?: (data: {
    approved_copy?: string;
    designer_notes?: string;
    generated_palette?: PaletteResult;
    copy_options?: CopyOption[];
  }) => void;
  onBack: () => void;
  saving?: boolean;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_COLORS = 8;

export default function ReviewStep({ briefing, onRemoveImage, onSave, onChange, onBack, saving }: Props) {
  const selected = (briefing.generated_images ?? []).filter((i) => i.selected);
  const initialCopy = useMemo<CopyOption | undefined>(() => briefing.copy_options?.[0], [briefing.copy_options]);

  const [copy, setCopy] = useState(briefing.approved_copy || initialCopy?.text || "");
  const [notes, setNotes] = useState(briefing.designer_notes || "");
  const [palette, setPalette] = useState<PaletteResult>(
    briefing.generated_palette ?? { colors: [], rationale: "" }
  );
  const [copyOptions, setCopyOptions] = useState<CopyOption[]>(briefing.copy_options ?? []);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Per-color local hex draft (so invalid input doesn't autosave)
  const [hexDrafts, setHexDrafts] = useState<Record<number, string>>({});

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onChange?.({
      approved_copy: copy,
      designer_notes: notes,
      generated_palette: palette,
      copy_options: copyOptions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy, notes, palette, copyOptions]);

  const isUnchangedFromOriginal = copyOptions.some((c) => c.text.trim() === copy.trim());

  const handleNext = () => {
    if (isUnchangedFromOriginal) setConfirmOpen(true);
    else void onSave({ approved_copy: copy, designer_notes: notes });
  };

  const commitColor = (idx: number, raw: string) => {
    const v = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
    if (!HEX_RE.test(v)) {
      // revert draft
      setHexDrafts((d) => ({ ...d, [idx]: palette.colors[idx] ?? "" }));
      return;
    }
    setPalette((p) => ({ ...p, colors: p.colors.map((c, i) => (i === idx ? v.toLowerCase() : c)) }));
    setHexDrafts((d) => {
      const { [idx]: _, ...rest } = d;
      return rest;
    });
  };

  const removeColor = (idx: number) => {
    setPalette((p) => ({ ...p, colors: p.colors.filter((_, i) => i !== idx) }));
  };

  const addColor = () => {
    if (palette.colors.length >= MAX_COLORS) return;
    setPalette((p) => ({ ...p, colors: [...p.colors, "#cccccc"] }));
  };

  const updateOption = (idx: number, patch: Partial<CopyOption>) => {
    setCopyOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  return (
    <div className="space-y-6">
      {/* Imagens aprovadas */}
      <div className="space-y-2">
        <Label>Imagens aprovadas ({selected.length})</Label>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma referência selecionada. Volte e escolha pelo menos uma.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((img) => (
              <div key={img.id} className="relative w-24 h-24 rounded-md overflow-hidden border border-border group">
                <img src={img.url} alt={`Referência de estilo — ${img.style_tag}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  aria-label={`Remover referência ${img.style_tag}`}
                  className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                  <p className="text-[9px] text-white truncate">{img.style_tag}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paleta editável */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Paleta ({palette.colors.length}/{MAX_COLORS})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addColor} disabled={palette.colors.length >= MAX_COLORS}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar cor
          </Button>
        </div>

        {palette.colors.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem cores ainda — adicione manualmente ou regenere as referências.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {palette.colors.map((hex, idx) => {
              const draft = hexDrafts[idx] ?? hex;
              const invalid = !HEX_RE.test(draft);
              return (
                <div key={idx} className="flex items-center gap-1.5 rounded-md border border-border bg-card pl-1 pr-1.5 py-1">
                  <div
                    className="w-7 h-7 rounded shrink-0 border border-border"
                    style={{ backgroundColor: HEX_RE.test(hex) ? hex : "#cccccc" }}
                    aria-label={`Cor ${hex}`}
                  />
                  <Input
                    value={draft}
                    onChange={(e) => setHexDrafts((d) => ({ ...d, [idx]: e.target.value }))}
                    onBlur={(e) => commitColor(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setHexDrafts((d) => ({ ...d, [idx]: hex }));
                    }}
                    spellCheck={false}
                    className={`h-7 w-24 font-mono text-xs px-2 ${invalid ? "border-destructive text-destructive" : ""}`}
                    aria-label={`Cor ${idx + 1} em hexadecimal`}
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(idx)}
                    aria-label={`Remover cor ${hex}`}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Textarea
          rows={2}
          value={palette.rationale ?? ""}
          onChange={(e) => setPalette((p) => ({ ...p, rationale: e.target.value }))}
          placeholder="Justificativa da paleta (opcional)…"
          className="text-xs"
        />
      </div>

      {/* Opções de copy editáveis */}
      <div className="space-y-2">
        <Label>Opções de copy</Label>
        <div className="grid gap-3 md:grid-cols-3">
          {copyOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground col-span-full">Nenhuma opção gerada — regenere as referências.</p>
          ) : copyOptions.map((opt, idx) => (
            <div key={opt.id ?? idx} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] shrink-0">{opt.id}</Badge>
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(idx, { label: e.target.value.slice(0, 24) })}
                  className="h-7 text-xs"
                  placeholder="Tom"
                  aria-label={`Rótulo da opção ${opt.id}`}
                />
              </div>
              <Textarea
                rows={4}
                value={opt.text}
                onChange={(e) => updateOption(idx, { text: e.target.value })}
                className="text-xs"
                aria-label={`Texto da opção ${opt.id}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[11px]"
                onClick={() => setCopy(opt.text)}
              >
                <ArrowDownToLine className="h-3 w-3 mr-1" /> Usar como copy aprovada
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Copy aprovada final */}
      <div className="space-y-2">
        <Label htmlFor="approved-copy">Copy aprovada (edite à vontade)</Label>
        <Textarea id="approved-copy" rows={4} value={copy} onChange={(e) => setCopy(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="designer-notes">Notas para o designer <span className="text-xs text-muted-foreground">(opcional)</span></Label>
        <Textarea id="designer-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Restrições, prazos, formatos finais desejados, faixas a evitar…" />
      </div>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
        <Button size="sm" onClick={handleNext} disabled={selected.length === 0 || saving || !copy.trim()}>
          {saving ? "Salvando…" : "Gerar briefing →"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usar a copy gerada sem editar?</AlertDialogTitle>
            <AlertDialogDescription>
              A copy aprovada está idêntica a uma das sugestões da IA. Recomendamos personalizar com a sua voz antes de enviar ao designer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Editar antes</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); void onSave({ approved_copy: copy, designer_notes: notes }); }}>
              Usar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
