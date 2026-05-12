## Objetivo

Adicionar dois botões — **"Falso alerta"** e **"Alerta correto"** — no `GenreMismatchHint`. Cada clique grava feedback no banco e ajusta automaticamente, por usuário e por gênero declarado, os limiares de `score` e `gap` que disparam o alerta. Quanto mais feedback "falso alerta" um usuário acumular para um gênero, mais alto o limiar; feedback "correto" pode relaxar até um piso seguro.

---

## 1. Banco de dados (nova tabela)

`public.genre_mismatch_feedback`

Campos de domínio:
- `user_id` (uuid, NOT NULL) — dono do feedback
- `declared_genre` (text) — gênero declarado pelo usuário/IA
- `detected_genre` (text) — gênero apontado pelo classificador
- `score` (numeric) — top1 no momento do alerta
- `gap` (numeric) — top1 − top2 no momento do alerta
- `verdict` (text) — `'falso_alerta'` ou `'correto'`
- `analysis_id` (text, opcional) — referência à análise que originou
- `created_at` (timestamptz default now())

RLS: dono gerencia o próprio (`auth.uid() = user_id`). Sem leitura pública.

Índice: `(user_id, declared_genre, created_at desc)` para a calibração.

---

## 2. Calibração (hook novo `useGenreMismatchCalibration`)

Arquivo: `src/hooks/useGenreMismatchCalibration.ts`

Responsabilidades:
- Carregar (React Query) os últimos ~200 feedbacks do usuário autenticado.
- Expor `getThresholds(declaredGenre)` retornando `{ scoreThreshold, gapThreshold }`.
- Expor `submitFeedback({ declared, detected, score, gap, verdict, analysisId })` (mutation) que faz `insert` e invalida o cache.

Heurística de cálculo (por gênero declarado, normalizado):
- Defaults: `score = 0.92`, `gap = 0.05` (valores atuais).
- Pisos mínimos: `score = 0.88`, `gap = 0.04`.
- Tetos: `score = 0.985`, `gap = 0.10`.
- Para cada gênero, considerar os últimos 30 feedbacks daquele gênero:
  - `maxFalseScore` / `maxFalseGap` = maior `score`/`gap` marcado como `falso_alerta`.
  - `minCorrectScore` / `minCorrectGap` = menor `score`/`gap` marcado como `correto`.
  - `scoreThreshold = clamp(max(default, maxFalseScore + 0.005), piso, teto)`.
  - Se não houver `falso_alerta` e houver ≥3 `correto`: `scoreThreshold = clamp(min(default, minCorrectScore − 0.005), piso, teto)`.
  - Mesma lógica para `gapThreshold`.
- Se não houver feedback para o gênero → cair para um cálculo global agregado do mesmo usuário; se também vazio → defaults.

Observações:
- A normalização usa `normalizeGenreName` já existente em `src/lib/genreFamilies.ts`.
- Cache stale time alto (10 min) — feedback é raro e a invalidação na mutation atualiza imediatamente.

---

## 3. Componente `GenreMismatchHint`

Arquivo: `src/components/music-dna/GenreMismatchHint.tsx`

Mudanças:
- Aceitar duas novas props opcionais: `analysisId?: string` (para registrar) e `onFeedbackSubmitted?: () => void` (para o pai poder ocultar).
- Substituir as constantes locais `SCORE_THRESHOLD`/`GAP_THRESHOLD` por valores vindos de `useGenreMismatchCalibration().getThresholds(declared)`.
- Manter as supressões existentes (mesma família, normalização, runner-up na mesma família).
- Após o cálculo do `top1`/`top2`, manter estado local `dismissed` para esconder o card imediatamente após clique.
- Adicionar rodapé com dois botões pequenos (variantes `ghost`/`outline`, alinhados à direita):
  - **"Falso alerta"** → `submitFeedback({ verdict: 'falso_alerta', ... })` → toast `"Obrigado — vou ser mais conservador para {declared}."` → set `dismissed`.
  - **"Alerta correto"** → `submitFeedback({ verdict: 'correto', ... })` → toast `"Anotado — alertas como esse vão continuar aparecendo."` → set `dismissed`.
- Ambos enviam `score` e `gap` capturados no momento.

---

## 4. Integração no `MusicDNAAnalyzer`

Passar `analysisId` (já existe `savedAnalysisId` ou cache key) para o `GenreMismatchHint`. Nenhuma outra mudança necessária — o componente continua condicional ao `diagnosis.classifierHint`.

---

## 5. Tradução / textos

Apenas em português (sem chave i18n nova nessa iteração — o componente já está em PT). Se `LanguageContext` for usado depois, fica para um passo separado.

---

## 6. Memória do projeto

Adicionar entrada em `mem://funcionalidades/dna-musical/feedback-de-classificador`:
- Tabela `genre_mismatch_feedback`, dois botões no hint, calibração por (user_id, declared_genre) com pisos/tetos.

---

## Arquivos

**Novos:**
- `src/hooks/useGenreMismatchCalibration.ts`
- `mem://funcionalidades/dna-musical/feedback-de-classificador`

**Alterados:**
- `src/components/music-dna/GenreMismatchHint.tsx`
- `src/components/music-dna/MusicDNAAnalyzer.tsx` (apenas passar `analysisId`)
- `mem://index.md` (referência à nova memória)

**Migração SQL:** criar tabela + RLS + índice.

---

## Fora do escopo
- Recalibração global agregada entre todos os usuários.
- Ajuste das famílias musicais (`genreFamilies.ts`) com base no feedback.
- UI administrativa para inspecionar feedbacks.
- Reaproveitar o feedback no payload enviado à IA (apenas thresholds locais nessa fase).
