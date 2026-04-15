export type DocType =
  | 'curriculo' | 'bio_curta' | 'bio_media' | 'bio_longa'
  | 'memorial' | 'plano_execucao' | 'orcamento_base'
  | 'portfolio_links' | 'declaracao' | 'outro';

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  curriculo:       'Currículo artístico',
  bio_curta:       'Bio curta (até 100 palavras)',
  bio_media:       'Bio média (até 300 palavras)',
  bio_longa:       'Bio longa (até 500 palavras)',
  memorial:        'Memorial descritivo',
  plano_execucao:  'Plano de execução e cronograma',
  orcamento_base:  'Orçamento base do projeto',
  portfolio_links: 'Links de portfólio e samples',
  declaracao:      'Declarações e certidões',
  outro:           'Outro documento',
};

export const DOC_TYPES: DocType[] = Object.keys(DOC_TYPE_LABELS) as DocType[];

export interface EditalDocument {
  id: string;
  user_id: string;
  doc_type: DocType;
  title: string;
  content: string;
  last_used_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface ApplicationDoc {
  id: string;
  application_id: string;
  user_id: string;
  doc_label: string;
  doc_type: DocType | null;
  is_required: boolean;
  is_completed: boolean;
  edital_document_id: string | null;
  custom_content: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  edital_document?: EditalDocument;
}

export type AIAction =
  | 'generate_memorial'
  | 'adapt_language'
  | 'review_budget'
  | 'generate_checklist'
  | 'suggest_project_fit';

export interface ResultadoCandidatura {
  resultado: 'aprovado' | 'reprovado' | 'lista_espera' | 'desistencia';
  valor_aprovado?: number;
  motivo_recusa?: string;
  data_resultado: string;
  licoes_aprendidas?: string;
}
