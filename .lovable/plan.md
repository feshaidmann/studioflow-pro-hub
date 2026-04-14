

# Plano: Automação Avançada para Editais Culturais

## Visão geral

Implementar 4 etapas incrementais para expandir o módulo de editais. Cada etapa é independente e entregue separadamente. O plano prioriza valor prático e respeita os padrões existentes (light mode, macOS minimal, PT-BR).

## Considerações técnicas importantes

- **Deno.cron não está disponível** em Supabase Edge Functions hospedadas. O agendamento será feito via `pg_cron` + `pg_net` (extensões Postgres).
- **Scraping genérico é frágil** — a etapa de fontes automáticas focará em RSS e chamadas à Perplexity, não em scraping HTML arbitrário.
- **Estilização**: fundo neutro claro (`220 14% 96%`), cards com `bg-background`, bordas `border-border`. Sem dark mode.
- **Todas as novas tabelas terão RLS** com `user_id = auth.uid()`.

---

## ETAPA 1 — Fontes automáticas e monitoramento

### Banco de dados

Nova tabela `fontes_editais`:
- `id`, `user_id`, `nome`, `url_base`, `tipo` (rss/api/perplexity), `parametros` (JSONB), `ativo`, `ultima_busca`, `frequencia_horas`, `created_at`
- RLS: CRUD restrito ao `user_id`

### Edge Function `edital-monitor`

- Recebe chamada HTTP (via `pg_cron` + `pg_net`)
- Para cada fonte ativa cuja `ultima_busca + frequencia_horas < now()`:
  - Tipo `rss`: fetch e parse XML
  - Tipo `perplexity`: chama Perplexity com query derivada dos parâmetros
- Deduplica via `session_key` contra editais existentes do usuário
- Insere novos com `inferido = true`
- Cria notificação na tabela `notifications` existente
- Atualiza `ultima_busca`

### Agendamento

- Habilitar extensões `pg_cron` e `pg_net` via migração
- Criar job `cron.schedule` chamando a Edge Function a cada 6 horas

### Frontend

- Seção "Fontes" como tab ou collapsible dentro de `/editais`
- Tabela de fontes com toggle ativo/inativo, editar, excluir
- Formulário: nome, URL, tipo (select), frequência
- Botão "Testar agora" que chama `edital-monitor` para uma fonte específica

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar `fontes_editais`, habilitar `pg_cron`/`pg_net`, criar job |
| `supabase/functions/edital-monitor/index.ts` | Nova Edge Function |
| `src/hooks/useFontesEditais.ts` | Novo hook CRUD |
| `src/pages/Editais.tsx` | Adicionar tab/seção "Fontes" |

---

## ETAPA 2 — Matchmaking e alertas

### Banco de dados

- `ALTER TABLE projects ADD COLUMN perfil_cultural JSONB DEFAULT '{}'` (áreas, estados, porte, palavras-chave)
- Nova tabela `alertas_editais`: `id`, `user_id`, `edital_id`, `lida`, `created_at` com RLS

### Edge Function `match-editais`

- Recebe `project_id`, busca perfil cultural do projeto
- Consulta editais do usuário e pontua por relevância (área, estado, status, palavras-chave)
- Retorna top 20 ordenados por score

### Frontend

- Componente `ProjectCulturalProfile` na página de detalhes do projeto (áreas, estados, porte)
- Seção "Recomendados" em `/editais` com dropdown de projeto e lista de matches
- Badge de alertas não lidos no sino de notificações existente

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | `perfil_cultural` em projects, tabela `alertas_editais` |
| `supabase/functions/match-editais/index.ts` | Nova Edge Function |
| `src/hooks/useMatchEditais.ts` | Novo hook |
| `src/components/project-hub/ProjectCulturalProfile.tsx` | Novo componente |
| `src/pages/Editais.tsx` | Seção "Recomendados" |

---

## ETAPA 3 — Assistente de inscrição

### Banco de dados

- Nova tabela `rascunhos_editais`: `id`, `user_id`, `edital_id`, `project_id`, `campos` (JSONB), `progresso` (integer 0-100), `created_at`, `updated_at`

### Edge Function `extract-edital-fields`

- Recebe URL do edital
- Usa Perplexity para acessar o link e extrair campos obrigatórios do formulário de inscrição
- Retorna JSON estruturado dos campos

### Frontend

- Rota `/editais/inscricao/:id` com wizard stepper (3-4 passos)
- Cada campo: pré-preenchimento do perfil/projeto + botão "Gerar com IA"
- Salva rascunho automaticamente (debounce)
- Ao final: resumo e botão "Copiar todos os textos" (sem PDF por enquanto)

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Tabela `rascunhos_editais` |
| `supabase/functions/extract-edital-fields/index.ts` | Nova Edge Function |
| `src/hooks/useRascunhoEdital.ts` | Novo hook |
| `src/pages/EditalInscricao.tsx` | Nova página wizard |
| `src/App.tsx` | Nova rota |

---

## ETAPA 4 — Dashboard de oportunidades

### Banco de dados

- `ALTER TABLE editais ADD COLUMN inscrito BOOLEAN DEFAULT false`

### Frontend

- Seção "Painel" como tab em `/editais` (sem rota nova)
- Gráficos com `recharts` (já instalável):
  - Editais por mês (bar chart)
  - Distribuição por área (pie chart)
  - Distribuição por status (pie chart)
  - Top 5 órgãos (horizontal bar)
- Indicadores: total salvos, abertos, inscritos
- Botão "Exportar relatório CSV" reutilizando `exportCSV` existente

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Campo `inscrito` em editais |
| `src/pages/Editais.tsx` | Nova tab "Painel" com gráficos |
| `package.json` | Adicionar `recharts` se ausente |

---

## Ordem de implementação

1. **Etapa 1** — Fontes automáticas (mais valor imediato)
2. **Etapa 2** — Matchmaking (agrega inteligência)
3. **Etapa 4** — Dashboard (rápido, complementar)
4. **Etapa 3** — Assistente de inscrição (mais complexo, último)

Cada etapa será implementada e testada antes de avançar para a próxima.

