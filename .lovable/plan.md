## Objetivo

Hoje o Track Intelligence tenta detectar se a faixa tem análise técnica (DNA Musical) **comparando texto do nome da faixa** — frágil e falha quando o usuário renomeia a música. Agora que cada análise de DNA pode ser vinculada a um `project_id`, vamos usar esse vínculo como fonte primária e injetar os dados técnicos reais no diagnóstico.

## O que muda para o usuário

1. Ao gerar uma análise no Track Intelligence vinculada a um projeto, a IA passa a enxergar a **última análise de DNA daquele projeto** (LUFS, dynamic range, BPM, key, energy, danceability, gênero detectado).
2. Pré-preenchimento do formulário fica mais confiável: "Master validado?" assume `sim` quando existe DNA vinculada ao projeto E `master_done = true`, sem depender de nome.
3. Novo aviso no formulário: quando o projeto selecionado tem DNA vinculada, mostrar "Análise técnica encontrada (LUFS X · BPM Y) — será usada no diagnóstico".
4. Diagnóstico passa a citar dados técnicos reais (ex.: "LUFS -8 dB acima do alvo Spotify -14") em vez de só dizer "execute o Master Analyzer".
5. Se o projeto não tem DNA vinculada, fallback continua sendo busca por nome (compatibilidade com análises antigas).

## Mudanças técnicas

### Edge function `generate-track-intelligence`
- Em `collectProjectContext`, quando houver `projectId`:
  - Buscar `music_dna_analyses` filtrando por `project_id = projectId` (ordenado por `created_at desc`, limit 1) **antes** do fallback por nome.
  - Se encontrar, popular contexto com: `lufs_integrated`, `dynamic_range_db`, `tempo_bpm`, `key_name`, `mode_name`, `energy`, `danceability`, `valence`, `genre` (detectado) e `diagnosis.diagnostico_resumo` (se existir).
- Estender `buildUserPrompt` com bloco "ANÁLISE TÉCNICA REAL (DNA Musical vinculada ao projeto)" quando esses campos existirem, e nova regra: "Use esses números literais nas justificativas de `dimensions.technical` e em recomendações específicas (ex.: alvo LUFS por plataforma)."
- Detecção de divergência expandida: se `genre` declarado ≠ `genre` da DNA, gerar gap `warning` "Gênero declarado difere da análise técnica".

### Frontend `TrackIntelligenceNew.tsx`
- No `useEffect` de pré-preenchimento, substituir busca por nome por:
  1. `select` em `music_dna_analyses` por `project_id = projectId` (limit 1, mais recente).
  2. Se vazio, manter fallback atual por nome (retrocompatível).
- Quando houver DNA vinculada, mostrar chip informativo abaixo do select de projeto: `LUFS X · BPM Y · {key} {mode}` com tooltip "Esses dados serão enviados à IA".
- Ajustar lógica de `masterStatus`: `sim` se `p.masterDone && hasDnaLinked`, `em_andamento` se `p.masterDone` sem DNA, `nao` caso contrário.

### Sem mudanças de banco
A coluna `project_id` em `music_dna_analyses` já existe (migração anterior). Apenas leitura.

## Arquivos afetados
- `supabase/functions/generate-track-intelligence/index.ts` (enriquecer contexto + prompt)
- `src/pages/TrackIntelligenceNew.tsx` (pré-preenchimento + chip informativo)

## Fora de escopo
- Retroativar análises antigas com `project_id` (usuário pode re-vincular manualmente reanalisando).
- Mostrar dados técnicos no `TrackIntelligenceResult` (já vem no diagnóstico textual da IA).
