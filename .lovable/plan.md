## Diagnóstico

Auditei o caminho completo do pipeline de vizinhos do DNA Musical (`useMusicDNA.ts` → edge function `music-dna-analyze` → RPCs `find_nearest_reference_tracks` / `get_genre_reference_examples` → validação client-side → UI). Os RPCs já ordenam por distância ponderada nos atributos extraídos (LUFS, DR, centroide, BPM, energia, etc.), com `band ASC, filename ASC` apenas como desempate em distâncias idênticas. Isso está correto.

Os problemas reais que ainda permitem "vazamento" de ordem alfabética / semântica no prompt e nas referências exibidas:

### Problema 1 — Pool técnico de comparação é, na verdade, curadoria semântica + ordem alfabética
- `src/lib/musicDnaReferences.ts` define uma lista hardcoded de artistas com `territories`/`tags`. `selectReferenceArtists` ordena por sobreposição de territórios e usa **`localeCompare` como desempate** (linha 131), depois concatena `ALL_REFERENCE_ARTISTS` (que segue a ordem de declaração no arquivo).
- Esse resultado é injetado em `useMusicDNA.ts` (linha 376) como `"Pool técnico de comparação"` — rótulo enganoso: não há nenhuma medição de atributos do áudio aí. O LLM passa a misturar essa lista com os vizinhos reais.

### Problema 2 — Prompt da edge function não força ordenação/threshold por `similarity_score`
- `supabase/functions/music-dna-analyze/index.ts` linhas 71–74 descrevem faixas de score (≥0,80, 0,55–0,80, <0,55) mas **não obrigam o modelo a ordenar por `similarity_score` decrescente nem a descartar scores baixos**. A instrução prometida na conversa anterior ("Ordene por `similarity_score`, cite apenas ≥ 0,70") não está aplicada no arquivo atual.

### Problema 3 — Validação client-side permite artista curado sem proximidade real
- `useMusicDNA.ts` linhas 642–650 montam `allowedArtists` a partir de `ALL_REFERENCE_ARTISTS` ∪ `catalogNeighbors`. Resultado: o LLM pode citar qualquer artista da curadoria estática, mesmo que ele não esteja entre os vizinhos reais da faixa. O filtro não garante proximidade técnica, só "está na lista grande".

### O que já está correto e NÃO muda
- `find_nearest_reference_tracks` (RPC): ordenação por `norm_distance + bônus` ASC; alfabético só como desempate de empates exatos. Mantém.
- `get_genre_reference_examples` (RPC): ordenação por distância à mediana do gênero. Mantém.
- UI (`NeighborDetailDialog`, `MusicDNAAnalyzer`): consome `neighbors` na ordem em que vêm (já por similaridade). Mantém.

## Mudanças

### 1. `src/lib/musicDnaReferences.ts`
- Remover o desempate alfabético em `selectReferenceArtists` (linha 131): manter apenas `b.score - a.score` e estabilizar pelo índice original quando o score empatar, sem `localeCompare`.
- Adicionar comentário deixando explícito que essa função é apenas para **enriquecer o vocabulário de tags do prompt**, não para comparação técnica.
- Exportar adicionalmente uma flag/comentário JSDoc destacando o escopo (semântico, não acústico).

### 2. `src/hooks/useMusicDNA.ts`
- Renomear no prompt (linha 376) `"Pool técnico de comparação"` para algo como `"Vocabulário semântico de artistas do mesmo território (referência de linguagem, NÃO comparação acústica)"`, deixando claro ao LLM que comparação técnica vem somente do bloco "VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL".
- Atualizar a instrução do campo `referencias_proximas` (linha 425) para:
  - Usar **exclusivamente** os vizinhos do catálogo (`band+filename`) ordenados por `similarity_score` decrescente.
  - Descartar entradas com `similarity_score < 0,70`.
  - Se não houver vizinho ≥ 0,70, retornar array vazio em vez de inventar.
- Reforçar (mesmo bloco) que a curadoria de artistas é apenas vocabulário, não fonte de "referências próximas".
- Validação client-side (linhas 642–655): restringir `allowedArtists` apenas a `catalogNeighbors` com `similarity_score >= 0.70`. Se a IA citar artista fora desse conjunto, descartar e logar — sem permitir "fallback" para a lista curada.

### 3. `supabase/functions/music-dna-analyze/index.ts`
- No bloco de "INSTRUÇÃO ADICIONAL" (linhas 71–74), adicionar regras explícitas:
  - "Ordene `referencias_proximas` por `similarity_score` decrescente."
  - "Cite somente vizinhos com `similarity_score ≥ 0.70`. Abaixo disso, omita."
  - "Se nenhum vizinho atingir 0.70, devolva `referencias_proximas: []` e justifique no `diagnostico_resumo` em linguagem acessível (sem números) que a faixa tem identidade própria sem correspondência forte no catálogo."
- Reforçar no system prompt (bloco já existente sobre "referencias_proximas" / "Posicionamento & mercado") a mesma regra de threshold e ordenação.
- Renomear no prompt do usuário (linha 68) `"Faixas de referência típicas do gênero (medianas — ground truth)"` para deixar claro que é **contexto estatístico do gênero**, não comparação direta com a faixa do usuário, para o LLM não confundir com os vizinhos reais.

### 4. (Opcional, mesmo arquivo) Hardening do ordenamento no edge function
- Antes de serializar `nearestNeighbors` para o prompt, ordenar defensivamente por `similarity_score DESC` em JS e filtrar score `null`/`undefined`, garantindo que mesmo que o RPC mude um dia, o LLM receba já ordenado por proximidade técnica.

## Validação

1. Rodar uma análise no DNA Musical com uma faixa cujo gênero exista no catálogo:
   - Confirmar nos logs do edge function que `neighbors` vem ordenado por `similarity_score` desc.
   - Conferir que `referencias_proximas` no resultado mostra apenas faixas reais do catálogo (`band+filename`), ordenadas por similaridade decrescente.
   - Verificar que nenhum artista da curadoria estática (sem estar entre os vizinhos) aparece em `referencias_proximas`.
2. Rodar uma análise com features muito atípicas (esperando scores baixos):
   - `referencias_proximas` deve vir vazio e o `diagnostico_resumo` deve explicar isso em linguagem acessível.
3. `rg "localeCompare" src/lib/musicDnaReferences.ts` deve retornar vazio.
4. Build automático passa; teste manual no preview confirma que o card de "Referências próximas" continua renderizando corretamente (ou vazio com mensagem amigável).
