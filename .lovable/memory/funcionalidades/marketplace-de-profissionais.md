---
name: Marketplace de Profissionais
description: Vitrine + briefing/orçamento acionado por contexto do projeto; usuários opt-in + contatos opt-in + curados pela admin
type: feature
---
**Escopo MVP:** Vitrine (sem pagamento). Artista vê prestadores, envia briefing curto, recebe propostas (preço + prazo). Negociação/pagamento fora da plataforma.

**Origens dos prestadores** (view `marketplace_providers`, UNION ALL):
1. `profiles.allow_global_listing = true` + `specialties` preenchidas → source='user'
2. `professionals.allow_global_listing = true` + `active = true` → source='contact'
3. `marketplace_curated_providers` com `status='approved'` (admin-managed) → source='curated'

**Tabelas:**
- `marketplace_curated_providers` (admin gerencia; authenticated lê quando approved)
- `service_requests` (artista cria; quota: 10 abertos / 7 dias via trigger)
- `service_proposals` (provider responde; artista dono do request vê todas, provider vê só as próprias)

**RPCs:**
- `get_marketplace_providers(specialty, genre, state, search, limit, offset)` — listagem filtrada
- `get_provider_public_rating(name, email)` — média agregada (sem expor avaliações individuais)
- `accept_service_proposal(id)` — fecha request + marca outras como rejected

**Pontos de entrada (sem nova rota de topo):**
- `ProjectTeamTab`: botão "Marketplace" + `<MissingRoleHint specialty="..."/>` para papéis ausentes (Mix/Master/Designer)
- `/professionals`: botão "Marketplace" no header

**Componentes:**
- `src/components/marketplace/MarketplaceSheet.tsx` — drawer com filtros
- `src/components/marketplace/ProviderCard.tsx` — card com badge de origem (Artista StudioFlow / Indicado / Curado)
- `src/components/marketplace/RequestQuoteModal.tsx` — formulário de briefing
- `src/components/marketplace/MissingRoleHint.tsx` — hint contextual

**Hook:** `src/hooks/useMarketplace.ts` — `useMarketplaceProviders`, `useServiceRequests`, `useServiceProposals`.

**Pendente (fora do MVP enviado):** painel admin `/admin/marketplace` para aprovar curated/contacts pendentes, notificações in-app para novas propostas, ProposalsInbox UI.
