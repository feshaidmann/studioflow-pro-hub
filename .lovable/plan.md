
## Plano: consolidar o Music DNA com atributos reais estilo Spotify

Vou evoluir o módulo `/music-dna` sem recriar a tela do zero, aproveitando o que já existe: análise local via Web Audio API, lookup externo, benchmarks, salvamento de análises e diagnóstico por IA. O objetivo é remover os últimos pontos “simulados”, padronizar os 13 atributos estilo Spotify e garantir que o diagnóstico, o salvamento e os benchmarks usem a mesma fonte de verdade.

## Estado atual identificado

Parte do pedido já está implementada:

- `music_dna_analyses` já possui colunas para atributos estilo Spotify, LUFS, dinâmica e fontes externas.
- `music_dna_benchmarks` já existe com RLS pública para leitura e admin para gestão.
- `src/types/musicDna.ts` já tem `SpotifyFeatures`, `MusicDnaBenchmark`, `KEY_NAMES`, `LUFS_TARGETS` e conversão de diagnóstico para colunas.
- `src/lib/musicDnaLookup.ts` já consulta MusicBrainz/AcousticBrainz e Deezer em cascata.
- `src/lib/audioAnalysis.ts` já calcula atributos reais no browser via Web Audio API.
- `src/hooks/useMusicDNA.ts` já combina análise local, lookup externo e IA.
- `src/hooks/useSavedAnalyses.ts` já salva os atributos detalhados na tabela.
- A UI já exibe benchmark, compatibilidade de LUFS, histórico e integração com Criativo.

O que ainda precisa ser corrigido/ratificado:

- a Edge Function `music-dna-analyze` ainda só aceita `{ prompt }`, não registra custo em `ai_invocations` e não suporta ações estruturadas como `generate_diagnosis`/`save_features`;
- o lookup externo existe em `src/lib/musicDnaLookup.ts`, mas não como hook dedicado com estados/toasts;
- o campo sugerido `arquivo` não existe na tabela atual; a tabela usa `track_name`, `input_metadata` e `diagnosis`, então não vou inserir coluna nova desnecessária;
- a migration enviada no prompt contém itens que já existem, mas ainda falta validar/ajustar a RPC de benchmark se ela não estiver no banco;
- o diagnóstico por IA precisa receber os 13 atributos em formato padronizado e logar tokens/custo.

## Implementação proposta

### 1. Migration mínima e segura

Criar uma migration apenas para o que faltar, sem duplicar estrutura existente.

A migration vai:

- manter as colunas já existentes em `music_dna_analyses`;
- garantir que `music_dna_benchmarks` tenha `genero UNIQUE`, caso ainda não esteja aplicado;
- criar/atualizar `public.recalcular_benchmark_genero(p_genero text)`;
- ajustar a função para usar a coluna real `genre`, não `genero`, porque a tabela atual usa `genre`;
- calcular médias dos atributos:
  - `danceability`
  - `energy`
  - `loudness_db`
  - `speechiness`
  - `acousticness`
  - `instrumentalness`
  - `liveness`
  - `valence`
  - `tempo_bpm`
  - `lufs_integrated`
- montar `top_keys` com `key_name + mode_name`.

Não vou criar colunas inexistentes como `arquivo`, pois isso conflita com o schema atual e não é necessário para a jornada já existente.

### 2. Padronizar tipos em `src/types/musicDna.ts`

Ajustar os tipos sem quebrar imports atuais:

- manter `SpotifyFeatures`, `MusicDnaBenchmark`, `KEY_NAMES`, `LUFS_TARGETS`;
- adicionar um tipo opcional `MusicDnaSource = "acousticbrainz" | "deezer" | "web_audio" | "local"`;
- adicionar um tipo de linha salva alinhado ao schema real:
  - `track_name`
  - `genre`
  - `input_metadata`
  - `diagnosis`
  - atributos Spotify e metadados externos;
- manter `musicDnaColumnsFromDiagnosis()` como fonte de mapeamento para salvar análises;
- garantir clamp/normalização dos atributos entre `0` e `1` quando aplicável.

### 3. Criar hook dedicado de lookup

Criar `src/hooks/useMusicDnaLookup.ts` como fachada reutilizável sobre `src/lib/musicDnaLookup.ts`.

Ele vai oferecer:

- `lookup({ artista, titulo, trackName, file })`;
- `isLoading`;
- retorno com:
  - `features`
  - `fonte`
  - `mbid`
  - `deezerId`
  - `previewUrl`, se disponível futuramente.

Para evitar duplicação, a lógica principal continuará em `src/lib/musicDnaLookup.ts`, mas será expandida para:

- aceitar artista/título explicitamente;
- manter fallback por `trackName`;
- retornar `previewUrl` do Deezer quando existir;
- usar User-Agent mais completo no MusicBrainz.

### 4. Reforçar análise local real via Web Audio API

Manter `src/lib/audioAnalysis.ts` como fonte principal da análise local.

Ajustar onde necessário para:

- garantir que os 13 atributos estilo Spotify sejam sempre derivados:
  - `danceability`
  - `energy`
  - `key`
  - `loudness`
  - `mode`
  - `speechiness`
  - `acousticness`
  - `instrumentalness`
  - `liveness`
  - `valence`
  - `tempo`
  - `duration_ms`
  - `time_signature`
- usar AcousticBrainz/Deezer apenas como enriquecimento quando disponível;
- manter Web Audio como fallback obrigatório quando a busca externa falhar.

### 5. Atualizar `useMusicDNA.ts`

Ajustar o fluxo principal para deixar explícita a cascata:

```text
Arquivo/track name
  → AcousticBrainz por MBID, se artista/título forem identificáveis
  → Deezer, se AcousticBrainz falhar
  → Web Audio API local sempre disponível como base real
  → IA gera diagnóstico usando atributos consolidados
```

Mudanças previstas:

- incluir no prompt um bloco “ATRIBUTOS ESTILO SPOTIFY” com os 13 campos consolidados;
- dar prioridade ao Web Audio para métricas realmente extraídas do arquivo;
- usar externo para complementar BPM/duração/chave quando fizer sentido;
- manter `externalLookup` no `DiagnosisResult`;
- manter o tom técnico definido na memória do projeto;
- preservar compatibilidade com a UI atual.

### 6. Evoluir a Edge Function `music-dna-analyze`

Atualizar `supabase/functions/music-dna-analyze/index.ts` para suportar dois formatos:

#### Formato atual, para compatibilidade

```ts
{ prompt: string }
```

Continua funcionando.

#### Novo formato estruturado

```ts
{
  action: "generate_diagnosis",
  payload: {
    prompt,
    features,
    genero,
    track_name
  }
}
```

Também vou preparar, mas só usar se necessário:

```ts
{
  action: "save_features",
  payload: ...
}
```

No projeto atual o salvamento já funciona no frontend via RLS, então não vou trocar o fluxo principal para service role sem necessidade.

A função também passará a:

- validar JWT com `getClaims`;
- usar client admin apenas para logs e leitura de benchmark;
- buscar benchmark do gênero quando disponível;
- chamar Lovable AI Gateway;
- extrair `prompt_tokens` e `completion_tokens`;
- inserir registro em `ai_invocations` com:
  - `function_name: "music-dna-analyze"`
  - `model: "google/gemini-3-flash-preview"`
  - `user_id`
  - `tokens_input`
  - `tokens_output`
  - `cost_usd`
  - `status: "success"` ou `"error"`;
- retornar erros 402/429 com mensagens amigáveis;
- manter CORS completo.

### 7. Atualizar salvamento e benchmarks

Ajustar `src/hooks/useSavedAnalyses.ts` para:

- salvar os atributos já consolidados via `musicDnaColumnsFromDiagnosis`;
- após salvar, chamar a RPC `recalcular_benchmark_genero` para o gênero salvo, se disponível;
- invalidar:
  - `music-dna-analyses`
  - `music-dna-benchmarks`
- manter fallback caso a RPC falhe, sem bloquear o usuário.

### 8. UI do Music DNA

A interface atual será preservada, com pequenos reforços:

- mostrar claramente a fonte dos atributos:
  - AcousticBrainz
  - Deezer
  - Web Audio
- no painel de benchmark, manter “Banco público” vs “Preset local”;
- na tela de carregamento, logs mais claros:
  - “Buscando referência externa”
  - “Analisando arquivo local”
  - “Consolidando atributos estilo Spotify”
  - “Gerando diagnóstico IA”
- manter as seções técnicas colapsáveis no mobile.

### 9. Correções de compatibilidade

Durante a implementação vou evitar estes problemas:

- não editar `src/integrations/supabase/client.ts`;
- não editar `src/integrations/supabase/types.ts`;
- não criar tabela de roles nem alterar auth;
- não usar coluna `arquivo`, porque ela não existe;
- não substituir a UI inteira por uma versão paralela;
- não remover cache de sessão nem integração com Criativo;
- não quebrar o histórico de análises salvas.

## Arquivos previstos

- `supabase/migrations/...`  
  RPC/ajustes mínimos para benchmark.

- `supabase/functions/music-dna-analyze/index.ts`  
  diagnóstico estruturado, logs de custo e compatibilidade com `{ prompt }`.

- `src/types/musicDna.ts`  
  tipos complementares e mapeamento consolidado.

- `src/lib/musicDnaLookup.ts`  
  retorno mais completo e suporte a artista/título.

- `src/hooks/useMusicDnaLookup.ts`  
  novo hook de lookup com estado de carregamento.

- `src/hooks/useMusicDNA.ts`  
  cascata real, prompt com 13 atributos e integração com novo formato da função.

- `src/hooks/useSavedAnalyses.ts`  
  recálculo de benchmark pós-salvamento.

- `src/hooks/useMusicDnaBenchmarks.ts`  
  pequenos ajustes se necessário para compatibilidade de tipos.

- `src/components/music-dna/MusicDNAAnalyzer.tsx`  
  microajustes visuais/textuais para fonte da análise e logs.

## Resultado esperado

Ao final:

- o Music DNA usará análise real do arquivo como base;
- AcousticBrainz e Deezer funcionarão como enriquecimento em cascata;
- os 13 atributos estilo Spotify estarão padronizados no diagnóstico e no banco;
- análises salvas alimentarão benchmarks por gênero;
- a IA terá contexto técnico mais preciso;
- cada chamada de IA será registrada em `ai_invocations`;
- a jornada atual, histórico, cache e integração com Criativo continuarão funcionando.
