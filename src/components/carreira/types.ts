// Tipo unificado de oportunidade (edital ou palco) usado pelo módulo Carreira.
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

export type TipoOportunidade = "edital" | "palco";

export interface Opportunity {
  /** Identificador estável: id do banco quando salvo, session_key/slug quando AI. */
  key: string;
  tipo: TipoOportunidade;
  titulo: string;
  organizador: string;
  estado: string | null;
  status: string;
  prazo: string | null;
  link: string | null;
  valor: string | null;
  resumo: string | null;
  area?: string | null;
  /** Para palcos */
  generos?: string[];
  /** Para palcos */
  porteOuTipo?: string | null;
  /** ID na tabela editais (necessário para iniciar candidatura) */
  editalId?: string | null;
  /** Origem do registro: salvo no banco, curado ou resultado de IA */
  origem: "saved" | "curated" | "ai";
  /** Dados crus para handlers que precisam do shape original */
  raw: Edital | PalcoCurado;
}

export function editalToOpportunity(e: Edital): Opportunity {
  return {
    key: e.id || e.session_key || `${e.titulo}_${e.orgao}`,
    tipo: "edital",
    titulo: e.titulo,
    organizador: e.orgao,
    estado: e.estado,
    status: e.status,
    prazo: e.prazo,
    link: e.link || null,
    valor: e.valor && e.valor !== "—" ? e.valor : null,
    resumo: e.resumo && e.resumo !== "—" ? e.resumo : null,
    area: e.area,
    editalId: e.id,
    origem: e.id ? "saved" : "ai",
    raw: e,
  };
}

export function palcoToOpportunity(p: PalcoCurado, origem: "curated" | "ai" = "curated"): Opportunity {
  return {
    key: p.id || `${p.nome}_${p.organizador}`,
    tipo: "palco",
    titulo: p.nome,
    organizador: p.organizador,
    estado: p.estado,
    status: p.status,
    prazo: p.prazo,
    link: p.link,
    valor: p.cachet_medio,
    resumo: p.resumo,
    generos: p.generos,
    porteOuTipo: p.tipo_palco,
    origem,
    raw: p,
  };
}
