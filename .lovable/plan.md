## Dismiss/Snooze de sugestões de profissionais (MissingRoleHint)

Adicionar dois botões em cada `MissingRoleHint` na aba **Equipe** do projeto:
- **Lembrar depois** → oculta a sugestão por 3 dias.
- **Desconsiderar** → oculta permanentemente aquele papel naquele projeto (sem opção de desfazer).

### 1. Banco (migration)

Nova tabela `marketplace_hint_dismissals`:
- `id uuid pk`
- `user_id uuid not null`
- `project_id uuid not null`
- `specialty text not null` (papel ocultado, ex: "Mix Engineer")
- `snooze_until timestamptz null` — quando `null`, é permanente
- `created_at timestamptz default now()`
- UNIQUE `(user_id, project_id, specialty)` — upsert na ação
- RLS: usuário gerencia somente os próprios registros (`user_id = auth.uid()`).

Sem trigger de limpeza — registros snooze expirados ficam no banco mas são ignorados pela query (custo zero).

### 2. Frontend

**`MissingRoleHint.tsx`** — adicionar dois botões secundários ao lado do CTA "Buscar no marketplace":
```text
[ Buscar no marketplace ]  [Lembrar depois]  [Desconsiderar]
```
- "Lembrar depois" → grava `snooze_until = now() + 3 days`, toast "Lembraremos em 3 dias" e remove o hint da tela.
- "Desconsiderar" → confirm inline ("Tem certeza? Não vamos mais sugerir este papel neste projeto.") → grava `snooze_until = null`, toast "Sugestão removida" e remove o hint.

**`ProjectTeamTab.tsx`** — antes de calcular os papéis faltantes:
1. Carregar dismissals do usuário para o `project_id` atual via `useDismissedHints(projectId)`.
2. Filtrar a lista de papéis faltantes removendo specialties cujo registro tenha `snooze_until IS NULL` (permanente) ou `snooze_until > now()` (snooze ativo).

**Novo hook `useDismissedHints.ts`**:
- `dismissed: Set<string>` (specialties efetivamente ocultas agora)
- `dismiss(specialty, mode: "snooze" | "permanent")` — upsert na tabela.
- `refresh()` chamado após cada ação.

### 3. Comportamento de borda

- Sem botão "ver ocultas" — decisão explícita do usuário (resposta: "Não precisa reverter").
- Snoozes expirados reaparecem automaticamente na próxima visita à aba.
- Dismissals são por par `(project_id, specialty)`; mesmo papel em outro projeto continua sendo sugerido normalmente.
- A entrada manual no marketplace (botão "Marketplace" no topo da aba) continua sempre disponível — o dismiss só afeta o hint contextual.

### Arquivos tocados

- `supabase/migrations/<ts>_marketplace_hint_dismissals.sql` (nova)
- `src/hooks/useDismissedHints.ts` (novo)
- `src/components/marketplace/MissingRoleHint.tsx` (botões)
- `src/components/project-hub/ProjectTeamTab.tsx` (filtro + integração do hook)

### Fora de escopo
- UI para reverter dismissals (usuário escolheu "Não precisa").
- Dismiss global por papel (escopo escolhido: papel + projeto).
- Notificações/lembrete push quando o snooze expira.
