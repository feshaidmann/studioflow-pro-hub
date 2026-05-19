## Correções no fluxo de convites

### 1. 🔴 Bloquear aceite com email divergente (`respond-to-invite`)

No edge function `supabase/functions/respond-to-invite/index.ts`:
- Quando o request trouxer `Authorization: Bearer <jwt>`, criar um client com esse token e chamar `auth.getUser()` para obter o email do usuário logado.
- Se houver usuário logado e `user.email.toLowerCase() !== inv.professional_email.toLowerCase()`, retornar **403** com `{ error: "email_mismatch", invited_email: inv.professional_email }`.
- Não consumir o convite nesse caso.

No frontend `src/pages/InviteResponse.tsx`:
- Enviar o header `Authorization` quando houver sessão (via `supabase.auth.getSession()`).
- Tratar o erro `email_mismatch` com um novo `PageState` (`email_mismatch`) mostrando: *"Este convite é para `{invited_email}`. Saia da conta atual ou entre com o email correto."* + botões "Sair" (`supabase.auth.signOut()` e recarregar) e "Voltar".

### 2. 🔴 Reconciliar membership pós-signup

Migration:
- Criar função `public.reconcile_invitations_for_new_user()` `SECURITY DEFINER` que, para o `NEW.id`/`NEW.email`, faz `UPDATE project_members SET user_id = NEW.id, delivery_status='ativo', last_activity_at=now() WHERE lower(email)=lower(NEW.email) AND user_id <> NEW.id` e marca `invitation_id` quando aplicável (join com `project_invitations` accepted).
- Trigger `AFTER INSERT ON auth.users` chamando essa função.
- Também rodar um backfill único no final da migration para reconciliar usuários já existentes.

### 3. 🟡 Aviso no `/auth` quando vier de convite

Em `src/pages/Auth.tsx`:
- Detectar `searchParams.get("redirect")?.startsWith("/invite/")` **ou** novo param `invited_email`.
- Mostrar banner discreto acima do form: *"Use o mesmo email para o qual o convite foi enviado, senão o acesso ao projeto não será vinculado."*
- Em `InviteResponse.tsx`, ao montar o botão "Entrar na plataforma", anexar `&invited_email={professional_email}` para pré-preencher o campo de email no Auth (`useEffect` lê e seta).

### 4. 🟡 UNIQUE parcial em `project_invitations`

Migration:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS project_invitations_unique_pending
  ON public.project_invitations (project_id, lower(professional_email))
  WHERE status = 'pending';
```
- Antes do índice, rodar dedupe: manter o mais recente por `(project_id, lower(email))` em status pending e marcar duplicados como `status='cancelled'` (ou `declined`) com `responded_at=now()`.
- Atualizar `send-project-invite` para tratar erro de constraint retornando mensagem amigável ("Já existe um convite pendente para este email neste projeto").

### 5. 🟡 Retematizar `InviteResponse.tsx` (light / macOS)

Reescrever a página removendo:
- `GradientBg` escuro (`hsl(240 10% 3.9%)`), orbs `neon-pink`, gradients `primary→neon-pink`, `neon-glow`, sombras `0 0 60px`.
- Substituir por:
  - Fundo `bg-background` (neutro cinza claro já no design system).
  - Cards com `bg-card border border-border rounded-2xl shadow-sm` (sem backdrop-blur escuro).
  - Logo: ícone simples em `bg-primary/10 text-primary` sem blur.
  - Botões usando variantes padrão (`Button` default + `variant="outline"` para recusar), sem `neon-glow`.
  - Highlight de cachê/prazo com `bg-muted/40` e accent sutil em `text-primary` / `text-warning`.
  - Animação de confirmação: substituir orbe gradiente pulsante por check/X em círculo sólido `bg-success`/`bg-destructive` com `animate-scale-in` apenas.
- Manter toda a lógica de estados (`loading`, `ready`, `accepted`, `declined`, `already_responded`, `expired`, `not_found`, `error`, novo `email_mismatch`).

### Ordem de execução
1. Migration (itens 2 + 4, incluindo dedupe e backfill).
2. Edge function `respond-to-invite` (item 1) + ajuste em `send-project-invite` (item 4).
3. `Auth.tsx` (item 3).
4. `InviteResponse.tsx` (itens 1 frontend + 3 link + 5 retema).

### Detalhes técnicos
- A trigger em `auth.users` é permitida (já existe `handle_new_user`), então adicionamos uma segunda função separada para reconciliação — não tocar na existente.
- A função de reconciliação não precisa cruzar `project_invitations` se já existir `project_members` por email; basta atualizar pelo email. O `invitation_id` é preenchido quando há match em `project_invitations` accepted.
- Para o 403 de email_mismatch, garantir que o edge function não atualize nada antes da checagem (mover validação para logo após o fetch do invitation).
- O índice UNIQUE parcial requer `lower(professional_email)` — Postgres aceita expressão em índice único.