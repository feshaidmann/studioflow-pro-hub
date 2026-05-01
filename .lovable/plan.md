
## Objetivo

Aplicar as 5 versões de arquivo enviadas, que juntas entregam:

1. **Ponte Projeto → Criativo** com pré-seleção automática do DNA Musical da faixa.
2. **Persona da IA refinada** (engenheiro/produtor BR independente, com vocabulário de plugins e tom de parceiro técnico — sem "urgente/crítico").
3. **Contexto de streaming por gênero** injetado no prompt do DNA Musical (LUFS-alvo, especificidades de mix por gênero BR).
4. **Refino do prompt do DNA** (instruções por campo, segmentação verso/refrão opcional, nova régua de Dynamic Range).
5. **Atualizações no `Creative.tsx` e na edge function `generate-creative`** para consumir contexto de projeto + DNA na geração de artes/legendas.

## Mudanças por arquivo

### 1. `src/components/project-hub/ProjectReleaseTab.tsx`
- Aceita props novas: `projectName`, `artistName`.
- Adiciona componente `CreativeEntryCard` no topo da aba: botão "Criar materiais" que navega para `/criativo?project=<id>&dna=<id>` (DNA injetado quando há análise salva vinculada ao projeto via `useSavedAnalyses`).
- Mostra badge "DNA Musical disponível — <faixa>" quando há análise.
- Exibe alerta âmbar quando há itens visuais pendentes (capa, thumbnail, teaser, reels, stories).
- Importa `useNavigate`, `useSavedAnalyses`, `Button`, ícones `Palette` e `Dna`.

> Observação: o componente pai (`ProjectDetail.tsx` / Project Hub) já passa `projectId`. Vou verificar e passar também `projectName` e `artistName` para que o card mostre o contexto correto. Se as props não forem passadas, o card cai nos defaults `"este projeto"` / `""` sem quebrar.

### 2. `src/hooks/useMusicDNA.ts` (~+54 linhas líquidas)
- Novo dicionário `GENRE_STREAMING_CONTEXT` com nota técnica específica para 19 gêneros BR (Funk Carioca, Sertanejo, MPB, Pagode, Forró/Piseiro, Trap BR, Rap BR, Pop BR, R&B, Indie BR, Rock Alt BR, Axé, Eletrônica/House, Lo-Fi, Bossa Nova, Reggae BR, Indie Folk, Samba, Pop Internacional) — cada nota cita LUFS-alvo, instrumentação característica e implicações de mix para streaming no Brasil.
- Injeção dessa nota no prompt enviado ao edge function.
- Régua de Dynamic Range atualizada: `< 7 = hiperlimitado; 7–12 = comercial; > 12 = alta dinâmica` (antes era `< 7` / `> 14`).
- Bloco de "REGRAS DE LINGUAGEM" reescrito: tom de parceiro técnico ("vale muito a pena explorar", "seria interessante considerar") + priorização de plugins do ecossistema BR (Waves, FabFilter, Ozone, Voxengo SPAN, DMGAudio, TDR Nova, Youlean).
- Segmentação verso/refrão fica opcional: se não detectada, instrui IA a pular `analise_seccoes.contraste_verso_refrao`.
- Bloco "Instruções por campo" detalhando o que cada chave do JSON deve conter (`mood_principal`, `territorio_sonoro`, `tags`, `persona_ouvinte`, `referencias_proximas`, etc.) com foco em mercado BR.

### 3. `supabase/functions/music-dna-analyze/index.ts`
- Apenas o `system message` da chamada ao Lovable AI é reescrito: persona "produtor sênior + engenheiro de áudio com expertise no mercado fonográfico brasileiro independente", linguagem de parceiro técnico, vocabulário de plugins reais, regras de tom para `diagnostico_resumo` (crítico musical acolhedor com referência técnica concreta).
- Resto da função (CORS, auth, lookup de benchmark, nearest-neighbors, logging) permanece igual.

### 4. `supabase/functions/generate-creative/index.ts` (+168 linhas)
- Pipeline expandido para receber e usar contexto de **projeto + DNA Musical** (gênero, mood, persona-ouvinte, paleta) na construção do prompt de imagem/legenda.
- Mantém helpers existentes (`normalizeImageToFormat`, `aspectLabel`, etc.).
- Acrescenta lógica de derivação coerente quando há DNA presente (palette, mood, território sonoro influenciam o prompt de geração).

### 5. `src/pages/Creative.tsx` (+190 linhas)
- Lê `?project=<id>` e `?dna=<id>` da URL e pré-carrega:
  - dados do projeto via `useProjects()`,
  - análise de DNA via `getCachedAnalysis()` / `useSavedAnalyses`.
- Mostra cabeçalho "voltando para o projeto" (botão `ArrowLeft` para `/projetos?id=...`).
- Pré-popula nome da faixa, gênero/mood/paleta a partir do DNA quando disponível.
- Novo cartão visual mostrando vínculo ativo com projeto + DNA (ícones `FolderKanban`, `Dna`, `Music`).
- Ajustes em `FormatSelector`, `StyleChips`, `CaptionGeneratorCard` para consumir o contexto.
- Mantém todos os recursos atuais (geração de imagem, vídeo loop, legendas, batch derive, lightbox).

## Arquivos não tocados (intencional)
- `src/lib/audioAnalysis.ts`, `MasterAnalyzerModal.tsx`, `Projects.tsx` — tolerância de True Peak ±1 dB já aplicada em iteração anterior.
- Migrações de banco — `music_reference_tracks` e RPCs já estão atualizadas.
- `src/integrations/supabase/{client,types}.ts` — não editar.

## Plano de execução

```text
1. Substituir ProjectReleaseTab.tsx pela versão enviada
2. Verificar ProjectDetail.tsx / Project Hub e passar projectName + artistName para a aba
3. Substituir useMusicDNA.ts pela versão enviada
4. Substituir music-dna-analyze/index.ts pela versão enviada
5. Substituir generate-creative/index.ts pela versão enviada
6. Substituir Creative.tsx pela versão enviada
7. Validar: build/typecheck automático do harness
```

## Validação manual após o deploy

- Abrir um projeto na etapa "Lançado" → aba Lançamento → ver card "Materiais de divulgação" com badge de DNA quando aplicável.
- Clicar "Criar materiais" → confirmar query `?project=...&dna=...` no `/criativo` e contexto carregado.
- Rodar uma análise de DNA em uma faixa de gênero conhecido (ex: Sertanejo Universitário) → conferir que a nota de streaming do gênero aparece refletida no diagnóstico técnico e que o resumo usa tom de parceiro ("vale muito a pena explorar"), nunca "urgente".
- Gerar uma capa no `/criativo` com DNA carregado → confirmar que o prompt de imagem incorpora mood/território sonoro do DNA.
