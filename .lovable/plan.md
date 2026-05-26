## Objetivo

Tornar a detecção de estilo e as sugestões da análise de áudio coerentes com a obra real, substituindo o matching baseado em features "estilo Spotify" (energy, danceability, valence, etc.) — que são heurísticas frágeis no browser — por um fingerprint acústico real (MFCC + chroma CENS) comparado via cosine similarity, alinhado com o que já existe nas faixas de referência (`music_reference_tracks.mfcc` / `chroma_cens`).

## Causa raiz

1. `audioAnalysis.ts` gera MFCC a partir de **um único espectro médio** → vetor incompatível com o MFCC per-frame + CMS do Python/Librosa que populou as referências. Cosine similarity fica em 0,6–0,8 mesmo para a mesma faixa.
2. `useMusicDNA.ts` não envia `mfcc` nem `chroma_cens` no `track_features` → edge function não tem como passar o fingerprint para o SQL.
3. `find_nearest_reference_tracks` pondera fortemente energy/danceability/valence/acousticness — valores que no browser são heurísticas e não batem com os do CSV de referência, gerando vizinhos errados → prompt do LLM recebe ground-truth ruim → diagnóstico e estilo fora do esperado.
4. `music-dna-analyze/index.ts` não repassa MFCC/chroma para o RPC.

## Mudanças

### 1. `src/lib/audioAnalysis.ts`
- Adicionar `computeMfccChromaMultiframe(mono, sampleRate)` e helper `computeMfccChromaFromOffset(...)` conforme patch anexo:
  - até 60 frames espaçados uniformemente, pulando 2s no início/fim
  - Hann + DFT (fftSize=2048) + filterbank mel 40 bandas + DCT-II → MFCC[13]
  - **Cepstral Mean Subtraction (CMS)** por coeficiente
  - Chroma 12 classes acumulado, L2-normalizado
- Em `analyzeAudioFull()`, trocar `computeMfccChroma(spectral.magnitudes, ...)` por `computeMfccChromaMultiframe(mono, sampleRate)`.
- Manter `computeMfccChroma` legada (não chamada) para evitar regressões.

### 2. `src/hooks/useMusicDNA.ts`
- No bloco `track_features` dentro de `callMusicDNAAnalyze()`, incluir:
  - `mfcc: realAnalysis.mfcc`
  - `chroma_cens: realAnalysis.chroma_cens`
  - `zero_crossing_rate: realAnalysis.zcr` (se disponível)
  - Manter os demais campos (tempo_bpm, lufs_integrated, dynamic_range_db, espectrais, e os Spotify-style com peso baixo no SQL).

### 3. `supabase/functions/music-dna-analyze/index.ts`
- Adicionar coerção `toFloat8Array(v, len)` validando arrays MFCC (13) e chroma (12).
- Chamar `find_nearest_reference_tracks` com a nova assinatura: `p_mfcc`, `p_chroma_cens`, mais os escalares confiáveis (tempo_bpm, lufs, dynamic_range_db, centroid, flatness, rolloff, bandwidth, zcr) e os Spotify-style (peso baixo no SQL), além de key_name/mode/genre.
- Atualizar a frase do prompt sobre similarity_score para refletir o novo critério (fingerprint timbral/harmônico + escalares).
- Restante (auth, save_features, AI gateway, logInvocation) permanece inalterado.

### 4. Migração SQL
- Criar helper `public.cosine_similarity_f8(a float8[], b float8[])` (IMMUTABLE, PARALLEL SAFE, retorna [-1,1] ou NULL/0 em casos degenerados).
- **DROP** da assinatura atual de `find_nearest_reference_tracks` (a versão hoje tem outra ordem e parâmetros — ver `<db-functions>`).
- **CREATE** nova `find_nearest_reference_tracks(...)` conforme migration anexa, com pesos:
  - MFCC cosine 2,5 / Chroma cosine 1,5
  - tempo_bpm 1,5 / LUFS 1,5 / centroid 1,0 / DR 0,8 / flatness 0,5 / ZCR 0,3 / rolloff 0,3 / bandwidth 0,2
  - Spotify-style (energy/dance/val/acous/instr/speech/live) entre 0,1 e 0,2
  - Bônus de key/mode (-0,15 a -0,30) e gênero (-0,50)
  - Score = `1 / (1 + total_distance)`
- Garantir grant de execução para `authenticated` (a função atual já é `SECURITY DEFINER`; replicar permissões existentes).

> Observação: a coluna `music_reference_tracks.mfcc` / `chroma_cens` já existe (vide `upsert_reference_tracks`), portanto não é preciso ALTER TABLE.

## Considerações

- **Compatibilidade**: o front continua enviando os campos antigos; o novo SQL apenas reduz seus pesos. Faixas de referência sem MFCC simplesmente ficam com peso 0 no termo cosine — não quebram o ranking.
- **Performance**: o multi-frame DFT manual roda ~200–400 ms por análise (uma vez por upload) — aceitável.
- **Cache de análises antigas**: análises já salvas em `music_dna_analyses` permanecem inalteradas; o ganho aparece nas próximas análises. Não é necessário invalidar cache.
- **Pós-migração**: rodar `supabase--linter` e revisar warnings; o lint não deve apontar nada novo já que `cosine_similarity_f8` é IMMUTABLE com `SET search_path` herdado (ajustarei se o linter pedir).
- **Sem mudanças de UI** — somente pipeline de cálculo, payload e SQL.

## Sequência de execução (após aprovação)

1. `supabase--migration` com o SQL da nova RPC + helper.
2. Editar `src/lib/audioAnalysis.ts` (novas funções + troca de chamada).
3. Editar `src/hooks/useMusicDNA.ts` (incluir mfcc/chroma_cens/zcr).
4. Editar `supabase/functions/music-dna-analyze/index.ts` (validação + nova chamada RPC + frase do prompt).
5. Deploy da edge function e teste rápido via `supabase--curl_edge_functions` para confirmar que `neighbors` retornam similarity coerente.
