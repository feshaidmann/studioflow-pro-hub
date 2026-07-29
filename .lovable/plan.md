## Inspeção geral — StudioFlow Pro

Rodei typecheck, lint, build, suíte de testes, linter do banco e varreduras de padrão em todos os módulos. Resultado abaixo (tudo verificado, sem suposições).

### Estado atual (medido)

| Verificação | Resultado |
|---|---|
| TypeScript (`tsgo --noEmit`) | limpo, 0 erros |
| ESLint | **236 erros** (226 `no-explicit-any`) |
| Testes (Vitest) | **6 falhas** / 560 testes, em 1 arquivo |
| Build produção | OK |
| Linter do banco | 52 avisos, todos informativos (`SECURITY DEFINER` executável) + 1 extensão no schema público |
| Tokens de design | 0 uso de `dark:` no app autenticado (só 2 no `ProfessionalFormDialog`) |

---

## 1. Bug funcional crítico — alerta de gênero está desligado em produção

`src/components/music-dna/GenreMismatchHint.tsx` tem um `return null;` na **linha 33**, logo após os hooks e **antes de toda a lógica**. O componente nunca renderiza nada; as ~120 linhas seguintes são código morto, incluindo o feedback "Falso alerta / Alerta correto" que alimenta a calibração por usuário.

Consequência em cadeia: a tabela `genre_mismatch_feedback` deixou de receber dados, então a calibração de thresholds nunca aprende. É exatamente isso que derruba os 6 testes (todos os casos `alerta=true`).

Ação: remover o kill switch e reexecutar a suíte. Se o desligamento foi intencional (alerta ruidoso demais), a alternativa é uma flag explícita e documentada em vez de um `return` mudo.

## 2. Testes vermelhos

Os 6 casos que falham (`Pop ↔ Heavy Metal`, `Bossa Nova ↔ Trap BR`, `Funk Carioca ↔ Country`, `Sertanejo ↔ Hip-Hop`, `Forró ↔ Heavy Metal` e o caso de calibração) são todos consequência direta do item 1 — a suíte estava certa e o código regrediu. Devem voltar ao verde com a correção, sem alterar os testes.

## 3. Qualidade de tipos — 226 `any`

Concentração por arquivo:

```text
49  src/pages/admin/Carreira.tsx
13  src/pages/PalcoProposta.tsx
 9  src/hooks/useProfessionalsList.ts
 9  src/pages/InviteResponse.tsx
 8  src/pages/FreelancerProfile.tsx
 7  ProjectContext / useEditais / useProfessionalMetrics / PublicProfile
```

O padrão dominante é resposta de RPC/Supabase tipada como `any`, o que anula a proteção dos tipos gerados. Proposta: tipar via `Database["public"]["Functions"][...]["Returns"]` nos 6 arquivos mais críticos (cobre ~95 dos 226) e deixar o resto para uma limpeza incremental. Também há 4 `catch {}` vazios, 1 `prefer-const`, 1 `require()` em teste e 1 comparação sempre-verdadeira (`no-constant-binary-expression`) — corrigíveis em minutos.

## 4. Inconsistência de arquitetura de dados

**28 dos 47 hooks** que falam com o backend não usam React Query — implementam `useState` + `useEffect` + fetch manual (`useTasks`, `useEvents`, `useFinancialData`, `useEditais`, `usePalcos`, `useNotifications`, `useProfessionals`, entre outros). Efeitos práticos: sem cache compartilhado, sem dedupe, refetch manual espalhado, e o `staleTime` global de 2 min não vale para eles.

Além disso, **apenas `useProjectChat` usa Realtime** — Agenda, Tarefas e Notificações dependem de refetch manual, apesar de o `QueryClient` estar configurado com `refetchOnWindowFocus: false` justamente porque "o Realtime cuida disso". Essa premissa não se sustenta hoje fora do chat.

Proposta: migrar em ondas, começando pelos 4 hooks de maior tráfego (`useTasks`, `useEvents`, `useNotifications`, `useFinancialData`), com Realtime invalidando a query key correspondente.

## 5. Peso do bundle

Chunks maiores do build atual:

```text
422 KB  vendor-charts (recharts)
416 KB  jspdf
385 KB  index (entry)
202 KB  html2canvas
173 KB  vendor-supabase
```

`jspdf` + `html2canvas` (618 KB) servem só à exportação de briefing/PDF, mas há indício de que entram cedo no grafo. Ação: garantir `import()` dinâmico no ponto de exportação e avaliar mover a geração de PDF para a edge function `export-visual-briefing`, que já existe.

## 6. Backend — sem falhas de segurança abertas

Os 52 avisos do linter são o ruído esperado de um projeto com muitas RPCs `SECURITY DEFINER` (todas já com `SET search_path`, garantido pelo `security-invariants.test.ts`). Nenhuma tabela sem RLS, nenhum GRANT faltando. O único item real é a extensão instalada no schema `public` — baixo risco, mas vale registrar como aceito na memória de segurança para o scanner parar de reapontar.

---

## Plano de execução proposto

**Fase 1 — Correção (curta, alto impacto)**
- Remover o `return null;` órfão do `GenreMismatchHint`
- Reexecutar a suíte até 560/560 verde
- Corrigir os 8 erros de lint não relacionados a `any` (catches vazios, `prefer-const`, `require`, comparação constante)

**Fase 2 — Tipagem**
- Eliminar `any` nos 6 arquivos concentradores usando os tipos gerados do banco

**Fase 3 — Dados**
- Migrar `useTasks`, `useEvents`, `useNotifications` e `useFinancialData` para React Query + Realtime

**Fase 4 — Performance**
- Lazy-load real de `jspdf`/`html2canvas`; medir o bundle antes/depois

**Fase 5 — Higiene**
- Registrar a extensão em `public` como aceita na memória de segurança
- Atualizar `caniuse-lite` (dado de browsers com 13 meses)

Sugiro executar a Fase 1 imediatamente — é o único item que afeta usuário final hoje. As demais podem ir em passadas separadas.
