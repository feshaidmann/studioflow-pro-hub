import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Play, Edit3, Trash2, Loader2, Globe, Clock } from "lucide-react";

interface Fonte {
  id: string;
  nome: string;
  url_base: string;
  tipo: string;
  ativo: boolean;
  frequencia_horas: number;
  ultima_busca: string | null;
  parametros: any;
}

export default function FontesTab() {
  const [list, setList] = useState<Fonte[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Fonte | null>(null);
  const [running, setRunning] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fontes_editais")
      .select("id,nome,url_base,tipo,ativo,frequencia_horas,ultima_busca,parametros")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Fonte[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  function openNew() {
    setEditing({
      id: "", nome: "", url_base: "", tipo: "portal",
      ativo: true, frequencia_horas: 168, ultima_busca: null, parametros: {},
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.nome.trim() || !editing.url_base.trim()) {
      toast.error("Nome e URL são obrigatórios"); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada"); return; }
    const payload: any = {
      nome: editing.nome,
      url_base: editing.url_base,
      tipo: editing.tipo,
      ativo: editing.ativo,
      frequencia_horas: editing.frequencia_horas,
      parametros: editing.parametros ?? {},
    };
    if (editing.id) {
      const { error } = await supabase.from("fontes_editais").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.user_id = user.id;
      const { error } = await supabase.from("fontes_editais").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo");
    setEditing(null);
    await fetchAll();
  }

  async function remove(id: string) {
    if (!confirm("Remover fonte?")) return;
    const { error } = await supabase.from("fontes_editais").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    await fetchAll();
  }

  async function runNow(f: Fonte) {
    setRunning((s) => new Set(s).add(f.id));
    const t = toast.loading(`Rodando ${f.nome}...`);
    try {
      const { data, error } = await supabase.functions.invoke("crawl-fontes-editais", {
        body: { fonte_id: f.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${f.nome}: ${data?.created ?? 0} novo(s), ${data?.skipped ?? 0} ignorado(s)`, { id: t });
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha", { id: t });
    } finally {
      setRunning((s) => { const n = new Set(s); n.delete(f.id); return n; });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Cadastre portais (FUNARTE, Natura Musical, secretarias) — o crawler busca, analisa com IA e envia para a fila <em>Pendente de revisão</em>.
        </p>
        <Button size="sm" onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova fonte</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && <div className="p-6 text-sm text-muted-foreground text-center">Carregando...</div>}
          {!loading && list.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">
              Nenhuma fonte cadastrada ainda. Clique em "Nova fonte" para começar.
            </div>
          )}
          <div className="divide-y">
            {list.map((f) => (
              <div key={f.id} className="p-4 flex items-center gap-3 flex-wrap">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{f.nome}</p>
                    <Badge variant="outline" className="text-[10px]">{f.tipo}</Badge>
                    {!f.ativo && <Badge variant="outline" className="text-[10px] text-muted-foreground">pausada</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{f.url_base}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" /> a cada {f.frequencia_horas}h
                    {f.ultima_busca && ` · última: ${new Date(f.ultima_busca).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => runNow(f)} disabled={running.has(f.id)} className="gap-1">
                  {running.has(f.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Rodar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(f)}><Edit3 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Editar" : "Nova"} fonte</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-3 mt-4">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Ex: FUNARTE - editais abertos" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL base *</Label>
                <Input value={editing.url_base} onChange={(e) => setEditing({ ...editing, url_base: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={editing.tipo} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Portal (HTML)</SelectItem>
                    <SelectItem value="lista">Lista paginada</SelectItem>
                    <SelectItem value="rss">RSS / feed</SelectItem>
                    <SelectItem value="manual">Manual (só hub de links)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frequência (horas)</Label>
                <Input type="number" min={1} value={editing.frequencia_horas} onChange={(e) => setEditing({ ...editing, frequencia_horas: parseInt(e.target.value) || 168 })} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label className="text-xs">Ativa (cron diário verifica e roda)</Label>
                <Switch checked={editing.ativo} onCheckedChange={(c) => setEditing({ ...editing, ativo: c })} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
