# Ajuste de precisão do comparativo do DNA Musical

Você está certo: o problema não é "reconhecer o nome da música". O problema é que o comparativo técnico está usando métricas de origens diferentes e uma função de distância que hoje gera ranking ruim.

## Diagnóstico confirmado

No teste com `03. Linus And Lucy`, a faixa existe no catálogo, mas ficou fora do topo porque:

- A análise do usuário veio do navegador/Web Audio com BPM `76,9`, tom `C minor`, energy `0,80`.
- A mesma faixa no catálogo está com BPM `123,05`, tom `G/G# major`, energy perto de `0,40`.
- A busca atual compara esses números diretamente e ainda dá muito peso a `energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `liveness`, que são heurísticas pouco estáveis entre extratores.
- Além disso, quando uma métrica de entrada está ausente, a função atual usa `COALESCE(..., 0)`, o que reduz artificialmente a distância de faixas com valores faltantes e pode favorecer resultados errados.

Ou seja: o ranking falha porque está tratando features instáveis/heterogêneas como ground truth comparável.

## Objetivo da correção

Fazer o catálogo real retornar referências tecnicamente coerentes, com ranking mais confiável, sem depender de match por nome de arquivo.

## Plano de implementação

### 1. Corrigir a função de similaridade do catálogo

Criar uma migration para substituir `find_nearest_reference_tracks` por uma versão calibrada:

- Separar métricas em grupos:
  - Alta confiança: `lufs_integrated`, `dynamic_range_db`, `spectral_centroid`, `spectral_flatness`, `zero_crossing_rate`.
  - Média confiança: `tempo_bpm`, `key_name`, `mode`.
  - Baixa confiança: `energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `liveness`, `speechiness`.
- Reduzir fortemente o peso das métricas estilo Spotify geradas por heurística local.
- Aumentar peso relativo de LUFS/DR/espectro, que são mais próximos de propriedades físicas do áudio.
- Corrigir o tratamento de `NULL`: métrica ausente não deve virar distância zero; ela deve ser ignorada e o score normalizado pelo peso total disponível.
- Tratar BPM com tolerância musical:
  - considerar equivalência de half-time/double-time (`76,9` próximo de `153,8`, por exemplo);
  - não deixar BPM sozinho dominar o ranking quando há divergência de extrator.
- Manter bônus de gênero, mas menor que as métricas técnicas, para não forçar gênero quando a IA classificou errado.

### 2. Enviar todas as métricas técnicas disponíveis para a busca

Atualizar `src/hooks/useMusicDNA.ts` para mandar ao backend, além do que já envia:

- `duration_sec`
- `spectral_rolloff`
- `spectral_flatness`
- `speechiness`
- `liveness`
- `key_name`
- `mode`

Hoje parte dessas métricas existe no cliente, mas não chega à função de catálogo. Isso empobrece o ranking.

### 3. Ajustar o backend para usar o score calibrado como fonte de verdade

Em `supabase/functions/music-dna-analyze/index.ts`:

- Chamar a função recalibrada.
- Enviar para a IA apenas os vizinhos já ranqueados pela função calibrada.
- Ajustar o texto do prompt para deixar claro que as referências são "comparativos técnicos aproximados" e não uma identificação da obra.
- Evitar que o modelo invente probabilidade alta quando o score técnico não sustenta isso.

### 4. Melhorar a UI para não comunicar falsa certeza

Na tela de resultados:

- Trocar linguagem de "probabilidade" por "similaridade técnica" ou "proximidade técnica".
- Mostrar um microtexto: "Comparação baseada em loudness, dinâmica, espectro, ritmo e atributos perceptivos; não é identificação por fingerprint".
- Se o maior score ficar baixo, mostrar estado de baixa confiança: "Referências aproximadas; nenhuma faixa muito próxima no catálogo".
- Se o score ficar alto, destacar como "Alta proximidade técnica".

### 5. Validar com casos de controle

Usar consultas de leitura para testar antes/depois em faixas conhecidas:

- `03. Linus And Lucy`
- pelo menos 2 faixas recentes do usuário que tenham correspondentes prováveis no catálogo
- 1 faixa fora do catálogo para verificar se não há falso positivo

O critério de sucesso não será "a própria faixa sempre em #1", porque sem fingerprint e com extratores diferentes isso não é tecnicamente garantível. O critério será: os vizinhos devem ser musicalmente e tecnicamente mais coerentes, e o score deve expressar confiança real.

## Fora de escopo nesta etapa

- Audio fingerprinting/Chromaprint.
- Reprocessar todo o catálogo com o mesmo extrator do navegador.
- Identificação por nome de arquivo/banda.
- Mudanças no fluxo visual já aplicado anteriormente.

## Resultado esperado

Após o ajuste, o DNA Musical deixa de vender o ranking como "probabilidade de ser aquela banda" e passa a entregar uma comparação técnica calibrada, com confiança proporcional aos dados. Isso corrige a falha conceitual e melhora a utilidade dos resultados para análise musical real.