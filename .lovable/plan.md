
# Detecção automática de gênero no DNA Musical

Adiciona um classificador que compara as features acústicas da faixa do usuário com perfis médios de gêneros e, se o resultado divergir do gênero declarado, exibe um aviso amigável ("Você declarou Pop, mas as características se aproximam mais de Synth-Pop — 94%"). Não muda o gênero declarado nem o benchmark usado.

## Como funciona (visão do usuário)

1. Usuário sobe a faixa e declara o gênero (fluxo atual, sem mudanças).
2. Após a extração local de features, o classificador roda no cliente em ~ms e calcula:
   - Top 1 gênero detectado + % de similaridade
   - Top 3 gêneros mais próximos (guardado para uso futuro / debug)
3. Se o detectado ≠ declarado **e** confiança ≥ 0,75:
   - Card sutil acima do diagnóstico: "Características técnicas mais próximas de **{detectado}** ({xx}%). Quer revisar o gênero antes de pedir o diagnóstico?"
   - Botões: "Manter {declarado}" / "Trocar para {detectado}".
4. Se confiança < 0,60 → não mostra nada (evita ruído).
5. O resultado da classificação também é enviado ao prompt do Gemini como contexto extra ("classificador interno aponta proximidade técnica com X").

## Fonte dos perfis (híbrido)

Para cada gênero, o perfil de referência é montado em runtime no edge `music-dna-analyze`:

```text
Para cada gênero G:
  count = SELECT COUNT(*) FROM music_reference_tracks WHERE genre ILIKE G
  se count >= 20  → perfil = média do catálogo (já temos AVG via recalcular_benchmark_genero / music_dna_benchmarks)
  senão           → perfil = hardcoded da tabela fornecida (16 gêneros)
```

Isso garante:
- Gêneros BR (MPB, Sertanejo, Funk, Forró, Pagode, Gospel etc.) usam o catálogo real quando há massa crítica.
- Gêneros internacionais sem amostras (Grunge, Ambient, Bossa Nova etc.) usam os perfis hardcoded.
- Perfis evoluem automaticamente conforme `music_reference_tracks` cresce.

## Detalhes técnicos

### 1. Novo arquivo `src/lib/genreClassifier.ts`
- Exporta `HARDCODED_GENRE_PROFILES` (16 gêneros da tabela do usuário, valores normalizados 0–1).
- `normalizeFeatures(features)` — converte features brutas (tempo_bpm, loudness_rms_db etc.) para 0–1 usando os ranges fornecidos (tempo 60–200, loudness -60–0).
- `cosineSimilarity(a, b)`.
- `classifyGenre(features, profiles)` → `{ top: {genre, score}, runnerUp: {...}, top3: [...] }`.
- `mergeProfiles(hardcoded, fromBenchmarks)` — para cada gênero presente nos benchmarks com `total_faixas >= 20`, sobrescreve o perfil hardcoded.

### 2. Nova RPC `get_genre_profiles_for_classifier()`
Retorna um array `{genero, total_faixas, avg_tempo_bpm, avg_danceability, avg_energy, avg_acousticness, avg_instrumentalness, avg_valence, avg_speechiness, avg_loudness_db}` direto de `music_dna_benchmarks` filtrando `total_faixas >= 20`. SECURITY DEFINER, leitura pública (a tabela já é pública).

### 3. Hook `useGenreProfiles` (`src/hooks/useGenreProfiles.ts`)
- Fetcha a RPC uma vez por sessão (cache em React Query, staleTime 1h).
- Faz o merge com os hardcoded e devolve o objeto pronto para o classifier.

### 4. Integração em `MusicDNAAnalyzer.tsx`
- Após `extractFeatures()` e antes do botão "Gerar diagnóstico":
  - Roda `classifyGenre(features, profiles)`.
  - Guarda em `useState<{detected, score, top3}>`.
- Se `detected !== declared && score >= 0.75 && Math.abs(score - secondScore) > 0.03`:
  - Renderiza `<GenreMismatchHint />` (novo componente) com tom acolhedor PT-BR e i18n EN.
  - Botão "Trocar para X" só atualiza o select de gênero local.
- O payload enviado ao edge function ganha `payload.classifier_hint = { detected, score, top3 }` para o prompt.

### 5. Edge function `music-dna-analyze`
- No `buildStructuredPrompt`, se `payload.classifier_hint` existir, injeta um bloco curto:
  > "Classificador interno (cosine sim sobre features): top1 = {detected} ({xx}%); declarado = {declared}. Use isso apenas para enriquecer o diagnóstico — NUNCA contradiga o gênero declarado pelo usuário."

### 6. Telemetria leve
- Insert opcional em `analytics_events` com `event_name = 'dna_genre_mismatch'` e `properties = { declared, detected, score }` para a gente medir frequência de divergência (não bloqueante; falha silenciosa).

### 7. i18n
- Adicionar chaves em `LanguageContext`:
  - `dna.classifier.mismatchTitle`
  - `dna.classifier.mismatchBody` (com placeholders)
  - `dna.classifier.keep`, `dna.classifier.switch`

## Fora de escopo (consciente)

- Não altera a chamada `find_nearest_reference_tracks` nem o k-NN existente.
- Não auto-preenche gênero quando vazio (usuário escolheu "só sugerir divergência").
- Não mostra top 3 como card permanente — só o aviso de divergência.
- Não muda perfis hardcoded da tabela fornecida (são usados como fallback).

## Arquivos afetados

- **Novo**: `src/lib/genreClassifier.ts`
- **Novo**: `src/hooks/useGenreProfiles.ts`
- **Novo**: `src/components/music-dna/GenreMismatchHint.tsx`
- **Migration**: cria RPC `get_genre_profiles_for_classifier()`
- **Editado**: `src/components/music-dna/MusicDNAAnalyzer.tsx` (state + hint + payload)
- **Editado**: `supabase/functions/music-dna-analyze/index.ts` (injeta `classifier_hint` no prompt)
- **Editado**: `src/contexts/LanguageContext.tsx` (4 chaves PT/EN)
- **Editado**: `.lovable/plan.md` (registro da feature)

## Riscos e mitigações

- **Perfis hardcoded internacionais não cobrem MPB/Sertanejo/etc.**: mitigado pelo merge com benchmarks BR.
- **Falsos positivos quando confiança baixa**: limiar duplo (score ≥ 0,75 e gap ≥ 0,03 entre top1/top2).
- **Aviso pode irritar**: tom de sugestão, dispensável, sem bloquear o fluxo.
