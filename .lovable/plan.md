## Objetivo

Criar uma suíte de testes end-to-end que valide as garantias de RLS e fluxos `SECURITY DEFINER` do StudioFlow contra o banco Supabase real, exercitando os cenários sensíveis (convites, leitura de projetos, acesso admin, privacidade financeira) com usuários de roles diferentes.

Complementa o `src/test/security-invariants.test.ts` (estático) com verificações **dinâmicas** — se alguém afrouxar uma policy ou esquecer um `WITH CHECK`, o teste falha de verdade.

## Stack

- **Vitest** (já configurado) com um novo projeto `rls` isolado do unit run padrão.
- `@supabase/supabase-js` instanciado por usuário (anon key + sessão própria), sem service role no cliente.
- Um cliente admin via `SUPABASE_SERVICE_ROLE_KEY` **só** dentro do setup/teardown para criar/destruir usuários — nunca exposto aos testes em si.
- Roda apenas quando as variáveis de ambiente estão presentes (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Em CI sem secrets, a suíte é pulada com `describe.skipIf`.

## Estrutura

```text
src/test/rls/
  setup.ts              # cria/derruba usuários, helpers de auth
  fixtures.ts           # cria projects, invitations, transactions seed
  invitations.e2e.ts    # convidar/aceitar/recusar via RPC
  projects.e2e.ts       # owner vs membro vs estranho vs anon
  admin.e2e.ts          # user_roles, admin RPCs, function_logs
  finance.e2e.ts        # guest não vê transactions/valor
  cleanup.ts            # remove usuários e dados de teste
package.json            # novo script "test:rls"
vitest.rls.config.ts    # config separada (timeout maior, sem jsdom)
```

## Cenários cobertos

**1. Convites (`project_invitations` / `platform_invitations`)**
- Anon não consegue `SELECT * FROM project_invitations` direto (mesmo com token).
- `respond-to-invite` edge function: token válido → aceita; token expirado → 410; token inválido → 404; reuso → 409.
- Após `accepted`, o convidado vira `project_members` e enxerga o projeto via `get_member_projects` RPC.

**2. Projetos (`projects`, `project_members`)**
- Owner: CRUD completo.
- Membro aceito: SELECT via RPC, **sem** acesso a campos financeiros.
- Estranho autenticado: 0 linhas.
- Anon: 0 linhas / permission denied.

**3. Admin (`user_roles`, `function_logs`, `ai_invocations`, `marketplace_curated_providers`)**
- Usuário comum: SELECT em `function_logs` retorna vazio.
- Admin (inserido em `user_roles`): SELECT funciona, INSERT em `marketplace_curated_providers` funciona.
- Tentativa de auto-promoção: usuário comum não consegue `INSERT INTO user_roles ... role='admin'`.

**4. Privacidade financeira**
- Owner vê `transactions` próprias.
- Guest aceito no projeto: `SELECT FROM transactions WHERE project_id=...` retorna 0 linhas.
- RPC `get_project_for_member` chamada pelo guest não devolve `valor_total`, `gross_revenue`, `cache`.

**5. Storage (smoke)**
- Upload em `avatars/{outroUserId}/foo.png` falha; em `avatars/{self}/foo.png` passa.

## Setup/teardown

- `beforeAll`: cria 4 usuários efêmeros (owner, member, stranger, admin) com `admin.createUser({ email_confirm: true })`, promove `admin` em `user_roles`, cria 1 projeto + 1 convite + 1 transação via service role.
- `afterAll`: `admin.deleteUser()` em cascata derruba `profiles`, `projects`, `transactions`, `project_invitations` (FK ON DELETE CASCADE já existentes).
- Emails usam prefixo `rls-test+<uuid>@studioflow.test` para facilitar limpeza manual se algo falhar.

## Execução

- Local: `npm run test:rls` — exige `.env.test` com as 3 variáveis.
- CI: job separado (não bloqueia o unit run); habilitado quando `SUPABASE_SERVICE_ROLE_KEY` está disponível como secret.
- Documentado em `docs/05-seguranca.md` (seção nova "Testes E2E de RLS").

## Detalhes técnicos

- `supabaseUser(email, password)` helper retorna um client com sessão própria — sem compartilhar com o singleton de `src/integrations/supabase/client.ts` para evitar poluir `localStorage` em jsdom.
- `vitest.rls.config.ts` usa `environment: 'node'`, `testTimeout: 30_000`, `pool: 'forks'`, `sequence: { concurrent: false }` (fixtures compartilhadas).
- Assertions sobre erros de RLS checam `error.code === '42501'` ou `data.length === 0` (PostgREST converte negação de SELECT em zero linhas, não em erro).
- Edge functions são chamadas via `supabase.functions.invoke` com o token do usuário relevante, validando o gate de auth dentro da função.

## Fora do escopo

- Não testa frontend renderizado (Playwright/Cypress) — fica para uma próxima iteração se houver demanda.
- Não roda contra o banco de produção. Espera-se um projeto Supabase de staging dedicado (ou o próprio dev) — a suíte recusa rodar se `SUPABASE_URL` apontar para o ref de produção (`icdedfqsiorzzuhzvfgl`) sem `RLS_TEST_ALLOW_PROD=1`.

## Entregáveis

- 6 arquivos novos em `src/test/rls/` + helpers.
- `vitest.rls.config.ts` e script `test:rls` no `package.json`.
- Seção em `docs/05-seguranca.md` explicando como rodar e o que cobre.
- Nenhuma migração de banco (suíte usa apenas o que já existe).
