## Objetivo

Permitir ao artista enxergar **v1, v2, vN da mesma música lado a lado** dentro do Music DNA e, ao mesmo tempo, usar essas análises para rodar um **A/B test do estilo de `diagnostico_resumo`** — Variante A (sonoridade/instrumentação) vs Variante B (emoção/contexto de escuta) — medindo qual ganha mais aceitação dos produtores.

Aceitação = sinal composto:
- 👍 / 👎 explícito no card do resumo
- Salvar a análise
- Copiar o texto do resumo
- Converter resumo / próximos passos em tarefas `[DNA]`

---

## Mudanças no banco

### 1. Versionamento de músicas
Nova tabela `music_track_versions` agrupa análises da mesma música:

```text
music_track_versions
├── id (uuid, PK)
├── user_id (uuid)
├── project_id (uuid, FK projects, nullable)
├── track_slug (text)         — nome canônico (ex. "ondas-do-mar"); chave de agrupamento
├── display_name (text)
├── created_at, updated_at
└── UNIQUE (user_id, track_slug)
```

Em `music_dna_analyses`, adicionar:
- `track_version_id uuid` (FK `music_track_versions`)
- `version_label text` (ex.: "v1 — mix bruto", "v2 — após EQ")
- `version_number int`           — sequencial dentro do grupo
- `summary_variant text NOT NULL DEFAULT 'A'` — `'A'` (sonoridade) ou `'B'` (storytelling). Persistido para nunca trocar depois.
- `summary_variant_assigned_at timestamptz`

RLS: dono via `user_id`.

### 2. Sinais de aceitação
Nova tabela `diagnosis_acceptance_signals`:

```text
diagnosis_acceptance_signals
├── id, user_id, analysis_id (FK music_dna_analyses), created_at
├── summary_variant text         — 'A' | 'B' (snapshot)
├── signal_type text             — 'thumbs_up' | 'thumbs_down' | 'saved' | 'copied' | 'task_created'
└── UNIQUE (analysis_id, signal_type)    — cada sinal conta no máximo 1x por análise
```

RLS: usuário só insere/lê os próprios; admin lê tudo via política específica.

### 3. RPC `get_summary_variant_stats()` (security definer, admin-only)
Retorna por variante: amostra, % com 👍, % com 👎, % salva, % copiada, % convertida em tarefa e um **score de aceitação composto** (média ponderada: 👍=+1, 👎=−1, saved=+0.5, copied=+0.25, task=+0.5, normalizado). Alimenta o painel admin.

---

## Mudanças no frontend

### 1. Atribuição da variante (determinística)
- Hash estável de `analysis_id` → A/B 50/50 (`hash(analysis_id) % 2`). Calculada no edge function antes de chamar o LLM e persistida em `summary_variant`. Garante que reanálise da mesma `music_dna_analyses.id` nunca troque variante e que v1 e v2 da mesma faixa podem cair em variantes diferentes (ótimo para comparar).

### 2. Edge function `music-dna-analyze`
- Bloco `diagnostico_resumo` do system prompt vira condicional:
  - **Variante A — sonoridade/instrumentação:** mantém o texto atual focado em peso/brilho/espaço, instrumentos protagonistas, papel do vocal e enquadramento Spotify (sem números).
  - **Variante B — emoção/contexto de escuta:** mesmo escopo de tamanho (4–6 frases, sem siglas/números), mas pegada de storytelling: que sensação a faixa provoca, em que contexto/momento do ouvinte ela se encaixa (manhã, foco, festa, noite, escuta atenta), que tipo de história/atmosfera ela cria, e como esse "encaixe emocional" mapeia em playlists do Spotify.
- Restante do schema JSON e demais campos permanecem idênticos — só o `diagnostico_resumo` muda de pegada.
- Retorna `summary_variant` no payload para o cliente exibir/registrar.

### 3. Music DNA — UI de versões
Em `src/components/music-dna/MusicDNAAnalyzer.tsx`:
- Novo bloco "Versões desta música" acima do resultado, listando v1…vN do mesmo `track_version_id`, com botão **"Comparar v1 ↔ v2"**.
- Tela de comparação `TrackVersionCompare.tsx`: duas colunas lado a lado (mobile: stack), mostrando para cada versão o `diagnostico_resumo`, badges das principais métricas (loudness percebido, dinâmica, instrumentos protagonistas) e a etiqueta da variante (A/B) em pequeno chip discreto — sem revelar a hipótese ao usuário.
- Ao subir uma nova análise, oferecer "vincular como nova versão de…" se o `track_slug` (slug do nome) bater com uma existente do usuário.

### 4. Captura dos sinais de aceitação
Novo hook `useAcceptanceSignal(analysisId, variant)` expõe `send(signal_type)` (idempotente). Pontos de instrumentação:
- Botões 👍/👎 adicionados ao card do `diagnostico_resumo`.
- `saveAnalysis()` em `useSavedAnalyses` → dispara `'saved'`.
- "Copiar resumo" no `MusicDNAAnalyzer` (linhas ~773) → dispara `'copied'`.
- Conversão de próximos passos em `[DNA]` task → dispara `'task_created'`.

Cada chamada é `upsert ON CONFLICT DO NOTHING` na tabela.

### 5. Painel admin
Em `/admin`, nova aba **"A/B Resumo DNA"** consumindo `get_summary_variant_stats()`. Mostra tabela A vs B, com amostra, taxa de cada sinal, score composto e barrinhas comparativas. Sem informação por usuário (privacidade).

---

## Validação

- Migração roda sem quebrar análises existentes (backfill: `summary_variant = 'A'` em históricas para não poluir; flag `legacy = true` para excluí-las das métricas).
- E2E manual: subir v1, fazer 👍 → ver sinal na tabela; subir v2 → cair em variante diferente quando o hash der; tela de comparação mostra ambos lado a lado.
- Edge function: testar payload retornando `summary_variant` e ambos os estilos de resumo (curl direto no `music-dna-analyze`).
- Admin: confirmar que `get_summary_variant_stats()` ignora análises `legacy` e respeita admin-only.

## Detalhes técnicos rápidos

- `track_slug` derivado por `slugify(track_name)` no cliente, com chance de override manual ("esta é uma nova versão de X").
- Hash A/B: `xxhash32(analysis_id) % 2` no edge (já temos `crypto.subtle` disponível) — determinístico, sem dependência nova.
- Score composto na RPC: `avg( case signal_type when 'thumbs_up' then 1 when 'thumbs_down' then -1 when 'saved' then 0.5 when 'copied' then 0.25 when 'task_created' then 0.5 end )`.
- Idempotência dos sinais via `UNIQUE (analysis_id, signal_type)`.
- Variante nunca é mostrada como "experimento" para o usuário; aparece só como chip discreto "estilo A/B" no admin e em screenshots internas.
