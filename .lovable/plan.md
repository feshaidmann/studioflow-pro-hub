## Objetivo

Reescrever as instruções do campo `diagnostico_resumo` (resumo executivo do DNA Musical) para:
1. Remover jargão técnico e números (LUFS, dBTP, LU, dBFS, Hz).
2. Focar em **sonoridade** (textura, peso, brilho, espaço) e **instrumentalidade** (instrumentos protagonistas, presença vocal, arranjo).
3. Adicionar uma leitura clara de **como a faixa se enquadra nos critérios sonoros valorizados pelo Spotify** (normalização de loudness, energia/dança/valência, contraste dinâmico, identidade reconhecível, qualidade de mix percebida pela curadoria) e **o que isso significa para chance de destaque em playlists** (editoriais, Radar de Lançamentos, Release Radar, algorítmicas).

Os campos técnicos (`diagnostico_tecnico.*`, `pontos_fortes`, `gargalos_criativos`, etc.) continuam com linguagem de engenheiro — a mudança é exclusiva do resumo executivo.

## Arquivos a alterar

### 1. `src/hooks/useMusicDNA.ts`

- **Linha 363** (regra "EXCEÇÃO — campo diagnostico_resumo"): trocar o exemplo atual (que cita "dinâmica ampla", "LU") por orientação em linguagem de ouvinte/crítico, sem números. Proibir explicitamente menção a LUFS, dBTP, LU, dBFS, Hz, dB e quaisquer valores numéricos no resumo.
- **Linha 430** (instruções por campo do `diagnostico_resumo`): reescrever para 4–6 frases cobrindo:
  - Identidade sonora descrita por sensação (ex.: "peso grave encorpado", "vocal frontal e íntimo", "guitarras com brilho cristalino", "arranjo enxuto vs denso").
  - Instrumentos protagonistas e papel deles na narrativa da faixa.
  - Enquadramento Spotify: como a faixa se posiciona frente ao perfil sonoro que costuma performar bem em playlists do gênero (energia adequada ao contexto de escuta, contraste entre seções, clareza vocal, "tradução" em diferentes sistemas de reprodução), **sem citar valores**.
  - Chance de destaque em playlists: que tipo de playlist combina (editoriais de gênero, mood, algorítmicas), e o ajuste sonoro/instrumental — não técnico — que aumentaria as chances (ex.: "ganharia tração em playlists de foco se o refrão abrisse mais", "soa pronta para playlists de MPB contemporânea pelo equilíbrio entre voz e violão").
  - Tom de crítico acolhedor, sem promessas ("vai bombar"), sem alarmismo.

### 2. `supabase/functions/music-dna-analyze/index.ts`

- **Linhas 283–284** (system prompt, parágrafo sobre `diagnostico_resumo`): substituir a exigência de "pelo menos uma referência técnica concreta" por "linguagem acessível, focada em sonoridade, instrumentação protagonista e enquadramento nos critérios sonoros do Spotify para playlists". Reforçar a proibição de números e siglas técnicas neste campo específico.
- **Linha 272** (bloco "BLOCOS DE ANÁLISE OBRIGATÓRIOS"): manter os blocos, mas anotar que o bloco de "Posicionamento & mercado" no resumo deve traduzir o diagnóstico técnico em leitura de playlist Spotify (perfil sonoro, contraste, identidade), sem números.

## O que NÃO muda

- Estrutura do JSON, demais campos, schema de validação, UI, tipos.
- Linguagem técnica nos campos `diagnostico_tecnico.*`, `pontos_fortes`, `gargalos_criativos`, `sugestoes_arranjo`, `proximos_passos` — esses seguem com LUFS, dBTP, plugins e valores.
- Lógica de classificação, vizinhos, benchmarks e edge function fora dos trechos de prompt indicados.

## Validação

Após o build automático, abrir o DNA Musical, rodar uma análise (ou reaproveitar uma salva via "Reanalisar") e conferir que o `diagnostico_resumo` exibido no card de resumo:
- Não contém "LUFS", "dBTP", "LU", "dBFS", "Hz", "dB", nem números medidos.
- Cita instrumentos protagonistas e sensação sonora.
- Faz uma leitura explícita de enquadramento Spotify + tipo de playlist onde a faixa tem mais chance.
