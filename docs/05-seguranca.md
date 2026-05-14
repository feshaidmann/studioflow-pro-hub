# 05 · Segurança, RLS e Autenticação

## Princípios

- **RLS em todas as tabelas** — sem exceção.
- Roles ficam em `user_roles`, **nunca** em `profiles` (evita escalada de privilégio).
- Verificações de role passam pela função `has_role()` `SECURITY DEFINER` para evitar recursão.
- Convidados (guests) **nunca** acessam dados financeiros — só RPCs `SECURITY DEFINER` que omitem esses campos.

## Padrão base de RLS

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

Aplicado em: `tasks`, `task_rules`, `notifications`, `push_subscriptions`, `ai_conversations`, `ai_messages`, `ai_usage`, `music_dna_analyses`, `music_dna_feedback`, `genre_mismatch_feedback`, `professional_ratings`, `track_templates`, `editais`, `edital_applications`, `edital_application_docs`, `edital_documents`, `rascunhos_editais`, `alertas_editais`, `fontes_editais`, `release_checklists`, `events`, `transactions`, `mix_tracks`, `projects`, `visual_briefings`.

## Políticas com regras especiais

| Tabela | Regra |
|--------|-------|
| `profiles` | SELECT próprio (`auth.uid() = id`) **ou** público (`allow_global_listing = true`) |
| `professionals` | SELECT próprio **ou** opt-in global; INSERT/UPDATE/DELETE só do dono |
| `project_invitations` / `platform_invitations` | SELECT público necessário para fluxo de token (mitigado por entropia 256 bits) |
| `project_members` | ALL próprio |
| `project_messages` | SELECT para autor, dono ou membro do projeto; INSERT só por autor |
| `template_tracks` | JOIN para garantir que template pertence ao usuário |
| `user_roles` | SELECT próprio apenas |
| `function_logs` / `ai_invocations` | SELECT só admin (`has_role`) |
| `beta_feedback` | INSERT do dono; SELECT do dono ou admin |
| `music_reference_tracks` | SELECT para autenticados; INSERT/UPDATE/DELETE só admin |
| `palcos_curados`, `editais` (curados) | Update de `link_status` por service role (cron) |
| `visual_briefing_shares` | SELECT público por token; INSERT só pelo dono do briefing |

## Função `has_role`

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

## Storage

| Bucket | Público | Política |
|--------|---------|----------|
| `avatars` | Leitura sim | Upload/Update/Delete restrito a `{auth.uid()}/` via `storage.foldername()` |
| `project-files` | Não | Leitura/upload restrito a dono e membros do projeto |
| `creative-assets` | Leitura sim | Usado por Direção Visual e exports; upload por edge functions com service role |

## Autenticação

| Método | Status | Notas |
|--------|--------|-------|
| E-mail + senha | ✅ | Verificação obrigatória |
| Google OAuth | ✅ | Redireciona para `/dashboard` ou `/onboarding` |
| Reset de senha | ✅ | Link por e-mail (Resend) |

- Sessão em `localStorage`, refresh automático via `supabase-js`.
- `AuthContext` escuta `onAuthStateChange`.
- Analytics: `identifyUser(userId)` no login, `resetAnalytics()` no logout.

## Onboarding obrigatório

`ProfileContext` calcula `needsProfileSetup`:

- `profile === null && !loading && !!user` → exige setup (cobre OAuth com trigger falho).
- `profile !== null && !onboarding_completed` → exige setup.

`ProtectedRoute` redireciona para `/auth` ou `/onboarding` conforme o caso.

## Guest flow

Convidados aceitos via `respond-to-invite` recebem acesso ao projeto através de RPCs `SECURITY DEFINER` (`get_member_projects`, `get_project_for_member`) que **excluem campos financeiros**. Frontend usa `useGuestProjects` / `useGuestTasks` e renderiza `GuestProjectsList`.

## Edge functions

Padrão: `verify_jwt = false` no `config.toml`, validação manual do JWT no código (permite no mesmo deploy fluxos públicos por token e fluxos autenticados).

```ts
const { data: { user } } = await anonClient.auth.getUser(token);
```

Funções administrativas (ex.: `admin-stats`, `import-reference-tracks`, `export-acoustic-catalog`) verificam adicionalmente a role `admin` via service role.

## Cron jobs (pg_cron)

| Função | Frequência | Propósito |
|--------|-----------|-----------|
| `check-opportunity-links` | Diário | Revalida `link_status` de `editais` e `palcos_curados` |
| `notify-edital-deadlines` | Diário | Notifica prazos próximos |
| `edital-monitor` | Periódico | Detecta novos editais |

Crons são chamados sem JWT — autenticidade garantida pela origem (pg_cron) e ausência de side-effects sensíveis.
