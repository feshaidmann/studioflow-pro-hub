# Estágio da produção no Music DNA

Hoje o relatório trata toda faixa como master finalizado: cobra LUFS [−15,−13], True Peak ≤ −1, DR ≥ 7 e abre uma seção de pitch pra playlist. Pra quem subiu um demo de violão e voz, isso vira um relatório injusto e cheio de alarme falso. A solução é deixar o artista declarar o estágio e o relatório se reconfigurar — alvos, seções visíveis e tom das sugestões.

## 1. Modelo: 3 estágios fixos

| Estágio | Significado pro artista | O que muda no relatório |
|---|---|---|
| **Demo** | Ideia gravada, rascunho de arranjo | Foco em identidade + contraste das seções; ignora alvos de loudness |
| **Mix** | Arranjo fechado, buscando balanço | Foco em dinâmica, espectro, balanço entre seções; LUFS folgado |
| **Master** | Pronta pra streaming | Comportamento atual completo: LUFS/TP/DR rígidos + pitch playlist |

Default = **Master** (compatibilidade com análises salvas e link público sem projeto).

## 2. Como o estágio chega no analisador

Lógica em cascata, na ordem:

1. **Se houver `projectId` vinculado** → mapeia `project.stage` (workflow) → estágio de áudio:
   - `inicio`, `rough`, `gravacao` → **Demo**
   - `mix` → **Mix**
   - `master`, `upload`, `lancado` → **Master**
2. **Se não houver projeto** → mostra seletor inline obrigatório no card de upload (3 chips Demo/Mix/Master), default visualmente em Master.
3. **Override manual**: mesmo com projeto vinculado, o artista pode trocar o chip — útil quando o projeto está em "Lançado" mas ele subiu o demo antigo pra comparar. Override é session-only, não atualiza o stage do projeto.

## 3. Regra por estágio (perfil de alvos e visibilidade)

```text
                        Demo            Mix             Master
─────────────────────────────────────────────────────────────────
MetricCard LUFS         oculto          alvo livre      [-15,-13]
MetricCard True Peak    oculto          aviso ≥ 0       alvo ≤ -1
MetricCard DR           informativo     alvo ≥ 8        alvo 7-12
MetricCard BPM          ativo           ativo           ativo
MetricCard Tom          ativo           ativo           ativo
MetricCard Duração      ativo           ativo           ativo
─────────────────────────────────────────────────────────────────
Badge "Pronta p/        oculto          "Pronta p/      ativo
streaming"                              mixagem final"
─────────────────────────────────────────────────────────────────
Identidade da faixa     ativo           ativo           ativo
Diagnóstico técnico     enxuto*         completo        completo
Seções da faixa         ativo           ativo           ativo
Sugestões de arranjo    ativo           ativo           ativo
Vizinhos no catálogo    ativo           ativo           ativo
PlaylistMatch (pitch)   oculto          oculto          ativo
BenchmarkPanel          ativo           ativo           ativo
Export PDF/MD           sem alvos       alvos de mix    alvos completos
```

*Diagnóstico enxuto no Demo = só comenta espectro/dinâmica em linhas gerais, sem cobrar loudness/TP.

## 4. Impacto na IA (edge function `music-dna-analyze`)

O prompt da IA passa a receber `stage: 'demo' | 'mix' | 'master'` e ganha instruções específicas:

- **Demo**: foco em identidade artística, contraste verso/refrão, ideias de arranjo. Não comentar loudness, True Peak ou competitividade de streaming.
- **Mix**: foco em balanço, dinâmica, equalização, contraste, decisões de arranjo. Mencionar loudness só como referência aproximada.
- **Master**: comportamento atual — cobra LUFS/TP/DR, fala de streaming, pitch.

A lista `proximos_passos` ganha um filtro pós-IA: itens que mencionam ação fora do escopo do estágio (ex.: "ajuste o limiter" no demo) são descartados antes de virar checklist.

## 5. Persistência

- `TrackInput.stage` já existe no tipo mas não é usado — passa a ser obrigatório (com default).
- `saved_analyses` ganha coluna `stage text` (nullable, default null = legado tratado como master na leitura).
- Migration única: `ALTER TABLE public.saved_analyses ADD COLUMN stage text;`

## 6. Compatibilidade (não quebrar nada)

- Análises antigas sem `stage` → renderizam como Master (comportamento atual).
- Endpoint público de análise (`/api/audio-analyze`) não muda — aceita `stage` opcional via query/body, default Master.
- Export Markdown/PDF detecta o estágio e remove a seção "Como ler" de targets que não se aplicam.
- Memory `mem://funcionalidades/dna-musical/fluxo-de-analise` atualizada com a regra dos 3 estágios.

## É útil?

Sim, alto valor com baixo risco:

- **Reduz frustração**: principal queixa de artista independente é "o analisador disse que minha música tá com problema mas eu sei que ainda não masterizei". Estágio explícito resolve.
- **Melhora qualidade das sugestões**: IA deixa de dar conselho de master pra demo e vice-versa.
- **Sinal de dado**: passa a saber qual fração das análises é demo/mix/master — alimenta a métrica de "quão maduro está o catálogo do artista" no dashboard futuro.
- **Custo de implementação baixo**: ~3 arquivos de código + 1 migration trivial.

## Arquivos afetados

```text
src/lib/musicDnaStages.ts          (NOVO) perfis de alvo + mapping workflow→stage
src/components/music-dna/StageSelector.tsx  (NOVO) chips Demo/Mix/Master
src/components/music-dna/MusicDNAAnalyzer.tsx  ler stage, condicionar seções/MetricCards
src/hooks/useMusicDNA.ts           propagar stage no fluxo
supabase/functions/music-dna-analyze/index.ts  injetar stage no prompt + filtrar passos
supabase/migrations/...            ALTER TABLE saved_analyses ADD stage
mem://funcionalidades/dna-musical/fluxo-de-analise  documentar regra
```

Sem mudanças em RLS, sem nova tabela, sem schema breaking.
