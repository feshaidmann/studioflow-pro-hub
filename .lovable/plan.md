# Rastreamento de eventos para funil de métricas

Hoje o app usa PostHog (com chave placeholder, então nada é enviado) e a tabela `page_views` só guarda navegação. Para construir um funil próprio no banco (onboarding → projeto → upload → análise), vamos criar uma tabela dedicada e instrumentar os pontos-chave.

## O que vamos entregar

1. **Tabela `analytics_events` no seu banco** — armazena cada evento com tipo, usuário, projeto associado, timestamp e propriedades flexíveis (JSON). Protegida por RLS: usuário insere os próprios eventos, admin lê tudo para montar o funil.

2. **Helper `trackAppEvent(name, props)`** em `src/lib/analytics.ts` — escreve no Supabase (e também envia ao PostHog quando configurado, sem quebrar nada). Falha silenciosamente para nunca atrapalhar o fluxo do usuário.

3. **Instrumentação dos eventos do funil**:
   - `onboarding_completed` — em `Onboarding.tsx` e `OnboardingGuest.tsx` (após `updateProfile` com `onboarding_completed: true`), com props: `moment`, `pain`, `state`, `view_mode`, `created_project` (bool).
   - `project_created` — em `ProjectContext.addProject` (após insert), props: `project_id`, `project_type`, `stage`, `genre`, `from_onboarding` (bool).
   - `project_updated` — em `ProjectContext.updateProject` quando `stage` muda, props: `project_id`, `from_stage`, `to_stage`.
   - `project_completed` — quando `stage` vira `lancado` ou `completed=true`.
   - `file_uploaded` — em `useProjectFiles.uploadFile` e `CollaboratorFilesTab` (após insert OK), props: `project_id`, `folder`, `mime_type`, `size_kb`.
   - `audio_analyzed` — em `useMusicDNA` (após retorno da edge function `music-dna-analyze`), props: `genre`, `track_name`, `bpm`, `lufs`, `source` (`upload` ou `metadata_lookup`).

4. **View `analytics_funnel_daily`** (somente admin) — agrega por dia e tipo de evento para o painel admin futuro consumir facilmente. Inclui contagem distinta de usuários por etapa.

## Detalhes técnicos

**Schema:**
```sql
analytics_events (
  id uuid pk,
  user_id uuid,           -- nullable (eventos anônimos no futuro)
  event_name text,        -- ex: 'project_created'
  project_id uuid,        -- nullable
  properties jsonb,       -- payload livre
  session_id text,        -- mesmo session_id do page_views
  created_at timestamptz
)
-- índices: (event_name, created_at), (user_id, created_at), (project_id)
```

**RLS:** `INSERT` se `auth.uid() = user_id`; `SELECT` para `has_role(auth.uid(),'admin')` e para o próprio usuário (ver os próprios eventos).

**Helper:**
```ts
export async function trackAppEvent(name, props?) {
  // fire-and-forget, ignora erros, usa session_id já presente em sessionStorage
  // também chama posthog.capture quando inicializado
}
```

**View admin:** agrupa por `date_trunc('day', created_at)` + `event_name`, retorna `total` e `unique_users`. Reaproveita política de admin.

## Fora do escopo
- Painel visual do funil (consulta direta no banco até o admin pedir UI).
- Eventos anônimos pré-login (todos os pontos atuais já estão autenticados).
- Migrar PostHog (continua coexistindo; chave segue placeholder).
