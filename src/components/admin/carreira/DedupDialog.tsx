import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeName } from "./urgencyScore";
import { Combine, Loader2 } from "lucide-react";

interface RowLike {
  id: string;
  [k: string]: any;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: RowLike[];
  kind: "edital" | "palco";
  onDone: () => void;
}

interface Cluster {
  key: string;
  items: RowLike[];
}

function buildClusters(rows: RowLike[], kind: "edital" | "palco"): Cluster[] {
  const map = new Map<string, RowLike[]>();
  for (const r of rows) {
    const a = kind === "edital" ? r.titulo : r.nome;
    const b = kind === "edital" ? r.orgao : r.organizador;
    const key = `${normalizeName(a)}::${normalizeName(b)}`;
    if (!key || key === "::") continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([key, items]) => ({ key, items }));
}

export default function DedupDialog({ open, onOpenChange, rows, kind, onDone }: Props) {
  const clusters = useMemo(() => buildClusters(rows, kind), [rows, kind]);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function mergeCluster(c: Cluster) {
    const keepId = keep[c.key] || c.items[0].id;
    const toArchive = c.items.filter((i) => i.id !== keepId).map((i) => i.id);
    const table = kind === "edital" ? "editais" : "palcos_curados";
    const { error } = await supabase
      .from(table)
      .update({ archived_at: new Date().toISOString() })
      .in("id", toArchive);
    if (error) throw new Error(error.message);
    return toArchive.length;
  }

  async function mergeAll() {
    setBusy(true);
    try {
      let total = 0;
      for (const c of clusters) total += await mergeCluster(c);
      toast.success(`${total} duplicado(s) arquivado(s)`);
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao mesclar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Combine className="h-5 w-5" /> Duplicados detectados
          </DialogTitle>
          <DialogDescription>
            {clusters.length === 0
              ? "Nenhum duplicado encontrado (heurística por título + órgão normalizados)."
              : `${clusters.length} grupo(s) com possíveis duplicatas. Escolha qual manter em cada grupo — os demais serão arquivados (soft delete).`}
          </DialogDescription>
        </DialogHeader>

        {clusters.length > 0 && (
          <ScrollArea className="max-h-[55vh] -mx-2 px-2">
            <div className="space-y-4">
              {clusters.map((c) => (
                <div key={c.key} className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">{c.items.length} itens</p>
                  <RadioGroup
                    value={keep[c.key] || c.items[0].id}
                    onValueChange={(v) => setKeep((p) => ({ ...p, [c.key]: v }))}
                  >
                    {c.items.map((it) => {
                      const name = kind === "edital" ? it.titulo : it.nome;
                      const sub = kind === "edital" ? it.orgao : it.organizador;
                      return (
                        <div key={it.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                          <RadioGroupItem value={it.id} id={it.id} className="mt-1" />
                          <Label htmlFor={it.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{name}</span>
                              {it.link_status === "ok" && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">link ok</Badge>}
                              {it.resumo && <Badge variant="outline" className="text-[10px]">resumo</Badge>}
                              {it.prazo && <Badge variant="outline" className="text-[10px]">prazo {it.prazo}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{sub} · criado {new Date(it.created_at).toLocaleDateString("pt-BR")}</p>
                            {it.link && <p className="text-[10px] text-muted-foreground truncate">{it.link}</p>}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {clusters.length > 0 && (
            <Button onClick={mergeAll} disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Arquivar duplicados ({clusters.reduce((s, c) => s + c.items.length - 1, 0)})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
