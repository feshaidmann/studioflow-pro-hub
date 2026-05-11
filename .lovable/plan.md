# Refatoração do resultado do Music DNA

Aplicar as 10 melhorias levantadas na análise crítica, focando em jornada, hierarquia e densidade de valor. Mudanças concentradas em `src/components/music-dna/MusicDNAAnalyzer.tsx` (arquivo principal do `ResultView`) e ajustes pontuais em sub-componentes.

## Mudanças por bloco

### 1. Reordenar seções do resultado
Nova ordem dentro de `ResultView`:
1. Header + `CompatibilityBadge`
2. `ExecutiveSummary` (já com LUFS Compatibility integrado — ver #3)
3. `NextStepsBar` renomeado (ver #2)
4. Sticky tab nav (atualizada — ver #5)
5. **Pontos fortes + Gargalos** (movidos para cá, antes das ações)
6. **Próximos passos de produção** (`dna-acoes`)
7. **Sugestões de arranjo** (com prioridade — ver #6)
8. **Identidade da Faixa** (`dna-identidade`) — agora secundária
9. **Referências unificadas** (`dna-referencias`, ver #4)
10. **Detalhes técnicos** (Métricas, Perfil, Seções, Timeline)
11. Footer

### 2. Renomear `NextStepsBar`
- Trocar título "Próximos passos" por **"Continuar fluxo"** com ícone `ArrowRight`.
- Elimina conflito com o card real "Próximos passos de produção".

### 3. Promover `LufsCompatibility`
- Remover o componente de dentro de `BenchmarkPanel`.
- Criar card dedicado **"Compatibilidade com plataformas"** logo abaixo do `ExecutiveSummary`, em grid horizontal (Spotify · YouTube · Apple Music) com badge OK/warn/error visível.
- Manter o `BenchmarkPanel` (feature bars + benchmark) apenas dentro da seção Referências.

### 4. Unificar visualizações de "faixas similares"
- Manter apenas a `DiagCard` "Referências mais próximas" com 2 tabs (Catálogo Real + Sugestões IA).
- **Remover** `AcousticMatchPanel` da view do usuário final (continua existindo no código para uso futuro/admin, mas sem render em `ResultView`).
- Disclaimer técnico ("não é fingerprint, MFCC+Chroma…") vira um `Tooltip` num ícone `Info` ao lado do título da tab "Catálogo Real", em vez de banner ocupando espaço.

### 5. Sticky tab nav ampliada
Itens novos: `Resumo`, `Diagnóstico` (engloba Pontos fortes + Gargalos + Ações), `Identidade`, `Referências`, `Técnico` (engloba Métricas, Perfil, Seções, Timeline).

### 6. Prioridade nas `sugestoes_arranjo`
- Heurística client-side simples (sem mudar prompt da IA): primeiras 2 sugestões = "Alta", próximas 2 = "Média", restante = "Baixa". Mantém compatibilidade com diagnósticos antigos.
- Renderizar com o mesmo `PriorityBadge` usado em `proximos_passos`.

### 7. Tab default das referências
- Em `Tabs defaultValue`, calcular: se `topSim < 55` **e** existem `referencias_proximas`, default = `"ia"`. Caso contrário, mantém `"catalogo"`.

### 8. Repensar `persona_ouvinte`
- Esconder o bloco "🎧 Ouvinte" por padrão.
- Substituir por chip "Ver perfil do ouvinte" que abre `Popover` com a persona + sugestão de ação ("Use isso ao escolher hashtags / pitch de playlist").

### 9. Footer reorganizado
- Agrupar visualmente em 2 clusters separados por `Separator` vertical:
  - **Primário:** Salvar análise · Baixar relatório · Criar arte com este DNA
  - **Secundário:** Ajustar análise · Nova análise

### 10. Disclaimer técnico
- Já tratado em #4 (Tooltip).

## Arquivos afetados

- `src/components/music-dna/MusicDNAAnalyzer.tsx`
  - Reordenar JSX do `ResultView`
  - Renomear `NextStepsBar` (título)
  - Mover `LufsCompatibility` para card próprio (criar `PlatformCompatibilityCard` inline)
  - Remover render do `AcousticMatchPanel`
  - Atualizar array de tabs do sticky nav
  - Heurística de prioridade em `sugestoes_arranjo`
  - Cálculo de `defaultValue` da Tab de referências
  - Substituir bloco fixo de persona por `Popover`
  - Reorganizar grupo de botões do footer
  - Tooltip no header da tab "Catálogo Real"
- `src/components/music-dna/LufsCompatibility.tsx` — sem mudanças (ainda usado pelo novo card)
- `src/components/music-dna/AcousticMatchPanel.tsx` — sem mudanças (apenas deixa de ser renderizado em `ResultView`)

## Notas técnicas

- Sem mudança de schema, prompt da IA, hook `useMusicDNA` ou edge functions.
- Sem mudança de design tokens — reutilizar `bg-muted/30`, `text-primary`, `border-primary/30`.
- Manter classes existentes (light mode, macOS minimalist) e ícones Lucide já importados.
- A heurística de prioridade em sugestões é puramente visual; não persiste nada.
- Performance: nenhuma chamada extra; só reordenação e render condicional.

## Riscos

- Diagnósticos antigos salvos continuam funcionando (todos os campos opcionais já têm fallback).
- Usuários que estavam acostumados com a ordem anterior verão Identidade depois das ações — mudança intencional, alinhada à persona "artista produzindo".
