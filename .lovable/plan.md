## Auditoria da jornada — diagnóstico

Mapeei as 11 rotas principais e como o usuário transita entre elas. A espinha dorsal (Dashboard → Projetos → Detalhe do Projeto → Master Analyzer / Finanças do Projeto) está fluida e bem conectada. Os pontos de fricção estão nos **módulos satélite**, que hoje vivem isolados, sem entrada/saída clara para o resto do sistema.

### Pontos fortes (manter)
- Dashboard com `JourneyFocusCard` personalizado (CTA primário/secundário + IA) e `DailyChecklist` agrupado por origem.
- ProjectDetail como hub real (tabs: visão, tarefas, equipe, arquivos, finanças, release) com botão voltar e atalho de IA contextual.
- Master Analyzer corretamente embutido na etapa de Upload do projeto.
- Editais já cruza com Projetos (botão "Ver projeto recomendado").

### Pontos de fricção identificados

1. **DNA Musical (`/music-dna`)** — página é só um wrapper do analisador. Não tem cabeçalho próprio, breadcrumb, nem CTAs de saída. Quando o usuário termina uma análise, não há ponte para ações naturais ("Gerar capa baseada neste DNA", "Criar tarefas no projeto", "Rodar Track Intelligence"). O link existente para `/criativo?dna=…` está enterrado dentro do componente.

2. **Track Intelligence (`/track-intelligence`)** — lista limpa, mas o módulo não aparece em lugar nenhum a partir de um projeto. Deveria estar acessível a partir do `ProjectDetail` (etapa Release) e do resultado do Master Analyzer.

3. **Criativo (`/criativo`)** — pode ser disparado por DNA e por projeto, mas não tem chamada inversa: ao gerar um asset, não há "Anexar ao projeto" nem "Voltar ao DNA".

4. **Profissionais (`/professionals`)** — nenhuma navegação para projetos. Falta atalho "Ver projetos com este parceiro" e "Adicionar à equipe de…".

5. **Finanças (`/finance`)** — não navega para detalhe do projeto referenciado em uma transação. Já existe `?id=` em Projects, basta usar.

6. **Agenda (`/agenda`)** — eventos vinculados a projeto não levam ao projeto.

7. **Drawer "Mais" no mobile** — 5 ferramentas empilhadas sem hierarquia visual de uso. Sub-labels existem (P2) mas a ordem foi otimizada por frequência sem indicador de "novo/recomendado para você".

8. **Warning de console (técnico)** — `Function components cannot be given refs` em `DailyChecklist`. O `Badge` (componente função) está sendo usado dentro de algum `TooltipTrigger asChild` ou `CollapsibleTrigger asChild` no Dashboard. Preciso confirmar a cadeia exata e converter `Badge` para `forwardRef` (consertar em `src/components/ui/badge.tsx`) — fix simples e benéfico para todo o app.

---

## Plano de ajustes

### 1. DNA Musical — fechar o loop pós-análise
- Adicionar header próprio em `MusicDNA.tsx` (título, subtítulo, link "Ver histórico").
- No bloco de resultado do `MusicDNAAnalyzer`, adicionar barra de **Próximos passos**: 
  - "Gerar capa com este DNA" → `/criativo?dna=…` (já existe, promover)
  - "Analisar prontidão de release" → `/track-intelligence/new?dna=…`
  - "Voltar ao projeto" (quando `projectId` presente) → `/projects/:id`

### 2. Track Intelligence — entradas a partir do projeto
- No `ProjectReleaseTab`, adicionar card "Diagnóstico de prontidão" com CTA → `/track-intelligence/new?projectId=…`.
- No resultado do Master Analyzer (quando aprovado), adicionar botão secundário "Avaliar prontidão de release".
- Pré-popular `track_title`/`genre` em `TrackIntelligenceNew` quando `projectId` vier na URL.

### 3. Criativo — ancorar a contexto
- Quando carregado com `?dna=` ou `?projectId=`, mostrar chip de contexto no topo ("Baseado no DNA: X" / "Para o projeto: Y") com X para limpar.
- Adicionar botão "Anexar ao projeto" no ImagePreview/Lightbox quando houver `projectId` (salva referência em `project_files`).

### 4. Profissionais — atalhos para projetos
- Na linha de cada profissional, adicionar contagem clicável "Em N projetos" → abre modal/drawer com lista linkando para `/projects?id=…`.
- No modal de detalhes, botão "Adicionar a um projeto" → seletor de projeto.

### 5. Finanças e Agenda — deep-link para projeto
- Em `RecentTransactions` e na lista principal de `/finance`, tornar o nome do projeto um link → `/projects?id=…`.
- Em `Agenda`, eventos com `project_id` ganham botão "Abrir projeto".

### 6. Drawer "Mais" mobile — hierarquia
- Manter ordem por frequência, mas adicionar separador visual "Análise" (DNA + Track Intelligence) vs "Operação" (Editais, Profissionais, Criativo).
- Adicionar indicador de uso: ícone discreto quando o módulo nunca foi acessado ("Novo").

### 7. Fix técnico — `Badge` com forwardRef
- Converter `src/components/ui/badge.tsx` para usar `React.forwardRef`.
- Elimina o warning recorrente e habilita uso seguro dentro de `TooltipTrigger asChild`, `CollapsibleTrigger asChild`, etc.

---

## Ordem de implementação sugerida

1. Fix do `Badge` (rápido, melhora console).
2. DNA Musical — header + próximos passos.
3. Track Intelligence — integração com projeto/Master.
4. Deep-links Finanças + Agenda → Projeto.
5. Profissionais — atalhos para projetos.
6. Criativo — chips de contexto + anexar ao projeto.
7. Drawer "Mais" — separadores e indicador "Novo".

Pronto para implementar quando você aprovar. Posso também fatiar em entregas menores — me diz se prefere começar só pelos itens 1–3 (loop pós-análise + fix técnico) ou ir até o final.