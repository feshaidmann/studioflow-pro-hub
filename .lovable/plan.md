## Problema

Os sinais `copied` e `task_created` já estão conectados no `MusicDNAAnalyzer`, mas o hook `useAcceptanceSignal` faz **early return** quando `analysisId` é nulo. Como `savedAnalysisId` só existe depois que o usuário clica em "Salvar análise", qualquer cópia do resumo ou conversão em tarefa feita antes do save é descartada silenciosamente — exatamente o caminho mais comum do produtor.

## Objetivo

Garantir que `copied` e `task_created` sempre persistam em `diagnosis_acceptance_signals`, mesmo que o usuário ainda não tenha salvo manualmente.

## Abordagem: auto-save preguiçoso ao primeiro sinal implícito

Quando o usuário dispara um sinal implícito (`copied`, `task_created`, `thumbs_up`, `thumbs_down`) e ainda não há `savedAnalysisId`, salvamos a análise em background, recuperamos o `id` retornado e só então despachamos o sinal. O save explícito continua funcionando normalmente; o sinal `saved` já é registrado dentro de `useSavedAnalyses.saveAnalysis` (não duplicar).

### Mudanças

1. **`src/components/music-dna/MusicDNAAnalyzer.tsx` (ResultView)**
   - Receber `onEnsureSaved: () => Promise<string | undefined>` via props (resolve para o id existente ou recém-criado; `undefined` se o save falhar).
   - Criar wrapper `ensureSignal(signal)`:
     ```ts
     const id = savedAnalysisId ?? (await onEnsureSaved());
     if (id) sendSignal({ analysisId: id, variant: summaryVariant, signal });
     ```
   - Substituir as duas chamadas atuais (`onSendSignal` em `<ExecutiveSummary>` e `task_created` em `handleAddAllSteps`) por `ensureSignal(...)`.
   - Manter o comportamento silencioso em caso de falha (sinal de telemetria não bloqueia UX).

2. **`MusicDNAAnalyzer` (container, ~linha 1857)**
   - Extrair a lógica de `handleSave` para uma função `ensureSaved()` que:
     - Retorna `savedAnalysisId` se já existir.
     - Caso contrário, chama `saveAnalysis(...)` via `mutateAsync` (precisa expor `mutateAsync` no `useSavedAnalyses` se ainda não estiver), seta `isSaved`/`savedAnalysisId` no `onSuccess` e devolve o `id`.
     - Guarda uma `Promise` em ref (`savingPromiseRef`) para deduplicar saves concorrentes (ex.: clique rápido em copiar + adicionar passos).
   - Passar `onEnsureSaved={ensureSaved}` para `ResultView`.

3. **`src/hooks/useSavedAnalyses.ts`** (apenas se necessário)
   - Confirmar que `saveAnalysis` é uma `useMutation` com `mutateAsync` disponível; se o export atual for só `mutate`, expor também `saveAnalysisAsync`.

### Fora de escopo

- Não mexer na migration nem na edge function `music-dna-analyze`.
- Não alterar o sinal `saved` (já registrado em `useSavedAnalyses`).
- Não alterar `thumbs_up`/`thumbs_down` em termos de UI — só passam pelo mesmo `ensureSignal`.
- Sem auto-save quando o usuário apenas visualiza o resultado sem interagir.

### Validação

- Cópia do resumo sem salvar → 1 linha em `diagnosis_acceptance_signals` com `signal_type='copied'` e a análise persistida em `music_dna_analyses`.
- "Adicionar todos os passos" sem salvar → linha `task_created` + análise persistida.
- Dois cliques rápidos (copiar + tarefas) → apenas um `INSERT` em `music_dna_analyses` (dedupe via ref).
- Clique em "Salvar" após sinais implícitos → não cria análise duplicada nem sinal `saved` duplicado (UNIQUE constraint cobre).