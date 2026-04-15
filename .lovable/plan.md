

# Diagnóstico do plano proposto

## Viabilidade geral

O plano e tecnicamente possivel de implementar, mas tem **problemas criticos** que precisam ser corrigidos antes da execucao. Alem disso, ele assume uma "camada 2" (Kanban de candidaturas / tabela `edital_applications`) que **nao existe** no projeto atual.

## Problemas encontrados

### 1. Dependencia inexistente (bloqueante)

O plano inteiro referencia `edital_applications` — uma tabela que nao foi criada. As camadas 3 e 5 dependem diretamente dela (`edital_application_docs.application_id` faz FK para ela, e a camada 5 altera colunas nela). Sera necessario criar essa tabela primeiro ou redesenhar o plano sem ela.

### 2. Foreign keys para `auth.users` (proibido)

O plano usa `REFERENCES auth.users(id)` em `edital_documents` e `edital_application_docs`. As regras do projeto proibem isso — deve-se usar apenas `user_id uuid NOT NULL` sem FK explicita para o schema `auth`.

### 3. CHECK constraint na coluna `doc_type` (desaconselhado)

CHECK constraints causam problemas de restauracao. O projeto usa validation triggers. A lista de tipos validos deve ser aplicada via trigger ou apenas no frontend.

### 4. URL errada do AI Gateway

O plano usa `https://api.lovable.ai/v1/chat/completions`. A URL correta e `https://ai.gateway.lovable.dev/v1/chat/completions`.

### 5. Coluna computada `word_count`

`GENERATED ALWAYS AS (array_length(string_to_array(trim(content), ' '), 1)) STORED` funciona, mas e fragil com textos grandes e conteudo markdown. Uma alternativa mais robusta e calcular no frontend ou via trigger.

## O que precisa acontecer antes

Antes de implementar as camadas 3-5, e necessario:

1. **Criar a camada 2** — tabela `edital_applications` com colunas basicas (user_id, edital_id, status do pipeline como "interesse/preparando/inscrito/resultado") e a UI minima de pipeline/kanban
2. Somente depois as camadas 3-5 fazem sentido

## Proposta de implementacao (corrigida)

Se voce aprovar, eu implemento na seguinte ordem:

**Etapa A — Camada 2 (pre-requisito)**
- Criar tabela `edital_applications` (user_id, edital_id, status, project_id, notas, datas)
- RLS por user_id
- Hook `useEditalApplications`
- UI basica de pipeline na pagina Editais (mover edital salvo para "Preparando" → "Inscrito" → "Resultado")

**Etapa B — Camada 3 (Banco de documentos)**
- Tabela `edital_documents` (sem FK para auth.users, sem CHECK, sem coluna computada)
- Tabela `edital_application_docs` vinculada a `edital_applications`
- Hooks e UI de gerenciamento de documentos e checklist por candidatura

**Etapa C — Camada 4 (IA de elaboracao)**
- Edge function `edital-ai-assistant` com URL corrigida do gateway
- Acoes: gerar memorial, adaptar linguagem, revisar orcamento, gerar checklist, sugerir projeto
- Registro em `ai_invocations`

**Etapa D — Camada 5 (Historico e relatorio)**
- Colunas de resultado na `edital_applications`
- UI de registro de resultado e licoes aprendidas
- Dashboard de metricas de captacao

## Resumo

O plano e ambicioso e bem estruturado, mas precisa de ajustes tecnicos e da camada 2 como base. Posso implementar tudo em 4 etapas sequenciais. Quer que eu comece pela Etapa A (camada 2)?

