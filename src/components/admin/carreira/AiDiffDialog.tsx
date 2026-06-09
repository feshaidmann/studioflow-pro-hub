import { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";

interface AnaliseFields {
  resumo?: string | null;
  valor?: string | null;
  publico_alvo?: string | null;
  prazo?: string | null;
  documentos_resumo?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: AnaliseFields;
  ai: AnaliseFields | null;
  busy?: boolean;
  onApply: (selectedPatch: AnaliseFields) => void;
}

const FIELDS: Array<{ key: keyof AnaliseFields; label: string; multiline?: boolean }> = [
  { key: "resumo", label: "Resumo", multiline: true },
  { key: "valor", label: "Valor" },
  { key: "publico_alvo", label: "Público-alvo", multiline: true },
  { key: "prazo", label: "Prazo (YYYY-MM-DD)" },
  { key: "documentos_resumo", label: "Documentos exigidos", multiline: true },
];

export default function AiDiffDialog({ open, onOpenChange, current, ai, busy, onApply }: Props) {
  const initial = useMemo(() => {
    const sel: Record<string, boolean> = {};
    const vals: Record<string, string> = {};
    for (const f of FIELDS) {
      const cur = (current[f.key] ?? "") + "";
      const sug = (ai?.[f.key] ?? "") + "";
      const hasChange = sug && sug.trim() !== "" && sug.trim() !== cur.trim();
      sel[f.key] = !!hasChange;
      vals[f.key] = sug || cur;
    }
    return { sel, vals };
  }, [current, ai]);

  const [selected, setSelected] = useState(initial.sel);
  const [values, setValues] = useState(initial.vals);

  useEffect(() => {
    setSelected(initial.sel);
    setValues(initial.vals);
  }, [initial]);

  function handleApply() {
    const patch: AnaliseFields = {};
    for (const f of FIELDS) {
      if (selected[f.key]) (patch as any)[f.key] = values[f.key] || null;
    }
    onApply(patch);
  }

  const changedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Revisar sugestões da IA
          </DialogTitle>
          <DialogDescription>
            Marque os campos que deseja sobrescrever. Você pode editar o valor final antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        {busy && !ai ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Aguardando resposta da IA...
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] -mx-2 px-2">
            <div className="space-y-3">
              {FIELDS.map((f) => {
                const cur = (current[f.key] ?? "") + "";
                const sug = (ai?.[f.key] ?? "") + "";
                const hasChange = sug && sug.trim() !== cur.trim();
                return (
                  <div key={f.key as string} className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sel-${f.key}`}
                          checked={selected[f.key as string]}
                          onCheckedChange={(c) => setSelected((p) => ({ ...p, [f.key]: !!c }))}
                          disabled={!hasChange}
                        />
                        <Label htmlFor={`sel-${f.key}`} className="font-semibold text-sm">{f.label}</Label>
                      </div>
                      {!hasChange && <span className="text-[10px] text-muted-foreground">sem alteração</span>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Atual</p>
                        <div className="text-xs p-2 bg-background border rounded min-h-[60px] whitespace-pre-wrap text-muted-foreground">
                          {cur || <em className="opacity-50">vazio</em>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-primary uppercase mb-1">IA sugere (editável)</p>
                        {f.multiline ? (
                          <Textarea
                            rows={3}
                            value={values[f.key as string] || ""}
                            onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                            disabled={!selected[f.key as string]}
                            className="text-xs"
                          />
                        ) : (
                          <input
                            value={values[f.key as string] || ""}
                            onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                            disabled={!selected[f.key as string]}
                            className="w-full text-xs px-2 py-2 border rounded bg-background disabled:opacity-50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={changedCount === 0 || busy}>
            Aplicar {changedCount} alteração(ões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
