

## Plano: Expandir o banco de comparações do DNA Musical

Vou expandir o DNA Musical em duas camadas: **benchmarks por estilo** no banco de dados e **referências artísticas reais** usadas pela IA no relatório. A lista completa continuará oculta na tela inicial; o usuário só verá as referências escolhidas no relatório final.

### 1. Expandir os estilos de benchmark

A tabela `music_dna_benchmarks` já existe e será usada como banco público de comparação. Vou popular/atualizar essa base com benchmarks por gênero, incluindo médias de:

- danceability
- energy
- loudness
- speechiness
- acousticness
- instrumentalness
- liveness
- valence
- tempo
- LUFS
- tonalidades mais comuns

Estilos iniciais propostos:

- MPB Contemporânea
- Bossa Nova
- Samba
- Pagode
- Funk Carioca
- Forró / Piseiro
- Sertanejo Raiz
- Sertanejo Universitário
- Pop Brasileiro
- Indie BR
- Rock Alternativo BR
- Rap BR
- Trap BR
- R&B / Soul
- Reggae BR
- Axé / Pop Bahia
- Lo-Fi Hip Hop
- Eletrônica / House
- Indie Folk
- Pop Internacional

### 2. Expandir artistas de referência reais

Vou transformar o pool atual de 16 artistas em uma base maior, com aproximadamente 60–80 artistas reais, cada um marcado por territórios sonoros.

Exemplos:

- MPB/Indie BR: Tim Bernardes, Rubel, Liniker, Céu, Marina Sena, Ana Frango Elétrico, Tuyo, Terno Rei, Boogarins
- Rap/Trap BR: Criolo, Emicida, Djonga, BK’, Baco Exu do Blues, Matuê, Don L, Flora Matos, Rincon Sapiência
- Pop BR: Anitta, IZA, Duda Beat, Pabllo Vittar, Luísa Sonza, Jão
- Sertanejo/Forró/Piseiro: Marília Mendonça, Maiara & Maraisa, Almir Sater, João Gomes, Zé Vaqueiro, Dominguinhos
- Samba/Pagode/Axé: Cartola, Beth Carvalho, Zeca Pagodinho, Ferrugem, Ivete Sangalo, BaianaSystem
- Rock BR: Pitty, Fresno, Scalene, Far From Alaska, Engenheiros do Hawaii
- Internacional: Bon Iver, Phoebe Bridgers, Sufjan Stevens, Billie Eilish, Lorde, James Blake, SZA, Kendrick Lamar, Frank Ocean, Tyler the Creator

### 3. Filtrar referências antes de enviar para a IA

Em vez de mandar todos os artistas para a IA, vou criar uma função de seleção inteligente:

- Detecta o território mais provável da faixa a partir das features reais.
- Cruza esse território com o gênero estimado e/ou informado.
- Seleciona cerca de 15–20 artistas relevantes para o prompt.
- A IA escolhe apenas 3–5 para exibir no relatório em `referencias_proximas`.

Isso aumenta precisão sem poluir o prompt e sem mostrar uma lista genérica ao usuário.

### 4. Melhorar o cálculo de referência acústica

Hoje o relatório usa principalmente `GENRE_PRESETS` locais e, quando disponível, `music_dna_benchmarks`.

Vou ajustar a lógica para priorizar:

1. Benchmark real do banco, quando houver correspondência de gênero.
2. Preset expandido local, se o benchmark ainda não existir.
3. Média geral, como fallback.

Também vou melhorar a correspondência por nomes próximos, por exemplo:

- “Trap Brasileiro” → “Trap BR”
- “MPB” → “MPB Contemporânea”
- “Funk” → “Funk Carioca”
- “Sertanejo” → “Sertanejo Universitário” ou “Sertanejo Raiz”

### 5. Atualizar o relatório para deixar a base clara

No relatório, o bloco de benchmark passará a indicar:

- qual gênero/benchmark foi usado;
- quantas faixas compõem aquele benchmark;
- se a comparação veio do banco público ou do fallback local;
- os artistas próximos escolhidos pela IA, com similaridade e motivo técnico.

A lista completa de artistas não volta para a tela de upload.

## Arquivos a alterar

- `src/hooks/useMusicDNA.ts`
  - Expandir `Genre`
  - Expandir `GENRE_PRESETS`
  - Trocar `REFERENCE_ARTISTS` simples por referências categorizadas
  - Adicionar helper para selecionar referências relevantes
  - Incluir referências filtradas no prompt da IA

- `src/hooks/useMusicDnaBenchmarks.ts`
  - Melhorar busca/fallback de benchmarks
  - Adicionar aliases de gênero
  - Evitar fallback ruim quando o gênero não bate exatamente

- `src/types/musicDna.ts`
  - Ajustar tipos auxiliares, se necessário, para representar fonte/qualidade do benchmark

- `src/components/music-dna/MusicDNAAnalyzer.tsx`
  - Ajustar textos do bloco “Benchmark real”
  - Manter artistas comparados apenas no relatório

- Banco de dados
  - Inserir/atualizar registros iniciais em `music_dna_benchmarks`
  - Sem criar nova tabela
  - Sem alterar permissões existentes

## Resultado esperado

Após a mudança, cada música enviada será comparada contra:

- uma base expandida de aproximadamente 20 estilos;
- benchmarks técnicos por gênero;
- um pool de 60–80 artistas reais;
- 15–20 referências relevantes enviadas à IA;
- 3–5 artistas exibidos no relatório final, escolhidos de acordo com os dados reais da faixa.

