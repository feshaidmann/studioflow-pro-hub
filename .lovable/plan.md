## Objetivo

Tornar o "porquê desta oportunidade" visível de forma consistente (não só em buscas IA) e fazer o pipeline (`Inscrições`) priorizar visualmente o que vence antes — reduzindo perdas por prazo e acelerando a decisão.

## Escopo

### 1. match_reason persistente nos cards de Descobrir

Hoje `matchReason` só aparece em `OpportunityCard` quando `origem === "ai"`, pois a coluna não existe nas tabelas — ao salvar o edital o motivo é perdido.

- **Migração**: adicionar coluna `match_reason TEXT NOT NULL DEFAULT ''` em `editais` e em `palcos_curados`.
- **`useEditais.saveResults`**: incluir `match_reason: e.match_reason || ''` no insert.
- **`Edital` (interface)**: adicionar campo opcional `match_reason?: string`.
- **`OpportunityCard`**: remover o gate `op.origem === "ai"`. Renderizar a frase com ícone `Sparkles` sempre que `matchReason` existir; manter o tom `text-primary/90` e `line-clamp-2`.
- **Edge function `oportunidades-search`**: já gera `match_reason` — sem mudança.

### 2. Pipeline ordenado por prazo

Em `Carreira.tsx` a lista `applications` é renderizada na ordem que vem da RPC (created_at desc). Vamos ordenar no cliente, no `useMemo`, com a regra:

```text
1. status ativo primeiro: interesse < preparando < inscrito < (resto)
2. dentro do grupo, prazo ascendente (mais próximo primeiro)
3. sem prazo vai para o fim
4. resultados finais (aprovado/reprovado/desistencia/lista_espera) sempre no fim
```

- Criar `sortedApplications = useMemo(...)` e usar no `.map`.
- Adicionar microcopy à direita do prazo no card do pipeline:
  - `prazo < hoje` → badge `destructive` "Vencido há Xd"
  - `0 ≤ dias ≤ 7` → badge `warning` "Faltam Xd"
  - `8 ≤ dias ≤ 30` → texto muted "Faltam Xd"
  - sem prazo → nada (mantém o atual)
- Formatar o prazo já exibido (`a.edital.prazo` cru) com `formatDate` pt-BR.

### Fora de escopo
- Expor `match_reason` na RPC `list_user_applications` (pipeline) — pode entrar em P1 separado.
- Alterar ranking da aba Descobrir.
- Notificações push de prazo (já existe outra trilha).

## Detalhes técnicos

**Arquivos a editar**
- `supabase/migrations/<novo>.sql` — `ALTER TABLE editais ADD COLUMN match_reason text NOT NULL DEFAULT ''; ALTER TABLE palcos_curados ADD COLUMN match_reason text NOT NULL DEFAULT '';`
- `src/hooks/useEditais.ts` — campo na interface + no insert.
- `src/components/carreira/OpportunityCard.tsx` — remover condição `origem === "ai"`.
- `src/pages/Carreira.tsx` — `sortedApplications` + helper `deadlineBadge(prazo)`; renderizar badge ao lado do `<Calendar/>`.

**Helper de prazo (em `Carreira.tsx` ou `src/lib/carreira/deadline.ts`)**
```ts
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00-03:00");
  const diff = (d.getTime() - Date.now()) / 86400000;
  return Math.round(diff);
}
```

**Ordenação**
```ts
const STATUS_WEIGHT = { interesse: 0, preparando: 1, inscrito: 2, em_analise: 3 };
sortedApplications.sort((a, b) => {
  const aFinal = !!a.resultado, bFinal = !!b.resultado;
  if (aFinal !== bFinal) return aFinal ? 1 : -1;
  const sa = STATUS_WEIGHT[a.status] ?? 9;
  const sb = STATUS_WEIGHT[b.status] ?? 9;
  if (sa !== sb) return sa - sb;
  const pa = a.edital?.prazo, pb = b.edital?.prazo;
  if (!pa && !pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  return pa.localeCompare(pb);
});
```

## Validação
- Buscar oportunidades IA, salvar uma, recarregar Descobrir → `matchReason` ainda visível no card salvo.
- Criar 3 candidaturas com prazos diferentes (1d, 10d, 60d) e uma sem prazo → pipeline lista nessa ordem; aprovados/recusados ao fim.
- Conferir badges "Vencido há Xd" e "Faltam Xd" com formatação pt-BR.
