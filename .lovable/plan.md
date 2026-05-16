# UI A/B Resumo + Comparação de Versões

Backend, hooks e edge function já estão prontos. Falta a camada visual.

## 1. Feedback 👍/👎 no resumo executivo

**Arquivo:** `src/components/music-dna/MusicDNAAnalyzer.tsx`

- Passar `analysisId` e `summary_variant` do estado do `useMusicDNA` para `<ExecutiveSummary>` no render (linha ~1260).
- Dentro de `ExecutiveSummary`, abaixo do bloco `diagnostico_resumo`:
  - Linha discreta: "Esse resumo te ajudou?" + botões `ThumbsUp` / `ThumbsDown` (ícones lucide, variantes ghost).
  - Botão "Copiar resumo" já existente passa a chamar `onSendSignal('copied')` além de copiar.
  - Estado local `feedback: 'up' | 'down' | null` para feedback visual imediato; chamada idempotente via `useAcceptanceSignal`.
  - Badge sutil mostrando variante (`A` ou `B`) só para admins (via `has_role`) — opcional, para QA interno.
- Toast curto em pt-BR confirmando ("Obrigado pelo feedback!").

## 2. Sinal de "task_created"

**Arquivo:** `src/components/music-dna/MusicDNAAnalyzer.tsx`
- No handler `handleAddAllSteps` (conversão `[DNA]` → tarefas), disparar `sendSignal('task_created')` após sucesso.

## 3. Bloco "Versões desta música" + comparação

**Novo:** `src/components/music-dna/TrackVersionsPanel.tsx`
- Renderizado dentro do `MusicDNAAnalyzer` após o resumo executivo, quando há análise salva.
- Usa `useTrackVersions(trackSlug)` para listar v1…vN da mesma faixa do usuário.
- Lista compacta: `v1 · 14/05 · -9.2 LUFS` etc., com botão "Comparar" quando ≥ 2 versões.

**Novo:** `src/components/music-dna/TrackVersionCompare.tsx`
- Dialog/Sheet em tela cheia (mobile-friendly, 434px ok).
- Dropdowns para escolher versão A e versão B.
- Layout em duas colunas (stack em mobile):
  - Cabeçalho: nome + label da versão + badge da variante de resumo.
  - `diagnostico_resumo` lado a lado.
  - Tabela comparativa: LUFS, True Peak, DR, BPM, tom, gênero detectado — com setas indicando delta (▲ verde / ▼ vermelho conforme métrica).
- Sem nova lógica de variante — só renderiza o que já está salvo.

## 4. Painel Admin "A/B Resumo DNA"

**Novo:** `src/pages/admin/SummaryVariantStats.tsx`
- Acessível via nova aba/rota em `src/pages/Admin.tsx` (seguindo padrão das abas existentes).
- Consome RPC `get_summary_variant_stats()` (já existe).
- Cards lado a lado para Variante A e B mostrando:
  - Sample size, 👍 rate, 👎 rate, saved/copied/task rates, **composite score** destacado.
  - Indicador "vencedora" quando diferença ≥ 5% e sample ≥ 30 por variante.
- Tabela bruta abaixo. Botão "Atualizar".
- Respeita `has_role('admin')`; redireciona se não-admin.

## 5. i18n (pt/en)

Adicionar chaves em `LanguageContext`:
- `dna.feedback.helpful` / `dna.feedback.notHelpful` / `dna.feedback.thanks`
- `dna.versions.title` / `dna.versions.compare` / `dna.versions.empty`
- `dna.compare.versionA` / `dna.compare.versionB` / `dna.compare.metric` / `dna.compare.delta`
- `admin.summaryVariant.title` / `admin.summaryVariant.winner` / `admin.summaryVariant.insufficient`

## 6. Validação

- Build limpo (typecheck).
- Smoke test manual: subir v2 da mesma música → ver lista com v1+v2 → abrir comparação → clicar 👍 → conferir linha em `diagnosis_acceptance_signals`.
- Acessar `/admin` como admin → ver variantes; como user comum → redirect.

## Fora de escopo (não fazer agora)

- Gráficos temporais no admin (linha do tempo de score por dia).
- Forçar variante via querystring para QA — pode ser adicionado depois.
- Mudar peso do composite score (já fixo no RPC).
