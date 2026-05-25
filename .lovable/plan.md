## Marketplace de Profissionais — Vitrine + Briefing/Orçamento, acionado por contexto do projeto

Objetivo: quando um projeto precisa de um papel (ex.: falta Mix Engineer, Designer de capa, Videomaker), o StudioFlow sugere prestadores curados, deixa o artista publicar um briefing curto, e profissionais respondem com proposta (valor + prazo). Negociação/pagamento seguem fora da plataforma (consistente com o MVP).

### 1. Quem pode ser prestador

Três origens, todas unificadas em uma única view `marketplace_providers`:

1. **Usuário StudioFlow opt-in** — `profiles.allow_global_listing = true` + `specialties` preenchidas. Entra automaticamente (já tem perfil público em `/u/:username`).
2. **Contato adicionado por outro usuário** — `professionals.allow_global_listing = true`. Entra como "perfil leve" (sem login).
3. **Outsider via curadoria admin** — nova tabela `marketplace_curated_providers` (espelha o padrão `palcos_curados`): admin cadastra manualmente nome, especialidade, portfólio, contato. Aparece com selo "Curado pelo StudioFlow".

Dedup por e-mail (lowercase). Status: `pending_review | approved | rejected` para os casos 2 e 3 (o caso 1 é auto-aprovado porque já passou pelo onboarding).

### 2. Acionamento por contexto do projeto

No `ProjectTeamTab` (já existe) e no `ProjectOverviewTab`, detectar lacunas de papel — ex.: estágio "Mix" sem membro com `specialty = "Mix Engineer"`. Mostrar card:

> "Falta um Mix Engineer para este projeto. Ver 6 profissionais disponíveis →"

Clique abre o **Sheet do Marketplace** filtrado pela especialidade faltante, gênero do projeto e (opcional) estado do artista.

Pontos de entrada secundários:
- Aba "Descobrir profissionais" dentro de `/professionals` (vitrine geral, mesmos filtros).
- Botão no `ProfessionalFormDialog` ("ou buscar no marketplace") quando o artista vai adicionar um contato manualmente.

### 3. Fluxo do briefing

```text
Artista vê card de prestador
  → "Solicitar orçamento"
  → Modal com briefing curto (descrição, prazo desejado, referência opcional, orçamento aproximado)
  → Cria service_request (vinculado ao project_id)
  → Notificação para o prestador (in-app se for usuário; e-mail manual via link copiável se for contato/curado, seguindo o padrão MVP de "convite manual")
  → Prestador responde com service_proposal (valor, prazo, mensagem)
  → Artista aprova/recusa
  → Se aprovado, prestador vira project_member automaticamente
```

Negociação/pagamento ficam fora (consistente com a constraint "Automated email/WhatsApp invites disabled for MVP").

### 4. Modelo de dados (novas tabelas)

- **`marketplace_curated_providers`** — registros admin-managed (nome, especialidade, bio, portfólio_url, contato, status).
- **`service_requests`** — pedidos abertos por artistas: `project_id`, `requester_user_id`, `specialty_needed`, `briefing`, `desired_deadline`, `budget_hint`, `status` (open/closed/cancelled).
- **`service_proposals`** — respostas dos prestadores: `request_id`, `provider_ref` (poly: user_id OU professional_id OU curated_id), `price`, `delivery_days`, `message`, `status` (sent/accepted/rejected/withdrawn).
- **View `marketplace_providers`** — UNION ALL das três origens, expondo apenas campos públicos (nada de e-mail/telefone até o artista solicitar orçamento).

RLS:
- `service_requests`: dono é o `requester_user_id`; prestador alvo lê via RPC `SECURITY DEFINER` filtrado por proposta vinculada.
- `service_proposals`: prestador gerencia as suas; requester lê as do seu request.
- `marketplace_curated_providers`: admin escreve; authenticated lê quando `status = 'approved'`.
- View `marketplace_providers`: SECURITY INVOKER, respeita as RLS das tabelas-base.

### 5. UI (rotas e componentes)

Sem nova rota de topo (decisão do usuário: "acionado por contexto"). Apenas:

- `src/components/marketplace/MarketplaceSheet.tsx` — drawer com filtros (especialidade, gênero, estado, avaliação) e grade de cards.
- `src/components/marketplace/ProviderCard.tsx` — avatar, nome, especialidade, ★ média, badge da origem (Artista StudioFlow / Indicado / Curado).
- `src/components/marketplace/RequestQuoteModal.tsx` — formulário de briefing.
- `src/components/marketplace/ProposalsInbox.tsx` — lista de propostas recebidas (para o prestador) e enviadas (para o artista), acessível via aba em `/professionals` chamada "Marketplace".
- Aba nova em `/professionals`: "Descobrir" (vitrine geral) e "Minhas solicitações".
- Gatilhos contextuais: `ProjectTeamTab` ganha `<MissingRoleHint specialty="Mix Engineer" />` que abre o sheet.

### 6. Curadoria admin

Nova rota `/admin/marketplace` (acessível só com `has_role(admin)`):
- Lista `pending_review` de contatos opt-in + outsiders.
- Ações: aprovar, rejeitar (com motivo), editar.
- Reusa padrão visual de `/admin/reference-tracks`.

### 7. Notificações e analytics

- Notification in-app quando: nova proposta recebida; proposta aceita/recusada; novo request bate com a especialidade do prestador (apenas usuários StudioFlow).
- Analytics events: `marketplace_sheet_opened`, `quote_requested`, `proposal_sent`, `proposal_accepted`.

### 8. Fora de escopo (explicitamente)

- Pagamento na plataforma / escrow (esse é o caminho do tier "transacional", não escolhido).
- Convites/notificações automáticos por e-mail ou WhatsApp para contatos não-usuários (constraint MVP) — sempre link copiável.
- Re-introdução de `/studio` ou `/criativo` (constraint do projeto).

### 9. Entregáveis em ordem

1. Migração: `marketplace_curated_providers`, `service_requests`, `service_proposals`, view `marketplace_providers`, RLS + RPCs.
2. Hook `useMarketplaceProviders(filters)` + `useServiceRequests` + `useServiceProposals`.
3. Componentes UI (Sheet, Card, RequestModal, Inbox).
4. Integração contextual em `ProjectTeamTab` (`MissingRoleHint`) e aba "Descobrir" em `/professionals`.
5. Painel admin `/admin/marketplace` para curadoria.
6. Notificações + analytics.
7. Memória do projeto: registrar nova memória `funcionalidades/marketplace-de-profissionais`.

### Pontos a confirmar antes de codar

- **Avaliação**: usar `professional_ratings` atual (privada por artista) ou criar pontuação agregada pública para o marketplace? Sugestão: agregar via RPC `get_public_provider_rating(provider_ref)` para não vazar avaliações individuais.
- **Limite anti-spam**: máximo de N requests abertos por artista por semana? Sugestão: 10/semana.
- **Visibilidade do contato**: e-mail/telefone do prestador só aparecem para o artista após a proposta ser aceita?
