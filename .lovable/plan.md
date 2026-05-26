## Objetivo

A engine de extra\u00e7\u00e3o ac\u00fastica (MFCC, chroma, LUFS, vizinhos por cosine) j\u00e1 est\u00e1 calibrada. O que est\u00e1 fora de contexto para o artista independente \u00e9 a **camada de interpreta\u00e7\u00e3o**: tom t\u00e9cnico demais, sugest\u00f5es de est\u00fadio profissional e refer\u00eancias mainstream. A mudan\u00e7a \u00e9 100% de prompt / persona / p\u00f3s-processamento \u2014 sem mexer no pipeline ac\u00fastico nem no schema do banco.

## Mudan\u00e7as

### 1. Auto-detec\u00e7\u00e3o do n\u00edvel de produ\u00e7\u00e3o (`src/hooks/useMusicDNA.ts`)

Antes do `buildPrompt`, derivar uma heur\u00edstica `production_tier`:
- **bedroom**: `lufs_integrated < -16` E (`dynamic_range_lu > 11` OU `liveness > 0.30` OU `true_peak_dbtp < -3`) \u2014 grava\u00e7\u00e3o caseira, sem master agressivo.
- **mid**: faixa entre `-16` e `-10` LUFS, true peak razo\u00e1vel, sem sinais de hyper-limit.
- **pro-leaning**: `lufs >= -10` E `dynamic_range_lu < 7` \u2014 master comercial.

Injetar no prompt: `NIVEL_DE_PRODUCAO_DETECTADO: bedroom|mid|pro-leaning` e instruir o modelo a adaptar sugest\u00f5es proporcionalmente (bedroom \u2192 nunca recomendar est\u00fadio, mastering pago, monitores caros; sempre oferecer alternativa free/freemium).

### 2. Reescrita da persona e do "FORMATO DE RESPOSTA" (`useMusicDNA.ts`, fun\u00e7\u00e3o `buildPrompt`)

Substituir a se\u00e7\u00e3o de instru\u00e7\u00f5es por campo (linhas 418\u2013431) por um bloco "Persona: parceiro de carreira do artista independente brasileiro" com regras duras:

- Toda recomenda\u00e7\u00e3o em `diagnostico_tecnico.*`, `sugestoes_arranjo` e `proximos_passos` precisa terminar com **"como fazer"** acion\u00e1vel em uma frase, citando **um plugin gratuito** (TDR Nova, Youlean Loudness Meter 2 free, ReaPlugs, Voxengo SPAN, Vital, LoudMax, MeldaProduction free bundle) ou **um recurso nativo da DAW** (Reaper, Cakewalk, GarageBand, Audacity, BandLab).
- Proibido sugerir: "mande para mastering profissional", "use Pro Tools", "alugue est\u00fadio", "contrate engenheiro" \u2014 a menos que `production_tier = pro-leaning` E o problema seja efetivamente fora do alcance DIY.
- Proibido jarg\u00e3o em `proximos_passos` e `gargalos_criativos`: sem siglas (LUFS, dBTP, kHz) no `acao` \u2014 traduzir para "deixar o som mais alto sem distor\u00e7\u00e3o", "abrir espa\u00e7o entre o grave do bumbo e do baixo", etc. Manter siglas s\u00f3 em `diagnostico_tecnico.*` (que \u00e9 o campo expl\u00edcito de leitura t\u00e9cnica).

### 3. Refor\u00e7ar 4 pilares dos `proximos_passos`

A LLM deve garantir cobertura de pelo menos 3 dos 4 pilares quando relevante, etiquetando o `impacto` com tag entre colchetes:
- `[Mix/Master DIY]` \u2014 ajuste sonoro execut\u00e1vel em casa
- `[Distribui\u00e7\u00e3o]` \u2014 timing/pitch/Release Radar/canvas, considerando que o artista usa distribuidor self-service (DistroKid, Tratore, Onerpm, Amuse)
- `[Identidade e posicionamento]` \u2014 como esse som conversa com nichos espec\u00edficos de playlist e p\u00fablico inicial
- `[Ao vivo]` \u2014 como traduzir essa faixa para palco com setup enxuto (trio, voz+viol\u00e3o, base + ableton)

`prioridade` reordenada para favorecer o que d\u00e1 retorno mais r\u00e1pido ao indie (n\u00e3o o que um label faria).

### 4. Refer\u00eancias do cat\u00e1logo \u2014 etiqueta de patamar

Manter o ranking atual por similaridade t\u00e9cnica (vem do RPC `find_nearest_reference_tracks`). No `buildStructuredPrompt` (edge function `music-dna-analyze/index.ts`), enriquecer cada vizinho injetado no prompt com `tier_hint` derivado de regras simples sobre `lufs_integrated` e nome da banda quando o cat\u00e1logo tiver indica\u00e7\u00e3o de gravadora (`mainstream` se LUFS \u2265 \u201210 e dynamic_range < 7, sen\u00e3o `indie/medio`). Pedir ao modelo, em `referencias_proximas[].motivo`, mencionar se \u00e9 par "no mesmo patamar" ou "refer\u00eancia aspiracional".

### 5. `diagnostico_resumo` \u2014 fechar com encoraja a\u00e7\u00e3o

\u00daltima frase obrigat\u00f3ria: um \u00fanico passo de maior impacto que o artista consegue executar sozinho nos pr\u00f3ximos 7 dias, sem comprar nada. Manter as variantes A/B existentes; alterar apenas o fechamento.

### 6. Targets de loudness por gen\u00e9ro \u2014 nota de contexto indie

No bloco `GENRE_STREAMING_CONTEXT` (linhas 315+), adicionar prefixo padr\u00e3o para todos os g\u00eaneros: *"Para o artista independente, atingir o target do g\u00eanero importa menos que entregar o som limpo e coerente. O Spotify normaliza tudo \u2014 prefira clareza a competir loudness."*

### 7. Sem mudan\u00e7as em

- Pipeline de extra\u00e7\u00e3o (`src/lib/audioAnalysis.ts`)
- Banco / RPC `find_nearest_reference_tracks` / migrations
- Componentes de UI da p\u00e1gina `/music-dna`
- Persist\u00eancia em `music_dna_analyses`

## Arquivos a editar

- `src/hooks/useMusicDNA.ts` \u2014 deriva\u00e7\u00e3o do `production_tier`, reescrita das instru\u00e7\u00f5es por campo, novos pilares dos pr\u00f3ximos passos, nota indie no contexto de g\u00eanero, fechamento do `diagnostico_resumo`.
- `supabase/functions/music-dna-analyze/index.ts` \u2014 enriquecer vizinhos com `tier_hint` no bloco injetado no prompt.

## Valida\u00e7\u00e3o

1. Disparar uma an\u00e1lise real via UI em `/music-dna` com uma faixa de bedroom (LUFS baixo, DR alto).
2. Conferir no console que o payload tem `production_tier: "bedroom"`.
3. Verificar que `proximos_passos[*].acao` n\u00e3o cont\u00e9m "LUFS"/"dBTP"/"mastering profissional" e cobre 3+ pilares com tag entre colchetes.
4. `referencias_proximas[*].motivo` deve mencionar patamar (indie/mainstream).
