import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PalcoProposalCondicoes {
  num_musicos?: number;
  duracao_min?: number;
  deslocamento?: boolean;
  hospedagem?: boolean;
  alimentacao?: boolean;
  equipamento_proprio?: boolean;
  formacao_descricao?: string;
}

export interface PalcoProposal {
  id?: string;
  application_id: string;
  user_id?: string;
  cache_bruto: number;
  condicoes: PalcoProposalCondicoes;
  forma_pagamento: string;
  validade_dias: number;
  proposta_md: string;
  status: string;
}

export interface RiderChannel { n: number; fonte: string; mic_di: string; obs?: string }
export interface PalcoRider {
  channels: RiderChannel[];
  monitors: string;
  pa_min: string;
  obs: string;
}
export interface StageMapItem { id: string; label: string; x: number; y: number }
export interface OrcamentoItem { id: string; label: string; valor: number; tipo: "receita" | "despesa" }

export interface PalcoTechPackage {
  id?: string;
  application_id: string;
  user_id?: string;
  rider: PalcoRider;
  stage_map: { items: StageMapItem[] };
  orcamento: { items: OrcamentoItem[] };
}

const DEFAULT_PROPOSAL = (application_id: string, user_id: string): PalcoProposal => ({
  application_id,
  user_id,
  cache_bruto: 0,
  condicoes: {
    num_musicos: 1,
    duracao_min: 60,
    deslocamento: false,
    hospedagem: false,
    alimentacao: false,
    equipamento_proprio: false,
    formacao_descricao: "",
  },
  forma_pagamento: "50% na confirmação, 50% até o dia do show",
  validade_dias: 15,
  proposta_md: "",
  status: "rascunho",
});

const DEFAULT_TECH = (application_id: string, user_id: string): PalcoTechPackage => ({
  application_id,
  user_id,
  rider: { channels: [], monitors: "", pa_min: "", obs: "" },
  stage_map: { items: [] },
  orcamento: { items: [] },
});

export function usePalcoProposal(applicationId: string | undefined) {
  const { user } = useAuth();
  const [proposal, setProposal] = useState<PalcoProposal | null>(null);
  const [tech, setTech] = useState<PalcoTechPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!applicationId || !user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("palco_proposals").select("*").eq("application_id", applicationId).maybeSingle(),
        supabase.from("palco_tech_packages").select("*").eq("application_id", applicationId).maybeSingle(),
      ]);
      setProposal(p ? (p as any) : DEFAULT_PROPOSAL(applicationId, user.id));
      setTech(t ? (t as any) : DEFAULT_TECH(applicationId, user.id));
      setLoading(false);
    })();
  }, [applicationId, user]);

  const saveProposal = useCallback(async (patch: Partial<PalcoProposal>) => {
    if (!applicationId || !user) return;
    const next = { ...(proposal || DEFAULT_PROPOSAL(applicationId, user.id)), ...patch };
    setProposal(next);
    setSaving(true);
    const { error } = await supabase
      .from("palco_proposals")
      .upsert({ ...next, user_id: user.id, application_id: applicationId } as any, { onConflict: "application_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar proposta");
  }, [applicationId, user, proposal]);

  const saveTech = useCallback(async (patch: Partial<PalcoTechPackage>) => {
    if (!applicationId || !user) return;
    const next = { ...(tech || DEFAULT_TECH(applicationId, user.id)), ...patch };
    setTech(next);
    setSaving(true);
    const { error } = await supabase
      .from("palco_tech_packages")
      .upsert({ ...next, user_id: user.id, application_id: applicationId } as any, { onConflict: "application_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar pacote técnico");
  }, [applicationId, user, tech]);

  return { proposal, tech, loading, saving, saveProposal, saveTech };
}
