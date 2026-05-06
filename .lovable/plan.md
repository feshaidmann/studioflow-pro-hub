
# Plano — Revisão CX completa da tela de resultados do DNA Musical

Aplicar as 10 melhorias identificadas na auditoria, mantendo o estilo macOS minimalista (light mode, glassmorphism, tokens existentes) e a persona técnica/acolhedora do módulo.

## Escopo por arquivo

### 1. `src/components/music-dna/MusicDNAAnalyzer.tsx` (mudanças principais)

**a) Resumo executivo confiável (#2)**
- Em `ExecutiveSummary`, remover fallbacks `?? -14` / `?? -1` / `?? 8`. Se LUFS, True Peak ou DR forem `null/undefined`, status passa a `{ label: "Análise incompleta", tone: "warning" }`.
- Adicionar tom `warning` (amarelo/âmbar via `bg-amber-100 text-amber-800 border-amber-300`) ao mapa `toneClass`.

**b) Bloco de confiança da análise (#7)**
- Acrescentar rodapé no `ExecutiveSummary` com 3 chips compactos:
  - "BPM: alta/média/baixa confiança" (deriva de `realAnalysis.tempo_confidence` se presente; fallback: omitir).
  - "Catálogo comparado: N faixas" (vem de `catalogNeighbors?.length` + total — passar contagem total via prop opcional).
  - "Trecho analisado: 0:00–X:XX" (de `realAnalysis.duration_sec`).

**c) CTA primário no resumo (#9)**
- Botão "Adicionar todas as próximas ações ao checklist" abaixo do grid de 3 colunas, dispara `addTask` em loop sobre `proximos_passos`.
- Mover `<NextStepsBar>` para **depois** de `<ExecutiveSummary>` (#8) — hoje aparece antes (linha 1017).

**d) Métricas com indicador de alvo (#3)**
- Substituir os 6 `Card` simples (linha 1217) por novo subcomponente `MetricCard` que recebe `{ label, value, unit, target, range, help }` e renderiza:
  - Valor grande
  - Ícone de status (`CheckCircle2` / `AlertTriangle` / `XCircle` do lucide) baseado em comparação com `target ± tolerance`
  - Mini-barra horizontal (`<div>` com `bg-muted` e indicador `bg-primary`) mostrando posição do valor no range esperado
- Targets fixos: LUFS [-16,-10] (alvo -14), True Peak [-2,0] (alvo -1), DR [6,14] (alvo 8), BPM/Tom/Duração sem indicador (manter cards atuais).

**e) Unificar cards de referências em tabs (#1)**
- Substituir os dois `DiagCard` separados (linhas 1123 e 1167) por **um único `DiagCard`** com `<Tabs>` interno:
  - Tab 1: "Catálogo real" (atual `catalogNeighbors`, com deltas técnicos)
  - Tab 2: "Sugestões da IA" (atual `referencias_proximas`, com `motivo`)
- Microcopy explícita no header do card: "Comparação técnica com nosso catálogo (CSV) + sugestões estilísticas geradas pela IA".
- Mover esse card unificado para a seção `#dna-referencias` (deixa de duplicar em `#dna-acoes`).

**f) Vizinhos clicáveis com modal de detalhe (#6)**
- Tornar cada linha de vizinho um `<button>` que abre novo componente `<NeighborDetailDialog>` (Dialog do shadcn) mostrando:
  - Cabeçalho: band + filename + genre + similarity %
  - Comparação lado-a-lado das 6 métricas (sua faixa vs vizinho) com setas ↑↓
  - Tooltip explicando cada delta em linguagem do artista ("Sua faixa está 2 dB mais baixa — para ficar competitiva no Spotify, considere subir o nível geral no master")
  - (Player de preview fica como nota: não há áudio dos vizinhos no banco, então omitido nesta fase — adicionar TODO comentado)

**g) Sticky nav alinhada às seções reais (#4)**
- Atualizar array do menu (linha 1019-1024) para refletir 5 seções consolidadas:
  - "Resumo" → `#dna-resumo`
  - "Ações" → `#dna-acoes`
  - "Identidade" → `#dna-identidade`
  - "Referências" → `#dna-referencias`
  - "Técnico" → `#dna-tecnico` (engloba Perfil acústico via collapse)
- Mover a seção `#dna-identidade` (linha 1190) para **logo abaixo** do Resumo Executivo e acima de Ações (mental model: entender → agir).
- Aglutinar `#dna-perfil` (Perfil acústico) dentro do `DetailSection` Técnico via subdivisão visual.

**h) Tipografia acessível (#5)**
- Substituir tokens `text-[10px]` e `text-[11px]` em **conteúdo de leitura** por `text-xs` (12px) ou `text-sm` (14px) onde for corpo de parágrafo.
- Manter `text-[11px] font-mono` apenas em **labels** (uppercase tracking-widest) — convenção macOS.
- Trocar combinações `text-muted-foreground` em `bg-muted/30` por `text-foreground/70` para passar contraste WCAG AA (≥4.5:1).
- Subir `text-xs` → `text-sm` no `diagnostico_resumo` (linha 316), nos `pontos_fortes`/`gargalos_criativos` (linhas 1080, 1090) e nos `sugestoes_arranjo` (linha 1106).

**i) Contexto de projeto vinculado (#10)**
- No header (linha 988-1015), se `input_metadata.project_id` existir, mostrar breadcrumb: `← Projeto: {nome}` clicável que volta para `/projects?id={projectId}`.
- Adicionar badge "Vinculado ao projeto X" ao lado do badge de gênero.

### 2. `src/hooks/useMusicDNA.ts`
- Tipo `DiagnosisResult`: adicionar campos opcionais `tempo_confidence?: number`, `catalog_total_compared?: number`, `linked_project_id?: string`, `linked_project_name?: string`.
- Em `callMusicDNAAnalyze`, capturar `catalog_total_compared` da resposta da edge function.

### 3. `supabase/functions/music-dna-analyze/index.ts`
- Após o RPC `find_nearest_reference_tracks`, adicionar `count` query em `music_reference_tracks` (filtrado por gênero quando aplicável) e retornar `catalog_total_compared` no JSON final.
- Sem mudanças de schema necessárias.

### 4. Novo componente: `src/components/music-dna/NeighborDetailDialog.tsx`
- Dialog do shadcn, ~120 linhas
- Props: `neighbor: CatalogNeighbor`, `userTrack: { bpm, lufs, energy, key, dynamic_range, spectral_centroid }`, `open`, `onOpenChange`
- Renderiza grid 2 colunas (sua faixa | vizinho) com 6 métricas, cada uma com seta de delta e copy interpretativa.

### 5. Novo subcomponente: `MetricCard` (inline em `MusicDNAAnalyzer.tsx` ou novo arquivo)
- Encapsula card + indicador de status + mini-barra de alvo, conforme item (d).

## Estrutura visual final da tela

```text
[Header com gênero + (novo) breadcrumb projeto + status]
[Resumo Executivo  ←  com (novo) chips de confiança e CTA "Adicionar tudo"]
[NextStepsBar      ←  movido para cá]
[Sticky nav: Resumo | Identidade | Ações | Referências | Técnico]
[Identidade da Faixa  ←  promovida da posição inferior]
[Próximos passos | Pontos fortes / Gargalos | Sugestões de arranjo]
[Card unificado Referências (Tabs: Catálogo real | Sugestões IA)]
   └── linhas clicáveis → NeighborDetailDialog
[Métricas (6 cards com indicador ✓/⚠/✗ + mini-barra)]
[Diagnóstico Técnico]
[Análise de seções]
[Perfil acústico (dentro de Técnico colapsável)]
```

## Itens explicitamente fora do escopo

- Player de áudio dos vizinhos do catálogo (não há URLs no banco) — registrar TODO.
- Re-design completo do `BenchmarkPanel` — mantido como está.
- Mudanças no PDF/markdown export (`buildAnalysisMarkdown`, `generatePDF`) — ficam para iteração seguinte.
- Mudanças no fluxo mobile (collapsibles permanecem; só ajustes de tipografia se aplicam).

## Validação após implementação

1. Subir uma faixa com áudio incompleto (LUFS faltando) → confirmar badge "Análise incompleta".
2. Verificar mini-barras nos 6 cards técnicos com valores extremos (LUFS −24 e −6).
3. Clicar num vizinho → dialog abre com comparação lado-a-lado.
4. Conferir contraste e tamanho dos textos no Lighthouse / DevTools.
5. Sticky nav rola para cada uma das 5 seções corretamente.

