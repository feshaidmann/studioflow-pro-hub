---
name: Corpus de análises de editais
description: Tabela edital_analyses_corpus acumula texto + análise pública (sem carta personalizada) de cada análise feita via analyze-edital, para futuro enriquecimento da base de editais. Admin-only via RLS.
type: feature
---
Toda chamada bem-sucedida da edge function `analyze-edital` grava uma linha em `public.edital_analyses_corpus` (via service role):

- `input_text` (até 60k chars), `input_excerpt` (500 chars), `content_hash` (SHA-256) para dedup por usuário.
- `resumo`, `prazos`, `documentos`, `valor`, `publico_alvo` — análise PÚBLICA, **sem `carta_sugerida`** (esta vive só em `edital_applications.analise_ia` por ser personalizada com bio/projeto).
- `edital_id` quando a análise veio de um edital já listado; `null` para editais "descobertos" via upload livre.
- Metadados: `source` (file|text), `model`, `duration_ms`, `user_id`.

**Acesso:** RLS permite SELECT só para admins (`has_role`). Sem UI ainda — uso futuro: (1) enriquecer `editais` com dados extraídos, (2) curar editais descobertos pra inclusão na listagem pública, (3) dataset pra avaliar prompt da `analyze-edital`, (4) top-N documentos exigidos por tipo.

Falhas de insert no corpus são silenciosas (não bloqueiam a análise).
