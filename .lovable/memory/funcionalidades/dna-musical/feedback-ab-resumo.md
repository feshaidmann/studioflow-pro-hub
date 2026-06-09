---
name: A/B Resumo DNA — telemetria de longo prazo
description: Coleta de sinais do diagnostico_resumo com impressions como denominador, task_created_rate como métrica-norte e metadata.reason em 👎
type: feature
---

Tabela `diagnosis_acceptance_signals` aceita os tipos: `impression`, `thumbs_up`, `thumbs_down`, `saved`, `copied`, `task_created`. Cada sinal carrega `metadata jsonb` com snapshot de contexto: `{stage, genre, extraction_confidence}` e, no caso de 👎, `reason` (texto livre opcional, até 280 chars).

A impressão é registrada via IntersectionObserver no ExecutiveSummary (threshold 0.5, dwell ≥1s) e é o denominador de todas as taxas — não usar `sample_size` para calcular taxas.

Métrica-norte do experimento: **`task_created_rate`** (única que mede valor entregue). Polegares e cópias são termômetros secundários.

Critério de parada: mínimo 100 impressões por variante + diferença ≥10pp em `task_created_rate`. Sem isso, painel mostra "Em andamento". TTL sugerido: 60 dias.

RPC: `get_summary_variant_stats()` retorna `impressions`, `sample_size` e todas as taxas. Painel: `src/components/admin/SummaryVariantStatsSection.tsx`. Hook: `useAcceptanceSignal` (`metadata` opcional).
