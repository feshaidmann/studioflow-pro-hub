## Diagnóstico

A criação de candidatura no módulo Palcos falha silenciosamente. Causa raiz:

1. **Upsert em índice parcial não funciona.** A tabela `editais` tem um índice ÚNICO PARCIAL: `idx_editais_user_session_key ON (user_id, session_key) WHERE session_key <> ''`. O `supabase.from("editais").upsert(..., { onConflict: "user_id,session_key" })` usa `INSERT ... ON CONFLICT (user_id, session_key)` sem cláusula `WHERE`, que o Postgres rejeita ("there is no unique or exclusion constraint matching the ON CONFLICT specification"). O erro é ignorado em `StartCandidaturaDialog` (apenas `data` é desestruturado), `upserted` fica `null`, `onConfirm` nunca é chamado e nada acontece — o usuário vê o diálogo fechar e "Nenhuma candidatura ainda".

2. **Erros silenciados.** O bloco do botão "Iniciar" não trata `error` nem mostra toast em caso de falha.

3. **Warning React (não bloqueia, mas suja o console):** `StartCandidaturaDialog` e `PalcoCard` recebem `ref` de wrappers (Radix `Tabs`/`Presence`) e disparam "Function components cannot be given refs". Resolver com `forwardRef`.

## Mudanças

### `src/pages/Palcos.tsx`

**1. Substituir o `upsert` em `StartCandidaturaDialog` por um fluxo SELECT → UPDATE/INSERT manual** (compatível com índice parcial):

```ts
// 1) procurar edital existente por (user_id, session_key)
const { data: existing } = await supabase
  .from("editais")
  .select("id")
  .eq("user_id", session.user.id)
  .eq("session_key", sk)
  .maybeSingle();

let editalId = existing?.id as string | undefined;
const payload = { /* mesmos campos atuais, sem user_id/session_key no UPDATE */ };

if (editalId) {
  const { error: updErr } = await supabase.from("editais").update(payload).eq("id", editalId);
  if (updErr) { toast.error("Erro ao salvar palco: " + updErr.message); return; }
} else {
  const { data: inserted, error: insErr } = await supabase
    .from("editais").insert({ ...payload, user_id: session.user.id, session_key: sk } as any)
    .select("id").single();
  if (insErr || !inserted) { toast.error("Erro ao criar palco: " + (insErr?.message || "")); return; }
  editalId = inserted.id;
}

onConfirm({ edital_id: editalId, project_id: ..., notas: ..., tipo: "palco", data_inscricao: ... });
```

**2. Toast de erro também no `useCreateApplication.onError`** — já existe; manter. Adicionar log para depuração.

**3. Embrulhar `StartCandidaturaDialog` e `PalcoCard` em `React.forwardRef`** para suprimir o warning quando renderizados dentro de `TabsContent`/`Presence`. Os refs são apenas encaminhados para o `<div>`/`<Dialog>` raiz (não usados internamente).

## Fora de escopo

- Mexer no índice parcial do banco (manter — é correto para evitar duplicar quando `session_key` está vazio).
- Refatorar `useCreateApplication` ou `useEditalApplications`.
- Outras mudanças de UI no módulo Palcos.

## Resultado esperado

Clicar "Iniciar" no diálogo de candidatura cria/atualiza o `editais` (palco) e a `edital_applications`, mostra o toast "Candidatura iniciada!" com link para a aba "Candidaturas", e a aplicação aparece na lista. Erros do banco passam a ser visíveis via toast em vez de falharem silenciosamente.
