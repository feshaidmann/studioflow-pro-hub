

# Projetos de Parceiro no Dashboard + Tarefas na IA

## Problema
O dashboard mostra apenas projetos próprios (do `ProjectContext`). Projetos em que o usuário é colaborador/parceiro (via convite aceito) não aparecem na lista nem alimentam o assistente IA.

## Solução

### 1. Buscar projetos de parceiro no Dashboard
No `Dashboard.tsx`, adicionar um `useEffect` que chama `supabase.rpc("get_member_projects")` para obter os projetos em que o usuário é colaborador. Armazenar em estado local `guestProjects`.

### 2. Novo card "Projetos como Parceiro" no Dashboard
Criar um componente `GuestProjectsList` (similar ao `ProjectHealthList`) que exibe os projetos de parceiro com badge "Colaborador" e link para `/projects/:id`. Renderizar abaixo do `ProjectHealthList` no Dashboard, visível apenas quando houver projetos de parceiro.

### 3. Buscar tarefas de projetos de parceiro
No Dashboard, após obter os `guestProjects`, buscar tarefas atribuídas ao usuário nesses projetos (via `tasks` table, filtrando por `project_id` IN guestProjects e `assigned_to` = displayName/email ou `user_id` = user.id). Armazenar como `guestTasks`.

### 4. Alimentar a IA com contexto de parceiro
No bloco `context` do `AITaskAssistant`, incluir os projetos de parceiro e suas tarefas junto aos dados existentes. O prompt do assistente já suporta múltiplos projetos — basta adicioná-los ao array `projects` e `activeTasks`.

## Arquivos modificados
- `src/pages/Dashboard.tsx` — fetch de guest projects e tasks, novo card, contexto da IA expandido
- `src/components/dashboard/GuestProjectsList.tsx` — novo componente para listar projetos de parceiro

## Detalhes Técnicos

```text
Dashboard.tsx
├── useEffect → supabase.rpc("get_member_projects") → guestProjects[]
├── useEffect → supabase.from("tasks").select(...)
│     .in("project_id", guestProjectIds)
│     .or(assigned_to/user_id filters)
│     → guestTasks[]
├── <GuestProjectsList projects={guestProjects} />
└── AITaskAssistant context.projects += guestProjects
    AITaskAssistant context.activeTasks += guestTasks
```

O card usará navegação para `/projects/:id` (rota de detalhe que já suporta visão de colaborador). As tarefas de parceiro serão marcadas com o nome do projeto para contexto na IA.

