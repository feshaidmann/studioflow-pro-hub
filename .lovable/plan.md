
## Plano: Implementar melhoria de CX no Music DNA

Vou transformar a tela de resultado do DNA Musical em uma experiência mais orientada à decisão, mantendo a profundidade técnica, mas reorganizando a informação para o artista entender primeiro “o que fazer agora”.

### 1. Criar um resumo executivo no topo do relatório

Adicionar um novo bloco logo após o header do resultado com:

- Status da faixa:
  - “Pronta para streaming”
  - “Boa base, precisa ajustes”
  - “Precisa revisão técnica”
- Diagnóstico em uma frase curta
- Principal força da faixa
- Principal gargalo
- Próxima ação recomendada

A ideia é que o usuário entenda o resultado principal antes de ver LUFS, True Peak, radar e métricas detalhadas.

### 2. Reordenar a hierarquia do relatório

A ordem atual começa muito técnica. Vou reorganizar para:

1. Resumo executivo
2. Diagnóstico resumido
3. Próximos passos de produção
4. Pontos fortes e gargalos
5. Referências mais próximas
6. Benchmark de comparação
7. Métricas técnicas
8. Análise de seções
9. Radar/perfil acústico
10. Timeline e detalhes avançados

Isso melhora principalmente no mobile, onde a tela é estreita e o relatório fica longo.

### 3. Criar navegação rápida por âncoras

Adicionar botões compactos no topo do relatório:

- “Resumo”
- “Ações”
- “Referências”
- “Técnico”

Eles vão rolar suavemente para cada seção usando o helper existente `scrollToAnchor`.

### 4. Melhorar o estado de carregamento

Trocar mensagens excessivamente técnicas por etapas orientadas ao benefício:

- “Lendo o áudio real da faixa”
- “Medindo loudness, dinâmica e espectro”
- “Comparando com benchmarks do gênero”
- “Selecionando referências artísticas próximas”
- “Gerando recomendações de produção”

A análise continua técnica por baixo; a interface fica mais clara para o usuário.

### 5. Agrupar detalhes técnicos em accordions no mobile

No resultado, deixar abertos por padrão:

- Resumo
- Próximos passos
- Pontos fortes/gargalos
- Referências

E tornar colapsáveis:

- Diagnóstico técnico completo
- Análise de seções
- Perfil acústico/radar
- Timeline

No desktop, a leitura continua mais aberta; no mobile, reduzimos o excesso visual.

### 6. Adicionar microcopy para termos técnicos

Incluir explicações curtas e discretas para termos como:

- LUFS: volume percebido em plataformas
- True Peak: risco de distorção após compressão/streaming
- Dynamic Range: variação entre partes suaves e fortes
- Centroide espectral: percepção de brilho/presença

Essas explicações não substituem o diagnóstico técnico; apenas ajudam o artista a interpretar.

### 7. Deixar referências artísticas mais claras

No bloco “Referências mais próximas”, adicionar uma nota:

> “Essas referências indicam proximidade técnica/sonora, não uma sugestão para copiar estética.”

Também vou manter a regra atual: a lista completa de artistas não aparece na tela inicial, apenas os 3–5 escolhidos no relatório.

### 8. Ajustar componentes e arquivos

Arquivos principais a alterar:

- `src/components/music-dna/MusicDNAAnalyzer.tsx`
  - Adicionar resumo executivo
  - Reordenar blocos do relatório
  - Adicionar navegação rápida
  - Criar accordions para detalhes técnicos
  - Melhorar labels e microcopy

- `src/hooks/useMusicDNA.ts`
  - Ajustar logs de carregamento para linguagem mais clara
  - Se necessário, derivar status executivo a partir de LUFS, True Peak, Dynamic Range, distância estética e próximos passos

- `src/lib/scrollToAnchor.ts`
  - Reutilizar o helper existente, sem mudanças estruturais

Não serão necessárias mudanças de banco, autenticação ou edge functions.

### Resultado esperado

O DNA Musical continuará tecnicamente completo, mas a experiência ficará mais clara:

- o artista entende o diagnóstico principal em poucos segundos;
- as ações recomendadas aparecem antes das métricas profundas;
- o relatório fica mais confortável no mobile;
- os dados técnicos continuam disponíveis para produtores e engenheiros;
- as referências artísticas ficam contextualizadas como comparação técnica, não como direção obrigatória.
