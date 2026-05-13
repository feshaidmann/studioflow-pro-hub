## Objetivo

Garantir que novas mensagens do chat do projeto apareçam automaticamente, sem necessidade de refresh.

## Diagnóstico atual

- `project_messages` já está em `supabase_realtime` e tem `REPLICA IDENTITY FULL` (migração `20260513174344`).
- `useProjectChat` já cria um canal `project-chat-${projectId}` e escuta `INSERT/UPDATE`.
- Pontos frágeis identificados:
  1. O `subscribe()` é chamado sem callback de status — falhas (RLS/CHANNEL_ERROR/TIMED_OUT) ficam silenciosas.
  2. O `fetchMessages` roda em paralelo ao `subscribe`; uma mensagem que chegue durante o fetch pode ser perdida (a deduplicação por `id` ajuda, mas só no INSERT — não há reconciliação após reconexões).
  3. Se a aba ficar em background e o socket cair, não há retry/refetch ao voltar (`visibilitychange`).
  4. O canal é recriado sempre que `projectId` muda, mas não há proteção contra StrictMode duplicado em dev.

## Plano de implementação

### 1. `src/hooks/useProjectChat.ts`
- Subscrever assim:
  ```ts
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      // Refetch para reconciliar mensagens enviadas durante a janela
      // entre fetchMessages() inicial e SUBSCRIBED
      fetchMessages();
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.warn("[chat] realtime subscription falhou:", status);
    }
  });
  ```
- Manter dedup por `id` no handler de INSERT (já existe).
- Adicionar listener de `visibilitychange`: quando a aba voltar a ficar visível, chamar `fetchMessages()` para garantir consistência caso o socket tenha caído.
- Garantir cleanup chamando `supabase.removeChannel(channel)` antes de criar novo canal (já é feito via return do effect — manter).

### 2. Validação manual (sem novas migrações)
- Abrir o mesmo projeto em duas abas/usuários, enviar mensagem em uma e confirmar que aparece na outra sem refresh.
- Conferir no console: `[chat] realtime subscription falhou` não deve aparecer.

## Fora de escopo
- Indicador "digitando…" (presence).
- Read receipts.
- Migração de schema adicional — publicação e replica identity já estão corretas.

## Arquivos afetados
- `src/hooks/useProjectChat.ts` (única edição)
