
## Plano: Evoluir o Criativo para CX 10/10

Vou transformar a tela do Criativo em um fluxo mais coerente para artista independente: primeiro entender a música/campanha, depois gerar imagem e legenda de forma separada, com filtros próprios, regeração independente e histórico útil.

## Objetivo

A experiência final deve deixar claro:

- imagem e legenda são entregas separadas;
- a legenda é pensada para divulgar a música, não apenas descrever a estética;
- os filtros de legenda mudam de fato o resultado;
- dados vindos do DNA Musical não aparecem como nomes técnicos feios;
- formatos, tamanhos e expectativas ficam coerentes;
- mobile fica menos longo e mais guiado.

## 1. Corrigir coerência de dados da música

### Problema atual

Quando o Criativo recebe dados do DNA Musical, o nome da faixa pode vir como nome técnico de arquivo, por exemplo:

```text
01 Você é Linda MASTER 010824.wav
```

Isso pode virar título público na arte e na legenda.

### Implementação

Criar uma função utilitária no próprio módulo ou em `src/lib` para limpar nomes técnicos:

```text
01 Minha Musica MASTER FINAL.wav
→ Minha Musica
```

A limpeza deve remover:

- extensão de arquivo;
- prefixos numéricos;
- termos técnicos comuns: `master`, `final`, `mix`, `v1`, `v2`, datas, `wav`, `mp3`;
- excesso de espaços, underscores e hífens.

Aplicar essa limpeza ao preencher `trackName` vindo do DNA Musical.

## 2. Reorganizar a tela em blocos de decisão

Hoje a tela mistura prompt, detalhes da faixa, estética, imagem e legenda em uma jornada longa.

Vou reorganizar `src/pages/Creative.tsx` em seções mais claras:

```text
1. Música e campanha
2. Direção visual
3. Imagem
4. Legenda
5. Galeria
```

### Música e campanha

Campos principais:

- nome da música;
- artista;
- data de lançamento;
- projeto vinculado;
- fase da campanha.

A ideia é fazer o usuário entender que a criação nasce da música, não só da estética.

### Direção visual

Campos:

- formato visual;
- descrição da ideia;
- estilo;
- referência visual;
- arte com texto / sem texto.

### Imagem

Área dedicada para:

- gerar imagem;
- gerar novamente / variação;
- editar;
- baixar;
- salvar;
- desdobrar para outros canais.

### Legenda

Área independente para:

- gerar legenda;
- gerar novamente;
- copiar;
- salvar no histórico;
- filtrar por plataforma, objetivo, tom, CTA e tamanho.

## 3. Separar totalmente imagem e legenda

### Problema atual

A legenda já foi separada tecnicamente, mas ainda fica visualmente subordinada ao preview da imagem.

### Implementação

Criar um componente dedicado:

```text
src/components/creative/CaptionGeneratorCard.tsx
```

Ele receberá:

- `trackName`
- `artistName`
- `releaseDate`
- `prompt`
- `dnaSource`
- filtros de legenda
- função `generateText`

E controlará:

- estado de loading da legenda;
- texto gerado;
- botão “Gerar legenda”;
- botão “Gerar novamente”;
- botão “Copiar”;
- botão “Salvar legenda”, se houver persistência.

Isso reduz o tamanho de `Creative.tsx` e deixa a experiência mais legível.

## 4. Implementar filtros reais de legenda

### Filtros atuais

Hoje existem:

- plataforma;
- objetivo;
- tom.

Vou expandir para:

### Plataforma

- Instagram Feed
- Reels / Shorts
- TikTok
- Spotify / streaming
- WhatsApp / comunidade

### Fase da campanha

- teaser;
- pré-save;
- lançamento;
- pós-lançamento;
- bastidores;
- show / agenda.

### Objetivo

- ouvir agora;
- salvar / pré-save;
- comentar;
- compartilhar;
- seguir o artista;
- chamar para show/evento.

### Tom

- autêntico;
- emocional;
- direto;
- poético;
- bem-humorado;
- urgente.

### Tamanho

- curto;
- médio;
- storytelling.

### Hashtags

- poucas;
- moderadas;
- sem hashtags.

Esses filtros serão enviados para a função de IA e aparecerão explicitamente no prompt de geração da legenda.

## 5. Melhorar o prompt da legenda no backend

Atualizar a função `generate-creative` no modo texto para que ela respeite os novos filtros.

A regra principal será:

```text
A legenda deve vender/divulgar a música primeiro.
A estética/DNA só orienta o vocabulário e o clima.
```

### Ajustes importantes

- remover limite fixo universal de 280 caracteres;
- variar tamanho conforme o filtro escolhido;
- adaptar CTA conforme objetivo;
- adaptar linguagem por plataforma;
- evitar legenda que pareça descrição de capa;
- evitar excesso de hashtags;
- sempre usar pt-BR natural;
- se tiver nome da música e artista, eles devem aparecer de forma orgânica.

Exemplo de instrução interna:

```text
Se plataforma = TikTok/Reels:
- primeira linha com gancho forte;
- CTA curto;
- linguagem mais direta.

Se plataforma = Instagram:
- legenda mais completa;
- pode ter storytelling curto;
- hashtags no final.

Se objetivo = pré-save:
- CTA principal deve ser salvar/ativar lembrete.
```

## 6. Persistir legendas no histórico

Para CX 10/10, a legenda não deve sumir ao sair da tela.

Vou adicionar uma tabela no banco:

```text
creative_captions
```

Campos planejados:

- `id`
- `user_id`
- `project_id`
- `track_name`
- `artist_name`
- `caption`
- `platform`
- `campaign_phase`
- `objective`
- `tone`
- `length`
- `hashtags_mode`
- `prompt`
- `dna_context`
- `created_at`

Regras de acesso:

- cada usuário só vê e gerencia suas próprias legendas;
- leitura, criação, atualização e exclusão serão protegidas por autenticação.

Na interface, o card de legenda poderá mostrar:

- legenda atual;
- últimas legendas geradas;
- botão copiar;
- botão excluir;
- filtro por projeto/música futuramente.

## 7. Corrigir incoerência de formatos

### Problema atual

Algumas capas dizem `3000×3000`, mas o objeto de formato usa `1920×1920`.

### Implementação

Ajustar `src/components/creative/FormatSelector.tsx` para que a descrição reflita o que o sistema realmente usa.

Opções:

- ou atualizar descrição para `1920×1920`;
- ou alterar o formato para gerar/salvar metadata como `3000×3000`, se o fluxo suportar bem.

Vou priorizar coerência visual e técnica: o usuário não deve ver uma promessa diferente do arquivo gerado.

## 8. Permitir imagem vertical estática separada de vídeo

### Problema atual

`Story / Reels` está marcado como vídeo automaticamente.

Isso impede o usuário de escolher uma imagem vertical estática para story.

### Implementação

Separar formatos:

```text
Story estático — 1080×1920
Reels / Shorts loop — 1080×1920 vídeo
Canvas Spotify — 1080×1920 vídeo
```

Assim o usuário escolhe conscientemente entre imagem e loop animado.

## 9. Corrigir estados de loading e erros

Ajustes técnicos em `Creative.tsx` e `useCreativeAssets.ts`:

- garantir `try/finally` em `handleGenerateCaption`;
- garantir `try/finally` em edição de imagem;
- evitar loading travado quando a função falhar;
- exibir erro específico quando faltar música, prompt ou contexto;
- capturar headers de cota também na geração de legenda, se disponíveis;
- remover estado morto `detailAsset`.

## 10. Melhorar mobile em 434px

A tela atual fica longa no mobile.

Vou aplicar:

- cards mais compactos;
- seções colapsáveis com resumo;
- CTA sticky apenas para imagem;
- legenda com botão próprio dentro do card;
- menos controles simultâneos abertos;
- labels mais curtos;
- melhor espaçamento entre chips e selects.

Estrutura mobile esperada:

```text
[Música e campanha]
[Direção visual]
[Gerar imagem]

[Preview]

[Legenda]
[Gerar legenda]
[Copiar / salvar]
```

## 11. Melhorar a galeria

A galeria atual salva apenas imagem/vídeo.

Com a nova tabela de legendas, a experiência passa a ter dois históricos:

- artes geradas;
- legendas geradas.

Nesta etapa, vou implementar pelo menos o histórico básico de legendas no card de legenda, sem necessariamente misturar com a galeria visual.

## 12. Arquivos principais

### Frontend

- `src/pages/Creative.tsx`
  - reorganizar fluxo;
  - remover estados mortos;
  - conectar novos filtros;
  - separar imagem e legenda visualmente.

- `src/components/creative/CaptionGeneratorCard.tsx`
  - novo componente de geração, re-geração, cópia e histórico de legenda.

- `src/components/creative/FormatSelector.tsx`
  - corrigir descrições;
  - separar story estático de vídeo.

- `src/components/creative/FormatChips.tsx`
  - atualizar formatos destacados.

- `src/components/creative/QuickTemplates.tsx`
  - ajustar templates para campanha musical, não só estética.

- `src/hooks/useCreativeAssets.ts`
  - expandir `generateText`;
  - adicionar funções para salvar/listar/excluir legendas, se a tabela for criada.

### Backend / banco

- criar tabela `creative_captions` com regras de acesso por usuário;
- atualizar função `generate-creative` para novos filtros de legenda;
- manter geração de imagem e legenda independentes.

## 13. Critérios de sucesso

A implementação estará boa quando:

- o usuário consegue gerar imagem sem legenda;
- o usuário consegue gerar legenda sem imagem;
- ambos têm botão de gerar novamente;
- os filtros de legenda alteram claramente o resultado;
- a legenda prioriza divulgação da música;
- DNA Musical melhora o contexto sem transformar a legenda em descrição estética;
- nomes técnicos de arquivo não aparecem como título público;
- formatos têm descrições coerentes;
- Story estático e vídeo loop são escolhas separadas;
- mobile fica mais organizado e menos cansativo.

## Resultado esperado

O Criativo deixa de ser apenas “gerador de imagem com legenda” e passa a funcionar como um mini kit de campanha musical:

- arte visual;
- legenda de divulgação;
- filtros por canal e objetivo;
- histórico de legendas;
- integração mais limpa com DNA Musical;
- experiência mais clara para lançamento de música.
