## Diagnóstico de CX — rodada 2

Após a primeira leva de melhorias (loop pós-DNA, Track Intelligence integrado ao projeto, deep-links Finanças→Projeto e Agenda→Projeto, chip de contexto Criativo, fix do Badge), reauditei a jornada. A espinha dorsal está sólida. Restam **5 pontos de fricção**, todos pequenos, que ainda quebram a continuidade.

### O que já está bom
- Dashboard → Projeto → Detalhe → Master Analyzer → DNA → Track Intelligence está conectado bidirecionalmente.
- `RecentTransactions` e `EventCard` já navegam para `/projects/:id`.
- `ProjectReleaseTab` exibe `ReadinessCard` com CTA para Track Intelligence.
- Criativo tem chip de contexto com "Voltar ao projeto" e clear.
- Drawer "Mais" mobile já tem grupos com sub-labels.

### Lacunas remanescentes

**1. Página Finanças (`/finance`) — tabela principal de transações sem deep-link**
Só `RecentTransactions` (Dashboard) navega para o projeto. Na própria página de Finanças, a coluna "Projeto" da tabela não é clicável. Quem está revisando lançamentos não consegue pular direto para o projeto.

**2. Profissionais (`/professionals`) — sem ponte para projetos**
A célula "Em N projetos" mostra badges com nomes mas não leva a lugar nenhum. No modal de detalhes existe histórico de projetos do profissional, mas também sem link clicável. Usuário fica preso.

**3. Master Analyzer — ausência de link reverso ao DNA salvo**
Quando o Master Analyzer termina e salva uma análise em `music_dna_analyses`, o modal mostra os scores e o CTA para Track Intelligence (já feito), mas não oferece "Ver análise completa no DNA Musical". Isso quebra a sensação de que é o mesmo motor.

**4. Editais (`/editais`) — saída para projeto recomendado existe, mas sem entrada**
A partir de um projeto, não há atalho para "Buscar editais para este projeto". Dado que o match já filtra por perfil cultural, faria sentido um botão no `ProjectOverviewTab` ou no `ProjectAISheet`.

**5. Agenda — criar evento a partir do projeto**
Em `ProjectDetail` não há "Agendar evento para este projeto". O usuário precisa ir até `/agenda` e selecionar manualmente o projeto no formulário. É o oposto do fluxo natural.

### Pontos de UX visual / micro-fricção
- **Drawer "Mais" mobile**: grupos existem, mas não há indicador "Novo" ou destaque visual para módulos nunca acessados (recomendação anterior não implementada — ainda vale).
- **Track Intelligence**: lista de análises antigas (`/track-intelligence`) não filtra por projeto, e não há badge visual indicando a qual projeto cada análise pertence.

---

## Plano de ajustes (rodada 2)

### Prioridade 1 — fechar loops de navegação (alto impacto, baixo custo)

1. **Tabela de Finanças clicável**
   - Em `src/pages/FinancialTracker.tsx`, na coluna Projeto da tabela de transações, transformar o nome em `<Link to={`/projects/${projectId}`}>` quando houver `project_id`.

2. **Profissionais → Projetos**
   - Em `src/pages/Professionals.tsx`, tornar cada badge de projeto na coluna "Em projeto" um link para `/projects/:id`.
   - No modal de detalhes (histórico), tornar `project_name` clicável também.

3. **Master Analyzer Modal — link para DNA salvo**
   - Em `src/components/MasterAnalyzerModal.tsx`, na tela de sucesso, adicionar botão secundário "Ver análise completa" → `/music-dna?analysis=:id` (ou rota equivalente já existente na página DNA para abrir uma análise específica).

4. **Editais a partir do projeto**
   - Em `src/components/project-hub/ProjectOverviewTab.tsx`, adicionar card discreto "Buscar editais compatíveis" → `/editais?project=:id` (a página Editais já recebe esse param para destacar o projeto).

5. **Agendar evento a partir do projeto**
   - Em `ProjectOverviewTab` (ou Release tab), botão "Adicionar à agenda" → `/agenda?new=1&project=:id` que abre o formulário pré-populado.

### Prioridade 2 — refino fino

6. **Track Intelligence — badge de projeto na lista**
   - Em `src/pages/TrackIntelligence.tsx`, mostrar nome do projeto vinculado em cada item da lista (já existe `project_id` na tabela).
   - Filtro opcional "Por projeto" no header.

7. **Drawer "Mais" — indicador "Novo"**
   - Em `AppLayout.tsx`, marcar com badge discreto "Novo" itens que o usuário nunca acessou (consultar `page_views` ou usar `localStorage` para tracking client-side simples).

---

## Detalhes técnicos

- **Padrão de URL**: continuar com `/projects/:id` (não `?id=`), que é o que já está em uso no `ProjectDetail.tsx`.
- **Rota DNA com análise específica**: verificar se `/music-dna` já aceita `?analysis=:id` para abrir a vista detalhada; se não, adicionar esse comportamento em `MusicDNAAnalyzer.tsx` lendo `searchParams.get("analysis")`.
- **Pré-popular Agenda**: o `EventForm` já lê `project_id` do estado; só falta adicionar leitura de `searchParams` no mount de `Agenda.tsx` e abrir o dialog automaticamente quando `?new=1`.
- **Indicador "Novo" no drawer**: usar `localStorage` com chave `sfp_visited_routes` (Set serializado) para evitar query no banco a cada render.

---

## Ordem de implementação sugerida

1. Itens 1, 2, 3 (deep-links — 1 commit).
2. Itens 4, 5 (entradas a partir do projeto — 1 commit).
3. Itens 6, 7 (refino — 1 commit, opcional).

Posso fazer tudo em uma só leva, ou começar só pela Prioridade 1 (itens 1–5) que é onde está o impacto real. Me diz como prefere.
