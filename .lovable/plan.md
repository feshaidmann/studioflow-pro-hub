# Desabilitar e ocultar Track Intelligence

Congelar a funcionalidade sem apagar dados nem código (pode ser reativada depois). Toda interface de acesso será removida; rotas redirecionam para `/dashboard`.

## Mudanças de UI/Navegação

1. **`src/components/AppLayout.tsx`**
   - Remover entrada de navegação `nav.trackintel` (linha 49).
   - Remover título de header de `/track-intelligence` (linha 58).
   - Remover prefetch (linha 116) e a rota de `ROOT_ROUTES` (linha 145).

2. **`src/App.tsx`**
   - Remover os 3 lazy imports (`TrackIntelligence`, `TrackIntelligenceNew`, `TrackIntelligenceResult`).
   - Substituir as 3 `<Route>` por um único redirect: `<Route path="/track-intelligence/*" element={<Navigate to="/dashboard" replace />} />` para que links antigos não quebrem.

3. **`src/pages/MusicDNA.tsx`** — remover o botão "Track Intelligence" do header.

4. **`src/components/music-dna/MusicDNAAnalyzer.tsx`** — remover CTA/ação que leva a `/track-intelligence/new` (linha ~1045) junto com sua label.

5. **`src/components/MasterAnalyzerModal.tsx`** — remover botão/ação que navega para `/track-intelligence/new?project=...` (linha 326).

6. **`src/components/project-hub/ProjectReleaseTab.tsx`** — remover o `<ReadinessCard />` e o import correspondente.

## Arquivos preservados (congelados, não removidos)

Mantidos no repo para reativação futura, mas sem nenhum acesso pela UI:
- `src/pages/TrackIntelligence.tsx`, `TrackIntelligenceNew.tsx`, `TrackIntelligenceResult.tsx`
- `src/components/project-hub/ReadinessCard.tsx`
- `src/hooks/useTrackIntelligence.ts`
- `supabase/functions/generate-track-intelligence/`
- Tabela `track_intelligence_analyses` (dados intactos)

## Notas

- Não vou apagar a edge function nem a tabela — apenas tornar inacessíveis. Se quiser remoção definitiva depois, me avise.
- Tradução `nav.trackintel` em `LanguageContext` pode ficar (não causa problema); removo apenas se preferir limpeza total.