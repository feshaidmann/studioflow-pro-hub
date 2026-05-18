import { useState } from "react";
import { Sparkles, Loader2, DollarSign, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import type { PalcoProposal } from "@/hooks/usePalcoProposal";

interface Props {
  proposal: PalcoProposal;
  palco: { titulo: string; orgao: string; estado: string | null; resumo: string | null };
  cachetMedioPalco?: string | null;
  projectId?: string | null;
  artistName: string;
  onChange: (patch: Partial<PalcoProposal>) => void;
  onNext: () => void;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CommercialProposalStep({
  proposal, palco, cachetMedioPalco, projectId, artistName, onChange, onNext,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const setCondicoes = (patch: Partial<PalcoProposal["condicoes"]>) =>
    onChange({ condicoes: { ...proposal.condicoes, ...patch } });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("palco-pitch-generate", {
        body: {
          action: "generate_commercial_proposal",
          palco: { titulo: palco.titulo, orgao: palco.orgao, estado: palco.estado, resumo: palco.resumo },
          project_id: projectId || null,
          proposal_data: {
            cache_bruto: proposal.cache_bruto,
            num_musicos: proposal.condicoes.num_musicos,
            duracao_min: proposal.condicoes.duracao_min,
            deslocamento: proposal.condicoes.deslocamento,
            hospedagem: proposal.condicoes.hospedagem,
            alimentacao: proposal.condicoes.alimentacao,
            equipamento_proprio: proposal.condicoes.equipamento_proprio,
            forma_pagamento: proposal.forma_pagamento,
            validade_dias: proposal.validade_dias,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const md = (data?.proposta_md || "").trim();
      if (!md) throw new Error("Resposta vazia da IA");
      onChange({ proposta_md: md });
      toast.success("Proposta gerada");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar a proposta");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proposal.proposta_md);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleExportPdf = () => {
    if (!proposal.proposta_md) {
      toast.error("Gere ou escreva a proposta primeiro");
      return;
    }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const maxW = doc.internal.pageSize.getWidth() - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Proposta — ${palco.titulo}`, margin, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Artista: ${artistName}`, margin, margin + 18);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margin, margin + 32);
    const body = proposal.proposta_md.replace(/[#*_`]/g, "");
    const lines = doc.splitTextToSize(body, maxW);
    doc.text(lines, margin, margin + 56);
    doc.save(`proposta-${palco.titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold inline-flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> Proposta Comercial
            </h2>
            <p className="text-xs text-muted-foreground">
              Cachê, condições e validade. O texto formal é gerado a partir destes campos.
            </p>
          </div>
        </div>

        {/* Campos numéricos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Cachê bruto (R$)</Label>
            <Input
              type="number"
              min={0}
              step={50}
              value={proposal.cache_bruto || ""}
              onChange={(e) => onChange({ cache_bruto: Number(e.target.value) || 0 })}
              className="mt-1"
            />
            {cachetMedioPalco && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Cachê médio do palco: {cachetMedioPalco}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Nº de músicos</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={proposal.condicoes.num_musicos || ""}
              onChange={(e) => setCondicoes({ num_musicos: Number(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Duração (min)</Label>
            <Input
              type="number"
              min={15}
              step={5}
              value={proposal.condicoes.duracao_min || ""}
              onChange={(e) => setCondicoes({ duracao_min: Number(e.target.value) || 60 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Validade (dias)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={proposal.validade_dias || ""}
              onChange={(e) => onChange({ validade_dias: Number(e.target.value) || 15 })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Toggles de condições */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ["deslocamento", "Deslocamento"],
            ["hospedagem", "Hospedagem"],
            ["alimentacao", "Alimentação"],
            ["equipamento_proprio", "Equip. próprio"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-2 text-xs border border-border rounded-md px-2 py-1.5">
              <span>{label}</span>
              <Switch
                checked={!!proposal.condicoes[k]}
                onCheckedChange={(v) => setCondicoes({ [k]: v })}
              />
            </label>
          ))}
        </div>

        <div>
          <Label className="text-xs">Forma de pagamento</Label>
          <Input
            value={proposal.forma_pagamento}
            onChange={(e) => onChange({ forma_pagamento: e.target.value })}
            placeholder="Ex.: 50% na confirmação, 50% até o dia do show"
            className="mt-1"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            Cachê: <strong className="text-foreground">{formatBRL(proposal.cache_bruto || 0)}</strong>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGenerate} disabled={generating || !proposal.cache_bruto}>
              {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              {proposal.proposta_md ? "Regerar com IA" : "Gerar carta-proposta"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} disabled={!proposal.proposta_md}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              Copiar
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={!proposal.proposta_md}>
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <Textarea
          value={proposal.proposta_md}
          onChange={(e) => onChange({ proposta_md: e.target.value })}
          placeholder="A carta-proposta formal aparece aqui depois de gerada. Você pode editar livremente."
          rows={14}
          className="font-mono text-xs"
        />

        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={onNext}>
            Próximo: Pacote técnico →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
