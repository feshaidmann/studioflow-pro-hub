
## Objetivo

Completar 6 lacunas na jornada do artista em `/palcos` sem alterar `Editais`, RLS, autenticação ou outros módulos. Todas as alterações ficam em **`src/pages/Palcos.tsx`** (1 arquivo).

---

## Alterações em `src/pages/Palcos.tsx`

### 1. Imports adicionais
- `useEditalApplications`, `useUpdateApplication`, `useDeleteApplication`, `APPLICATION_STATUS_LABELS`, `APPLICATION_STATUS_COLORS`, `ApplicationStatus`, `EditalApplication` de `@/hooks/useEditalApplications`
- `ApplicationChecklist` (default) de `@/components/editais/ApplicationChecklist`
- `EditalResultModal` (default) de `@/components/editais/EditalResultModal`
- `useTasks` de `@/hooks/useTasks` (usar `ensureAutoTask` que já faz upsert por `source_key` — não existe `addUniqueTask`)
- `DropdownMenu*` de `@/components/ui/dropdown-menu`
- Icons: `MoreHorizontal`, `Trophy`, `Trash2`

### 2. Estado novo no componente `Palcos`
- `activeTab` (default `"descobrir"`) para controlar `<Tabs value/onValueChange>`
- `selectedAppId`, `resultAppId` para sheets de checklist e resultado
- `palcoApplications` filtrando `tipo === "palco"` e `applicationByEditalId` (Map) para lookup nos cards
- `useEditalApplications`, `useUpdateApplication`, `useDeleteApplication`, `useTasks().ensureAutoTask`

### 3. Quarta aba "Minhas Candidaturas"
- Novo `<TabsTrigger value="candidaturas">` com badge de contagem
- Novo `<TabsContent value="candidaturas">` que renderiza vazio ou `PalcoPipelineView` com 4 colunas (interesse → preparando → inscrito → resultado), responsivo desktop/mobile
- Componentes auxiliares `PalcoPipelineView` e `PalcoPipelineCard` declarados no topo do arquivo, com dropdown de mover status, abrir checklist, registrar resultado, abrir link e remover

### 4. `PalcoCard` — badge "Acompanhando" + CTA condicional
- Adicionar props `existingApplication?: EditalApplication | null` e `onViewCandidatura?: (app) => void`
- Renderizar badge de status quando há candidatura
- Substituir botão "Candidatar" por "Ver status" quando já existe candidatura, navegando via `setActiveTab("candidaturas")`
- Passar essas props nos 3 locais onde `PalcoCard` é renderizado (descobrir, buscar, recomendações)

### 5. `StartCandidaturaDialog` — campo de data
- Novo state `dataInscricao` (input `type="date"`, opcional)
- Atualizar interface de `onConfirm` com `data_inscricao?: string`
- Passar `data_inscricao` no `onConfirm`
- Limpar state ao fechar

### 6. `handleConfirmCandidatura` — checklist + tarefa + toast novo
- Constante `PALCO_CHECKLIST_TEMPLATES` mapeando `TipoPalco` → lista de docs (festival, showcase, circuito, residencia, abertura)
- Passar `data_inscricao` no `createApplication.mutate`
- No `onSuccess`:
  - Inserir docs em `edital_application_docs` baseado no `tipo_palco` do `candidaturaTarget` (com `user_id` da sessão atual)
  - Se `params.project_id` existir, chamar `ensureAutoTask({ key: "palco:<edital_id>:<project_id>", description: "Preparar candidatura para <nome>[ — prazo dd/mm/aaaa]", source: "palco_candidatura", sourceModule: "palcos", taskArea: "lancamento", severity: prazo ? "high" : "medium", projectId, dueDate: prazo })`
  - Toast com action "Ver candidaturas →" que faz `setActiveTab("candidaturas")` (substitui o `navigate("/editais?tab=meus")`)

### 7. Sheets/modais ao final do JSX
- `<Sheet>` com `ApplicationChecklist applicationId={selectedAppId} projects={projectList}` (ApplicationChecklist atual usa `projectId` — passar `undefined`, basta `projects`)
- `EditalResultModal application={app} open onOpenChange` — buscar a `application` via `palcoApplications.find(a => a.id === resultAppId)` (o componente espera o objeto completo, não só o id)

---

## Notas técnicas

- O hook `useTasks` expõe `ensureAutoTask` (não `addUniqueTask`) — já faz `upsert` em `tasks` com `onConflict: user_id,source_key, ignoreDuplicates: true`. Perfeito para deduplicar.
- `EditalResultModal` recebe `application: EditalApplication` (não `applicationId`). Plano usa o objeto, divergindo do prompt original.
- `ApplicationChecklist` é `default export` — importar como `import ApplicationChecklist from "..."`.
- `useCreateApplication` atual NÃO aceita `data_inscricao`. Para incluir, ampliar o `mutationFn` em `src/hooks/useEditalApplications.ts` adicionando `data_inscricao?: string | null` ao `params` e ao `insert`. Mudança mínima e isolada.
- O toast de sucesso global de `useCreateApplication` (`"Candidatura iniciada"`) continua existindo — o toast extra de `Palcos.tsx` complementa com a action de navegação. Aceitável.
- Sem novas migrations: `data_inscricao`, `auto_generated`, `source_key`, `task_area`, `source_module`, `severity` já existem.
- Todas as 4 abas continuam responsivas, scroll horizontal preservado.

---

## Arquivos tocados

```text
src/pages/Palcos.tsx                  (alterações principais)
src/hooks/useEditalApplications.ts    (+ data_inscricao no useCreateApplication)
```

## O que NÃO muda

- `Editais.tsx`, `PipelineTab`, view `palcos_pipeline`, RLS, dark mode, i18n, `/studio`, lógica de busca IA, schema de `palcos_curados`.
