## Objetivo
Fechar os 5 últimos itens do plano de CX da tela de resultados do DNA Musical (`src/components/music-dna/MusicDNAAnalyzer.tsx`). Tudo numa única edição, sem mudar contratos do hook nem da edge function.

## 1. MetricCards técnicos com targets visuais
Em `DetailSection #dna-tecnico` (linhas ~1350-1359), substituir o grid de 6 `Card` "burras" por 6 `<MetricCard />` (componente já existe na linha 394) passando `target` + `range`:

- LUFS — `range {min:-30,max:-6}`, `target {min:-15,max:-13,ideal:-14}`, unit `LUFS`
- True Peak — `range {-6,0}`, `target {-2,-1,ideal:-1}`, unit `dBTP`
- DR — `range {2,18}`, `target {7,12,ideal:9}`, unit `LU`
- BPM — `range {40,200}`, sem target (neutro), digits 0
- Tom — render como card simples (string), sem barra
- Duração — string "MM:SS", neutro

Para Tom/Duração mantém um sub-componente leve `MetricChip` (label + valor + help) reutilizando o mesmo visual mas sem barra/status. Valores vêm de `realAnalysis ?? audioAnalysis` (nunca usar fallback `?? -14`).

## 2. Unificar referências em Tabs
Trocar as duas seções `#dna-acoes`→"Faixas mais próximas no catálogo" (linhas 1256-1296) e `#dna-referencias`→"Referências mais próximas" (linhas 1300-1318) por **uma única** `DiagCard` dentro de `#dna-referencias` com `<Tabs>`:

- Aba **"Catálogo Real"** (default) — lista atual de `catalogNeighbors` mantendo `NeighborDetailDialog` e badge `catalogTotalCompared` ("comparado contra N faixas").
- Aba **"Sugestões IA"** — `referencias_proximas` com motivo + similaridade.

Manter `BenchmarkPanel` logo abaixo da DiagCard. Remover o bloco do catálogo de dentro de `#dna-acoes`.

## 3. Promover Identidade
Reordenar o JSX para:
1. Header + ExecutiveSummary
2. NextStepsBar
3. Sticky nav (atualizar para incluir Identidade no início)
4. **`#dna-identidade`** (movido de baixo para cá)
5. `#dna-acoes`
6. `#dna-referencias` (com Tabs)
7. `#dna-tecnico`
8. demais DetailSections

Sticky nav vira: Resumo → Identidade → Ações → Referências → Técnico (já está, mas a ordem dos `<section>` no DOM precisa bater).

## 4. Tipografia / contraste
Substituições globais no componente:
- `text-[10px]` → `text-xs` (linhas 1189, 1281, 1285, 1356; impacta deltas de catálogo, "Impacto:", labels de gênero do vizinho).
- `text-[11px]` em parágrafos de conteúdo (não mono-uppercase) → `text-xs`. Manter `text-[11px] font-mono uppercase` nos rótulos de seção (eles funcionam como eyebrow).
- Cor `text-muted-foreground` em corpo de leitura → `text-foreground/75` para WCAG AA.
- Headings de DiagCard mantêm `text-xs font-mono uppercase`.

## 5. Breadcrumb ← Projeto X
No header (linhas 1121-1147), antes de `<h2>{input.name}</h2>`, renderizar breadcrumb usando `@/components/ui/breadcrumb` quando `input.projectId` existir:

```
Projetos / {project.name} / DNA Musical
```

- Resolver nome via `useProjects()` (já importado em outro escopo) — mover hook para o componente `DiagnosisView` ou passar `projects` por prop.
- Click em "Projetos" → `/projects`; click em `{project.name}` → `/projects/{projectId}`.
- Sem `projectId`: breadcrumb não renderiza (mantém comportamento atual para análises avulsas).

## Detalhes técnicos
- Arquivo único: `src/components/music-dna/MusicDNAAnalyzer.tsx`.
- Sem migrations, sem mudança em `useMusicDNA`, sem mudar a edge function.
- `MetricCard` já existe e suporta `target`/`range`; só precisa ser usada.
- `Tabs` (`@/components/ui/tabs`) já existe.
- `Breadcrumb*` (`@/components/ui/breadcrumb`) já existe.
- `useProjects` já é importado no componente raiz; expor `projects` para `DiagnosisView` via prop (mais simples que re-chamar o hook lá dentro).

## Fora de escopo
- Mudanças no schema, na RPC `find_nearest_reference_tracks`, ou na edge function.
- Reescrita da `ExecutiveSummary` (já refeita na rodada anterior).
- i18n PT/EN dos novos textos (segue PT, padrão atual da tela).
