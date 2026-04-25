# Melhorias de CX — Tela de Projetos (mobile)

## Diagnóstico da tela atual

Olhando o screenshot e o código de `src/pages/Projects.tsx`, a página entrega o básico mas tem fricções claras quando o artista chega aqui no celular:

1. **A ação primária errada está em destaque.** O card mostra um botão roxo grande "Chat" — mas a tarefa #1 do usuário ao tocar num projeto é **abrir o projeto**, não conversar. O chat compete com o próprio card pelo clique.
2. **O card inteiro é clicável, mas não parece.** Não há affordance (chevron, "abrir", hover state visível em mobile). O usuário fica em dúvida se toca no nome ou no botão.
3. **Falta sinal de progresso.** Vejo "Upload (check de áudio)" + "Quase lá", mas não vejo *o quanto* falta. Sem barra de progresso ou próximo passo, o status vira ruído.
4. **Lápis e lixeira ocupam espaço nobre.** Editar e excluir não são ações frequentes — estão sempre visíveis competindo com o que importa.
5. **Filtros pouco usados.** Dois selects "Todos os estágios / Todos os status" ocupam uma linha inteira mesmo quando o usuário tem 1 projeto. Em mobile com 1–3 projetos eles são puro custo visual.
6. **Estado vazio do espaço abaixo.** O usuário com 1 projeto vê uma tela 80% vazia. Oportunidade perdida de sugerir próximo passo (analisar master, agendar gravação, convidar parceiro).
7. **Header sem contexto.** "Projetos" + "+ Novo Projeto" é genérico. Não dá noção de quantos projetos ativos, quantos quase prontos, etc.
8. **FAB de chat global flutuante** (canto inferior direito) sobrepõe a UI e duplica visualmente o botão "Chat" do card — confunde.

---

## Plano de melhorias

### 1. Reorganizar o card de projeto (impacto alto)

Card vira um **bloco navegável** óbvio, com hierarquia clara:

```text
┌─────────────────────────────────────────────┐
│ Herói da Estrada                       ⋮    │  ← menu kebab (editar/excluir)
│ Antonio Barra                               │
│                                             │
│ Upload · check de áudio        ● Quase lá   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  83%             │  ← progresso por estágio
│                                             │
│ Próximo passo: Analisar master       →      │  ← CTA contextual
└─────────────────────────────────────────────┘
```

- Card inteiro clicável → vai para `/projects/:id` (fluxo principal).
- "Chat" deixa de ser botão primário; vira ícone secundário no canto, ou some do card e fica acessível dentro do projeto (já temos "Conversar com a equipe" lá).
- Editar/Excluir ficam atrás de um menu kebab (`⋮`) → reduz ruído, mantém acesso.
- Barra de progresso usa o estágio (`inicio→gravacao→mix→master→upload→lancado` = 6 passos).
- "Próximo passo" muda conforme o estágio (ex.: estágio `master` → "Analisar master"; `upload` → "Configurar lançamento"; `inicio` → "Convidar equipe").

### 2. Header com contexto real

Substituir "Projetos" puro por um sumário de uma linha:

```text
Projetos
2 ativos · 1 quase pronto                      [+ Novo]
```

Botão "+ Novo Projeto" encolhe para "+ Novo" em telas estreitas (já cabe e libera espaço).

### 3. Filtros progressivos

- Esconder a barra de filtros quando o usuário tem **≤ 3 projetos ativos** (não há o que filtrar).
- Quando aparecer, virar **chips horizontais roláveis** em vez de dois selects largos: `Todos · No prazo · Quase lá · Em risco · Parado`. Mais rápido de tocar, mais legível.

### 4. Aproveitar o espaço vazio: "Continue de onde parou"

Abaixo da lista de projetos, um bloco contextual com **1–2 sugestões acionáveis** baseadas no projeto mais avançado:

```text
Continue em Herói da Estrada
┌───────────────────┐ ┌───────────────────┐
│ 🎚 Analisar       │ 📅 Agendar         │
│ master             │ próxima sessão     │
└───────────────────┘ └───────────────────┘
```

Reusa rotas que já existem (`/master-analyzer`, `/agenda?new=1&project=:id`).

### 5. Resolver o conflito do FAB de chat

O botão flutuante roxo no canto inferior duplica o "Chat" do card e atrapalha. Duas opções:

- **A (preferida):** esconder o FAB nas páginas onde já há entrada explícita de chat (Projetos, ProjectDetail). Mantém ele em Dashboard, Finanças, Agenda.
- **B:** mover para canto superior do header, longe da área de polegar onde o usuário está lendo cards.

### 6. Estado de projetos concluídos

A seção colapsada já existe e está OK. Pequeno ajuste: mostrar o contador no header em vez de no botão para o usuário não precisar rolar — ex.: subtítulo do header vira "2 ativos · 5 concluídos".

---

## Detalhes técnicos

- **Arquivo principal:** `src/pages/Projects.tsx` (linhas ~935–1029 — bloco da listagem).
- **Card:** trocar layout `flex justify-between` por estrutura em duas linhas + barra de progresso. Calcular progresso pelo índice em `stages` (`stages.indexOf(project.stage) / 5 * 100`).
- **Próximo passo contextual:** mapa estático `nextStepByStage: Record<Stage, { label, route }>`.
- **Menu kebab:** usar `DropdownMenu` do shadcn (já presente no projeto) com itens Editar/Excluir; remover botões soltos.
- **Header summary:** computar `activeCount`, `quasePromptoCount`, `completedCount` a partir de `projects` + `getProjectStatus`.
- **Filtros condicionais:** `{activeProjects.length > 3 && <FilterChips />}`. Trocar `Select` por `<button>`s estilizados como `Badge` clicáveis com `variant` ativa.
- **Bloco "Continue":** identificar `mostAdvanced = projects.filter(!completed).sort(by stage index desc)[0]`; renderizar 2 cards de atalho (reaproveitar padrão de "Quick Links" já implementado em `ProjectOverviewTab.tsx`).
- **FAB:** localizar componente do chat global flutuante (provavelmente em layout); adicionar prop/condição para esconder em rotas `/projects` e `/projects/:id`.

## Fora de escopo

- Mudanças no fluxo de criação de projeto (wizard).
- Reordenar estágios ou alterar lógica de status.
- Internacionalização das novas strings (mantenho PT, seguindo o que está hoje no arquivo).
