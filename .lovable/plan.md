## Objetivo
Unificar o pipeline de palco-search: gravar sempre em `editais` (tipo='palco') sem perder os campos específicos de palco, e fazer o frontend ler esses campos do mesmo lugar.

## Decisão de destino
- **`editais`** vira o destino único do pipeline por-usuário (editais + palcos buscados via IA).
- **`palcos_curados`** permanece como tabela curada pelo admin/seed (global, somente leitura para usuários). Sem mudanças nela.

## Mudanças

### 1. Migration — estender `editais`
Adicionar colunas (todas nullable) para preservar os campos palco-only que hoje viram texto livre/perdido:
- `tipo_palco text` ("festival" | "showcase" | "circuito" | "residencia" | "abertura")
- `generos text[] default '{}'`
- `porte text` ("iniciante" | "medio" | "grande")
- `tem_edital boolean`
- `periodo_inscricao text`

Sem mudança de RLS (já é per-user). Sem alteração em `palcos_curados`.

### 2. `supabase/functions/palco-search/index.ts`
Incluir esses 5 campos no upsert (já é upsert para `editais` com `onConflict: user_id,session_key`). Remover só os comentários sobre "campos perdidos".

### 3. `src/hooks/usePalcos.ts` (`saveResults`)
- Trocar fluxo select+filter+insert por `upsert(... { onConflict: "user_id,session_key", ignoreDuplicates:true }).select("id")`, igual ao `useEditais.saveResults`.
- Persistir `tipo_palco`, `generos`, `porte`, `tem_edital`, `periodo_inscricao`, `link_status:'unknown'`, `link_checked_at`.
- Toast com contagem real de novos/duplicados.

### 4. `src/hooks/useEditais.ts`
Expandir interface `Edital` com `tipo?`, `tipo_palco?`, `generos?`, `porte?`, `tem_edital?`, `periodo_inscricao?` para que o tipado bata com o que vem do DB.

### 5. `src/components/carreira/types.ts` + `src/pages/Carreira.tsx`
No mapeamento `editais.map(editalToOpportunity)`:
- Se `e.tipo === 'palco'`, converter para `Opportunity` com `tipo: 'palco'`, preenchendo `generos`, `porteOuTipo = tipo_palco`, etc., a partir das novas colunas (com fallback para os campos existentes — `valor`, `publico_alvo`, `area` — quando colunas novas vierem null em linhas antigas).
- Caso contrário, comportamento atual (`editalToOpportunity`).

Resultado: filtros por gênero, badges de tipo de palco e detalhe funcionam tanto para palcos curados quanto salvos via IA, lendo os mesmos campos.

### 6. Backfill (na mesma migration, opcional mas barato)
Para linhas antigas com `tipo='palco'` em `editais`: deixar colunas novas nulas — o mapper cai no fallback (`area`/`valor`/`publico_alvo`). Sem risco de corromper dados.

## Fora de escopo
- Mudar `palcos_curados` (segue como admin/curado).
- Telemetria de `oportunidades-search`, soft-404, prompt 2025-26.
- Reescrever `EditalInscricao.tsx`/`PalcoProposta.tsx` (continuam lendo os campos atuais).

## Validação
- Após deploy: rodar `palco-search` com `save_results=true`, conferir no DB que linha em `editais` tem `tipo_palco`/`generos`/`porte` preenchidos.
- No frontend Carreira: filtro por gênero retorna palcos salvos via IA; sheet de detalhe mostra tipo e gêneros.