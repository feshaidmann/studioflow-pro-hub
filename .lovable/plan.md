## Perfil Público — Refino + Abertura Web + Integração

Refinar a tela existente `/u/:username`, tornando-a acessível a visitantes não autenticados (com opt-in explícito do dono) e plugando-a aos pontos certos da jornada.

### 1. Banco (migration)

Adicionar à `profiles`:
- `public_profile_enabled boolean default false` — flag dedicado, separado de `allow_global_listing`.
- `show_public_email boolean default false`, `show_public_whatsapp boolean default false` — controlam exibição de contato.

Atualizar policy `Public can view listed profiles` para `(public_profile_enabled = true OR allow_global_listing = true)`, mantendo acesso anônimo somente a colunas seguras via view `public_profiles_view` (SECURITY INVOKER) que omite `whatsapp`/`public_email` quando os respectivos flags estão `false`.

Função `get_public_profile(p_username text)` (SECURITY DEFINER, retorna SETOF) usada pela página pública — única fonte de leitura para anon, garantindo mascaramento.

### 2. Frontend — refino da tela `/u/:username`

Manter estrutura atual e adicionar/melhorar:
- Hero limpo (avatar grande, nome, especialidades, cidade/UF, badge "Verificado" se `captador_verificado`).
- Métricas: projetos concluídos, rating médio (via `get_provider_public_rating`).
- Seções: Bio · Especialidades · Portfólio (work_links + youtube) · Projetos públicos · Avaliações recentes.
- Barra de ações sticky com 4 CTAs:
  - **Solicitar orçamento** → abre `RequestQuoteModal` existente (exige login; se anon, redireciona para /auth com return_to).
  - **Convidar para projeto** → fluxo `project_invitations` existente (exige login).
  - **Copiar contato** → copia email/whatsapp se o dono optou por exibir; caso contrário, esconde o botão.
  - **Compartilhar perfil** → `navigator.share` ou copia link `/u/:username`.
- Estado vazio amigável quando perfil não é público (404 contextual com CTA "este usuário não tornou o perfil público").
- SEO: `<title>`, meta description, OG tags e JSON-LD Person.

### 3. Opt-in do dono

Em `Settings` (ou `ProfileEdit`): novo bloco "Perfil público" com:
- Toggle "Tornar meu perfil visível na web aberta" (`public_profile_enabled`).
- Sub-toggles (só ativos se o principal estiver on): "Mostrar email público", "Mostrar WhatsApp".
- Preview do link `/u/:username` + botão copiar.

### 4. Integração na jornada

- **MarketplaceSheet / ProviderCard**: clicar no card abre `/u/:username` em nova aba (se provider tem username). Drawer atual vira atalho secundário "Ver detalhes rápidos".
- **ProjectTeamTab**: nome/avatar de membros vira `<Link to="/u/:username">` quando o membro tem perfil público.
- **Avaliações/Contacts list** (`Professionals.tsx`): linkar nome para perfil quando público.
- **Header do app** (`AppLayout`): no menu do avatar, novo item "Meu perfil público" → `/u/<meu_username>`; mostra "Ative em Configurações" se desligado.

### 5. Rota pública

`/u/:username` já existe; garantir que está fora do `ProtectedRoute` e que `ProfileContext` não força redirect. Página usa `supabase.rpc('get_public_profile', ...)` sem sessão.

### Detalhes técnicos

```text
profiles
├─ public_profile_enabled (bool)  ← opt-in web aberta
├─ show_public_email      (bool)
├─ show_public_whatsapp   (bool)
└─ allow_global_listing   (bool)  ← já existe, controla marketplace interno

RPC public.get_public_profile(p_username) → row mascarada
View public_profiles_view (não usada por anon direto; auxiliar)
```

Arquivos tocados (frontend):
- `src/pages/PublicProfile.tsx` (refino)
- `src/pages/Settings.tsx` (novo bloco opt-in)
- `src/components/marketplace/ProviderCard.tsx` (link para perfil)
- `src/components/project-hub/ProjectTeamTab.tsx` (linkar membros)
- `src/pages/Professionals.tsx` (linkar nomes)
- `src/components/layout/AppLayout.tsx` (item no menu)
- `src/hooks/usePublicProfile.ts` (novo, usa RPC)

### Fora de escopo
- Pagamento real (mantém transações off-platform conforme MVP do marketplace).
- Indexação avançada / sitemap dinâmico (apenas meta tags básicas nesta entrega).
