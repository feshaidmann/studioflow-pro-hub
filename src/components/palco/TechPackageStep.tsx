import { useRef, useState } from "react";
import { Sparkles, Loader2, Plus, Trash2, Download, Mic2, Map, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PalcoTechPackage, RiderChannel, StageMapItem, OrcamentoItem } from "@/hooks/usePalcoProposal";

interface Props {
  tech: PalcoTechPackage;
  cacheBruto: number;
  numMusicos: number;
  formacaoDescricao: string;
  projectId?: string | null;
  palcoTitulo: string;
  onChange: (patch: Partial<PalcoTechPackage>) => void;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const newId = () => Math.random().toString(36).slice(2, 10);

export default function TechPackageStep({
  tech, cacheBruto, numMusicos, formacaoDescricao, projectId, palcoTitulo, onChange,
}: Props) {
  const [generatingRider, setGeneratingRider] = useState(false);
  const stageRef = useRef<SVGSVGElement | null>(null);

  // ── Rider ─────────────────────────────────────────────────────────────────
  const handleGenerateRider = async () => {
    setGeneratingRider(true);
    try {
      const { data, error } = await supabase.functions.invoke("palco-pitch-generate", {
        body: {
          action: "generate_rider_template",
          palco: { titulo: palcoTitulo, orgao: "", estado: null, resumo: null },
          project_id: projectId || null,
          proposal_data: {
            num_musicos: numMusicos,
            formacao_descricao: formacaoDescricao,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = data?.rider;
      if (!r) throw new Error("Resposta vazia da IA");
      onChange({
        rider: {
          channels: Array.isArray(r.channels) ? r.channels.map((c: any, i: number) => ({
            n: c.n || i + 1, fonte: c.fonte || "", mic_di: c.mic_di || "", obs: c.obs || "",
          })) : [],
          monitors: r.monitors || "",
          pa_min: r.pa_min || "",
          obs: r.obs || "",
        },
      });
      toast.success("Rider sugerido — ajuste à vontade");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar o rider");
    } finally {
      setGeneratingRider(false);
    }
  };

  const addChannel = () => {
    const next: RiderChannel[] = [
      ...tech.rider.channels,
      { n: tech.rider.channels.length + 1, fonte: "", mic_di: "", obs: "" },
    ];
    onChange({ rider: { ...tech.rider, channels: next } });
  };
  const updateChannel = (idx: number, patch: Partial<RiderChannel>) => {
    const next = tech.rider.channels.map((c, i) => i === idx ? { ...c, ...patch } : c);
    onChange({ rider: { ...tech.rider, channels: next } });
  };
  const removeChannel = (idx: number) => {
    const next = tech.rider.channels.filter((_, i) => i !== idx).map((c, i) => ({ ...c, n: i + 1 }));
    onChange({ rider: { ...tech.rider, channels: next } });
  };

  // ── Stage Map ─────────────────────────────────────────────────────────────
  const addStageItem = () => {
    const items: StageMapItem[] = [
      ...tech.stage_map.items,
      { id: newId(), label: "Novo", x: 200, y: 150 },
    ];
    onChange({ stage_map: { items } });
  };
  const updateStageItem = (id: string, patch: Partial<StageMapItem>) => {
    const items = tech.stage_map.items.map((it) => it.id === id ? { ...it, ...patch } : it);
    onChange({ stage_map: { items } });
  };
  const removeStageItem = (id: string) => {
    const items = tech.stage_map.items.filter((it) => it.id !== id);
    onChange({ stage_map: { items } });
  };

  const exportStageMapPng = () => {
    const svg = stageRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800; canvas.height = 500;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `mapa-palco-${palcoTitulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Orçamento ─────────────────────────────────────────────────────────────
  const addOrcItem = (tipo: "receita" | "despesa") => {
    const items: OrcamentoItem[] = [
      ...tech.orcamento.items,
      { id: newId(), label: "", valor: 0, tipo },
    ];
    onChange({ orcamento: { items } });
  };
  const updateOrcItem = (id: string, patch: Partial<OrcamentoItem>) => {
    const items = tech.orcamento.items.map((it) => it.id === id ? { ...it, ...patch } : it);
    onChange({ orcamento: { items } });
  };
  const removeOrcItem = (id: string) => {
    const items = tech.orcamento.items.filter((it) => it.id !== id);
    onChange({ orcamento: { items } });
  };

  const totalReceitas = tech.orcamento.items.filter((i) => i.tipo === "receita").reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const totalDespesas = tech.orcamento.items.filter((i) => i.tipo === "despesa").reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const margem = cacheBruto + totalReceitas - totalDespesas;
  const margemPct = cacheBruto > 0 ? Math.round((margem / cacheBruto) * 100) : 0;

  // Drag state for stage map
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const onSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingId || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 500;
    updateStageItem(draggingId, { x: Math.max(20, Math.min(780, x)), y: Math.max(20, Math.min(480, y)) });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold inline-flex items-center gap-1.5"><Mic2 className="h-4 w-4" /> Pacote Técnico</h2>
          <p className="text-xs text-muted-foreground">Rider de áudio, mapa de palco e orçamento interno.</p>
        </div>

        <Tabs defaultValue="rider" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="rider"><Mic2 className="h-3 w-3 mr-1" /> Rider</TabsTrigger>
            <TabsTrigger value="map"><Map className="h-3 w-3 mr-1" /> Mapa de palco</TabsTrigger>
            <TabsTrigger value="orc"><Calculator className="h-3 w-3 mr-1" /> Orçamento</TabsTrigger>
          </TabsList>

          {/* ── Rider ─────────────────────────────────────────────────── */}
          <TabsContent value="rider" className="space-y-3 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">Canais de entrada, monitores e P.A.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addChannel}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Canal
                </Button>
                <Button size="sm" onClick={handleGenerateRider} disabled={generatingRider}>
                  {generatingRider ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Sugerir com IA
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[36px_1fr_1fr_1fr_36px] gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground px-1">
                <div>Nº</div><div>Fonte</div><div>Mic / DI</div><div>Obs</div><div></div>
              </div>
              {tech.rider.channels.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  Sem canais. Adicione manualmente ou peça uma sugestão à IA.
                </p>
              ) : tech.rider.channels.map((c, idx) => (
                <div key={idx} className="grid grid-cols-[36px_1fr_1fr_1fr_36px] gap-1.5 items-center">
                  <div className="text-xs text-center text-muted-foreground">{c.n}</div>
                  <Input value={c.fonte} onChange={(e) => updateChannel(idx, { fonte: e.target.value })} className="h-8 text-xs" placeholder="Vocal, Violão, Bumbo..." />
                  <Input value={c.mic_di} onChange={(e) => updateChannel(idx, { mic_di: e.target.value })} className="h-8 text-xs" placeholder="SM58, DI ativa..." />
                  <Input value={c.obs || ""} onChange={(e) => updateChannel(idx, { obs: e.target.value })} className="h-8 text-xs" placeholder="—" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeChannel(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monitores</Label>
                <Textarea
                  value={tech.rider.monitors}
                  onChange={(e) => onChange({ rider: { ...tech.rider, monitors: e.target.value } })}
                  rows={3} placeholder="Ex.: 3 monitores de retorno, 1 por músico"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">P.A. mínimo</Label>
                <Textarea
                  value={tech.rider.pa_min}
                  onChange={(e) => onChange({ rider: { ...tech.rider, pa_min: e.target.value } })}
                  rows={3} placeholder="Ex.: P.A. estéreo compatível com público de até 500 pessoas"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações gerais</Label>
              <Textarea
                value={tech.rider.obs}
                onChange={(e) => onChange({ rider: { ...tech.rider, obs: e.target.value } })}
                rows={2} placeholder="Passagem de som, equipe técnica, energia..."
                className="mt-1 text-xs"
              />
            </div>
          </TabsContent>

          {/* ── Stage Map ─────────────────────────────────────────────── */}
          <TabsContent value="map" className="space-y-3 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Clique e arraste os elementos para posicioná-los no palco.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addStageItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Elemento
                </Button>
                <Button size="sm" variant="outline" onClick={exportStageMapPng} disabled={tech.stage_map.items.length === 0}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PNG
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-md overflow-hidden bg-card">
              <svg
                ref={stageRef}
                viewBox="0 0 800 500"
                className="w-full h-auto select-none cursor-default"
                onMouseMove={onSvgMouseMove}
                onMouseUp={() => setDraggingId(null)}
                onMouseLeave={() => setDraggingId(null)}
              >
                {/* Stage outline */}
                <rect x="20" y="20" width="760" height="460" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="8" />
                <text x="400" y="40" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">FRENTE DO PALCO / PÚBLICO ↓</text>
                <line x1="20" y1="460" x2="780" y2="460" stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                <text x="400" y="478" textAnchor="middle" fill="hsl(var(--primary))" fontSize="11">PÚBLICO</text>

                {tech.stage_map.items.map((it) => (
                  <g
                    key={it.id}
                    transform={`translate(${it.x},${it.y})`}
                    onMouseDown={() => setDraggingId(it.id)}
                    className="cursor-move"
                  >
                    <circle r="28" fill="hsl(var(--primary))" fillOpacity="0.15" stroke="hsl(var(--primary))" strokeWidth="2" />
                    <text textAnchor="middle" dy="4" fontSize="11" fill="hsl(var(--foreground))" pointerEvents="none">
                      {it.label.slice(0, 10)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="space-y-1.5">
              {tech.stage_map.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2">
                  <Input
                    value={it.label}
                    onChange={(e) => updateStageItem(it.id, { label: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex.: Vocal, Bateria, Monitor..."
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeStageItem(it.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Orçamento ─────────────────────────────────────────────── */}
          <TabsContent value="orc" className="space-y-3 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">Custos do show. Cachê bruto entra automaticamente.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addOrcItem("receita")}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Receita extra
                </Button>
                <Button size="sm" variant="outline" onClick={() => addOrcItem("despesa")}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Despesa
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              {tech.orcamento.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  Sem itens. Adicione despesas (sideman, transporte, hospedagem...) ou receitas extras.
                </p>
              ) : tech.orcamento.items.map((it) => (
                <div key={it.id} className="grid grid-cols-[80px_1fr_140px_36px] gap-1.5 items-center">
                  <div className={`text-[10px] uppercase tracking-wide text-center px-1 py-1 rounded ${
                    it.tipo === "receita" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}>
                    {it.tipo === "receita" ? "Receita" : "Despesa"}
                  </div>
                  <Input
                    value={it.label}
                    onChange={(e) => updateOrcItem(it.id, { label: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex.: Sideman, Transporte..."
                  />
                  <Input
                    type="number" min={0} step={10}
                    value={it.valor || ""}
                    onChange={(e) => updateOrcItem(it.id, { valor: Number(e.target.value) || 0 })}
                    className="h-8 text-xs text-right"
                    placeholder="0,00"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeOrcItem(it.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Cachê bruto</div>
                <div className="font-semibold">{formatBRL(cacheBruto)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">+ Receitas extras</div>
                <div className="font-semibold text-success">{formatBRL(totalReceitas)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">− Despesas</div>
                <div className="font-semibold text-destructive">{formatBRL(totalDespesas)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Margem ({margemPct}%)</div>
                <div className={`font-semibold ${margem >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatBRL(margem)}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
