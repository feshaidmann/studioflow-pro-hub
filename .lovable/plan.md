## Onboarding em 3 passos com "primeiro valor"

Transforma `src/pages/Onboarding.tsx` em um fluxo de 3 steps que termina mostrando editais e profissionais reais, antes do dashboard.

---

### 1. Nova edge function `onboarding-matches`

Arquivo: `supabase/functions/onboarding-matches/index.ts`

- Pública (sem JWT), CORS padrão (`npm:@supabase/supabase-js@2/cors`).
- Cliente com `SUPABASE_SERVICE_ROLE_KEY` (necessário porque `editais` tem RLS por `user_id`).
- Input via query string: `state` (UF) e `genre` (opcional, hoje só passado adiante para futuro ranking).
- Queries em paralelo (`Promise.allSettled`):
  - **Editais** (top 5): `status = 'Aberto'` + `prazo > now()` (ou nulo) + `estado ilike %UF%` OR `estado = 'Nacional'` OR `estado` vazio, ordenado por `created_at desc`. Campos retornados: `id, titulo, orgao, estado, prazo, valor`. Sem PII.
  - **Profissionais** (top 3): `active = true` + `allow_global_listing = true` + `city ilike %UF%` (fallback: sem filtro de cidade caso retorne 0). Campos: `id, name, specialty, city, bio` (truncar bio a 1 linha no client). Sem email/telefone.
- Cache: `Cache-Control: public, max-age=600`.
- Falha individual → log + array vazio; nunca 5xx.
- Deploy via `supabase--deploy_edge_functions`; sem alteração em `supabase/config.toml` (verify_jwt já é false por padrão).

### 2. Refactor de `src/pages/Onboarding.tsx`

Manter rota `/onboarding`, layout, guards (`!user`, `onboarding_completed`) e `OnboardingRouter` intactos. State adicional:

```ts
const [step, setStep] = useState<1 | 2 | 3>(1);
const [primaryGenre, setPrimaryGenre] = useState("");
const [stateUf, setStateUf] = useState("");
const [currentMoment, setCurrentMoment] = useState("");
const [matches, setMatches] = useState<{editais: Edital[]; pros: Pro[]} | null>(null);
const [matchesLoading, setMatchesLoading] = useState(false);
```

**Indicador de progresso:** 3 dots no topo do card (ativo = `bg-primary`, inativo = `bg-muted`).

**Botão "Voltar":** visível em steps 2 e 3, à esquerda do botão primário; preserva valores (state não é resetado).

**Step 1** — inalterado em campos (nome, artístico, whatsapp), mas o botão "Começar" vira "Continuar" e só faz `setStep(2)` (sem salvar ainda).

**Step 2 — "Sobre sua música":**
- `<Select>` (shadcn) gênero principal usando `GENRE_OPTIONS`.
- `<Select>` estado usando `BRAZIL_STATES` (value = `uf`, label = `name`).
- `<Select>` momento: `começando` | `em desenvolvimento` | `lançando agora`.
- "Continuar" habilita quando gênero E estado preenchidos. Momento é opcional (label "(opcional)").
- Ao clicar "Continuar": dispara fetch de matches (`supabase.functions.invoke("onboarding-matches", { body: { state: stateUf, genre: primaryGenre } })`) e `setStep(3)` imediatamente — Step 3 mostra skeleton enquanto carrega.

**Step 3 — "Aqui está o que já é seu":**
- Header dinâmico: `{artistName}, encontrei {N} editais e {M} profissionais para você começar`. Se `N === 0 && M === 0`, headline alternativo: `{artistName}, seu cadastro está pronto. Vamos criar seu primeiro projeto?`.
- Lista de editais (cards): título, órgão, estado, prazo formatado pt-BR (`Intl.DateTimeFormat`), valor se houver. Click → `window.open('/editais/inscricao/' + id, '_blank', 'noopener')` para não interromper o flow.
- Empty state editais: "Cadastramos novos editais toda semana — vai chegar matched no seu perfil."
- Lista de profissionais (cards compactos): name, specialty, city, bio truncada (line-clamp-1). Click → abre `ProfessionalDetailModal` (controlado por `selectedPro` state). O modal precisa de objeto `Professional`; mapear os campos retornados preenchendo defaults (`email: ""`, `phone: ""`, `active: true`, `favorite: false`, `allow_global_listing: true`, `user_id: ""`, timestamps) e passar `onEdit` / `onDelete` como no-ops (modal funciona em modo read-only nessa tela).
- Empty state profissionais: "Marketplace de profissionais em crescimento — você pode convidar quem já trabalha com você."
- CTA primário (full width): "Criar meu primeiro projeto" → `handleFinish()` então `navigate("/projects?new=1")`.
- CTA secundário (ghost, texto pequeno): "Ir para o dashboard" → `handleFinish()` então `navigate("/dashboard")`.

**`handleFinish()`** (compartilhado pelos 2 CTAs):
```ts
await updateProfile({
  full_name, display_name: artistName, whatsapp,
  user_type: "artist", track_view_mode: "basic",
  primary_genre: primaryGenre,
  state: stateUf,
  current_moment: currentMoment, // pode ser ""
  onboarding_version: 4,
  onboarding_completed: true,
});
trackAppEvent("onboarding_completed", { onboarding_version: 4 });
```
Em erro: toast + manter no Step 3 (não reseta seleção).

### 3. Detalhes de UX/A11y

- `aria-live` no header de Step 3 quando matches carregam.
- Skeletons (`@/components/ui/skeleton`) para os 5+3 cards durante `matchesLoading`.
- Focus inicial em cada step: input principal (Step 1: fullName já existe; Step 2: gênero; Step 3: primeiro card).
- Status `role="status" sr-only` mantém narração de save/error.

### 4. Verificação

- `supabase--curl_edge_functions` GET em `/onboarding-matches?state=SP&genre=MPB` → JSON com `editais` e `professionals`.
- Manual: criar usuário novo, percorrer 3 steps, validar `primary_genre`/`state`/`current_moment` em `/settings`. Voltar entre steps preserva valores. Confirmar `onboarding_completed = true` só após CTA final.

### Fora do escopo

- `OnboardingRouter` em `src/App.tsx`, `OnboardingGuest.tsx`, rota `/onboarding`, `isPro` em `ProfileContext`, mudanças no schema de `editais`/`professionals`.