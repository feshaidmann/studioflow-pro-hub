# 03 · Módulos funcionais

## Dashboard (`/dashboard`)

- KPIs financeiros (receita, investimento, resultado, margem) — somente transações **pagas confirmadas** entram nos totais.
- Checklist do dia (manuais + auto-geradas via IA, com soft-delete e throttle 1h).
- Projetos ativos com badge de estágio e barra de progresso.
- Assistente IA "JamSession" (chip "Dúvida técnica" entra em modo engenheiro de áudio).
- Próximos lançamentos e eventos da agenda.

## Projetos (`/projects`, `/projects/:id`)

Workflow rígido de 6 estágios. Progresso é calculado pela constante `stagePercent` fora do componente.

| Estágio | % | Marco |
|---------|---|-------|
| Projeto Iniciado | 10 | Criação |
| Gravação | 50 | Captação |
| Mix | 80 | Mixagem |
| Master | 90 | Masterização |
| Upload | 98 | Master Analyzer + check de áudio |
| Lançado | 100 | Avaliação de parceiros disparada |

Recursos do hub: tracks de mix (gain/EQ/comp/cachê), arquivos por aba, finanças do projeto, equipe, chat realtime, **Direção Visual**, perfil cultural, release checklist em 7 seções, deep-link por `?id=`, compartilhamento via WhatsApp deeplink. Avaliação de parceiros só dispara no estágio **Lançado** e alimenta o perfil público.

### Master Analyzer

Modal integrado ao estágio "Upload" (`MasterAnalyzerModal`) — não é mais módulo separado e **não depende** da conclusão do projeto. Endpoint público `audio-analyze` para LUFS / True Peak / compatibilidade com plataformas.

### Direção Visual (`/projects/:id/direcao-visual`)

Wizard em 3 steps com deep-link via query string (`?step=perfil|geracao|revisao`):

1. **Perfil artístico + Briefing** (`ArtisticProfileStep` + `BriefingStep`).
2. **Geração** (`GenerationStep`) — chama `generate-visual-direction`, gera 6 imagens via Gemini Image; cada PNG é salvo no bucket `creative-assets` e o JSONB persiste apenas a URL pública (evita `statement_timeout`).
3. **Revisão** (`ReviewStep`) — share público via `/briefing/share/:token` e export por `export-visual-briefing`.

## Carreira (`/carreira`)

Módulo unificado que substituiu `/editais` e `/palcos` (rotas legadas redirecionam). Tabs `?tipo=edital|palco`.

- Busca via Edge Function `oportunidades-search`.
- Cards usam `OpportunityCard` com `link_status` (ok/broken/desconhecido). Quando `broken`, a UI oferece fallback Google.
- Cron diário `check-opportunity-links` revalida links de `editais` e `palcos_curados` e atualiza `link_status` + `link_checked_at`.
- Filtros avançados, recomendações com IA, detalhe em sheet, menu de status da candidatura.

### Inscrição em editais (`/editais/inscricao/:id`)

- Banco de documentos reutilizáveis (`edital_documents`, ver `src/types/editais.ts`).
- Checklist de docs por aplicação (`edital_application_docs`).
- Assistente IA contextual (`edital-ai-assistant`) — gera memorial, adapta linguagem, revisa orçamento, sugere fit.
- Resultado capturado em `EditalResultModal` alimenta métricas em `EditalMetricsDashboard`.

## DNA Musical (`/music-dna`)

- Extração client-side via Web Audio API + worker `acousticMatch.worker.ts`.
- Classificador de gênero com calibração por feedback (`genre_mismatch_feedback`) — botões "Falso/Correto" ajustam score por usuário.
- Pipeline de referências: `music_reference_tracks` + `import-reference-tracks` + `/admin/reference-tracks` injetam exemplos no prompt e geram benchmarks.
- Persona técnica (engenheiro) com summary acessível; tarefas geradas levam prefixo `[DNA]`.
- Cache por sessão; análise pode ser salva em `music_dna_analyses`.
- `enrich-neighbor-context` busca metadados externos (Deezer, MusicBrainz, ListenBrainz) com cache 30 dias em `music_external_metadata`.

## Financeiro (`/finance`)

- 13 categorias de receita e 17 de despesa em `src/constants/transactionCategories.ts`.
- Filtros: projeto, tipo, categoria, status de pagamento.
- **Apenas transações pagas confirmadas** entram nos totais (regra MVP).
- Paginação de 20 itens; export CSV em pt-BR (`;` + BOM UTF-8) via papaparse.
- Privacidade estrita: convidados nunca veem dados financeiros (RLS + RPCs `SECURITY DEFINER`).

## Agenda (`/agenda`)

- Tipos: show, ensaio, gravação, reunião, deadline, outro.
- **Eventos do tipo Show** geram automaticamente uma transação de receita.
- Detecção de conflitos exige confirmação explícita do usuário antes de salvar.
- Vinculação opcional a projeto.

## Profissionais (`/professionals`)

- Agenda pessoal escopada por `user_id` (RLS).
- Especialidade explícita "Instrumentista" (papéis Producer/Mix/Master são automáticos pelo workflow do projeto).
- Opt-in para listagem global (`allow_global_listing`).
- Métricas calculadas via `useProfessionalMetrics`: nº de projetos, média de avaliações, último contato, perfil público vinculado.

## Perfil público (`/u/:username`)

- Sem autenticação. Bio, especialidades, projetos lançados e avaliações vindas de `RatePartnersModal`.
- Informações sensíveis controladas pelo opt-in do dono.

## Configurações (`/settings`)

- Nome, bio, cidade, especialidades, modo de tracks, regras de tarefas automáticas (`task_rules`), seed de demo data.

## Tutorial e Welcome

- Welcome (`/`) é público e mobile-first, com mockups em `TutorialMockups`.
- Tutorial cobre todos os módulos vivos.
