

# Plano de Correção — 10 Pontos de Fricção da Jornada de Editais

## Resumo
Corrigir todos os 10 pontos de fricção identificados no diagnóstico UX, reorganizando a navegação, adicionando labels às ações, conectando o pipeline ao formulário de inscrição, e criando fluxo guiado com "próximos passos".

---

## 1. Navigation Fragmentation — Reduzir abas de 5 para 3

**Problema:** 5 abas + página separada + dialogs sem conexão.

**Solução:**
- Consolidar em 3 abas: **Buscar**, **Meus Editais** (inclui salvos + pipeline como sub-views), **Documentos**
- Mover "Métricas" para um card colapsável dentro de "Meus Editais"
- Adicionar breadcrumb/banner na `EditalInscricao` mostrando: `Editais > {título} > Inscrição`

## 2. Ações sem label no mobile — Adicionar texto aos CTAs

**Problema:** Ícones de 14px sem texto, CTA principal irreconhecível.

**Solução:**
- No card mobile, trocar ícones soltos por botões com label curto
- CTA principal: `Button` com texto "Candidatar" (destaque visual)
- Ações secundárias: manter no `DropdownMenu` com `MoreHorizontal`

## 3. "Iniciar candidatura" sem confirmação — Dialog de confirmação

**Problema:** Cria candidatura silenciosamente sem contexto.

**Solução:**
- Abrir mini-dialog antes de criar: "Iniciar candidatura para {título}?"
- Permitir vincular projeto e adicionar nota inicial
- Após criar, mostrar toast com ação: "Ver no pipeline →"

## 4. Pipeline desconectado — CTA "Preencher inscrição"

**Problema:** Pipeline não tem link para o formulário `/editais/inscricao/:id`.

**Solução:**
- Adicionar botão "Preencher inscrição" nos cards do pipeline (status "preparando")
- No DropdownMenu de todos os status, incluir "Ir para inscrição" que navega para `/editais/inscricao/:edital_id`
- No card de "interesse", CTA primário: "Começar preparação" (move para "preparando" e abre link)

## 5. EditalInscricao como ilha — Integrar contexto

**Problema:** Página `/editais/inscricao/:id` não mostra status da candidatura nem tem links de retorno contextuais.

**Solução:**
- Carregar dados da candidatura (`edital_applications`) se existir para o edital
- Mostrar badge com status atual do pipeline no header
- Botão "Voltar" inteligente: se veio do pipeline, volta com tab correta
- Ao atingir 100%, mostrar CTA: "Marcar como inscrito no pipeline"

## 6. Documentos duplicados — Fonte única

**Problema:** Documentos em 3 lugares sem sincronização.

**Solução:**
- Na `EditalInscricao`, quando `extractedFields.documentos_exigidos` existir, oferecer botão "Criar checklist automático" que popula `edital_application_docs` da candidatura correspondente
- No `ApplicationChecklist`, mostrar link para documentos do banco (`edital_documents`) que podem ser vinculados

## 7. Métricas duplicadas — Consolidar

**Problema:** `MetricasPanel` (editais) e `EditalMetricsDashboard` (candidaturas) sem distinção.

**Solução:**
- Remover tab "Métricas" separada
- Integrar `EditalMetricsDashboard` como seção colapsável no topo de "Meus Editais", abaixo do `MetricasPanel`
- Diferenciar labels: "Editais salvos" vs "Candidaturas ativas"

## 8. Assistente IA desancorado — Contexto automático

**Problema:** FAB abre IA sem saber qual edital/candidatura está ativa.

**Solução:**
- Detectar contexto automaticamente: se tab "Salvos" está ativa e há edital selecionado, passar como contexto
- Se está na `EditalInscricao`, o IA já é inline nos campos — esconder o FAB nessa página
- No pipeline, ao abrir IA, já passar edital_title e application_id (já funciona parcialmente)

## 9. Falta de "próximo passo" — Guidance system

**Problema:** Nenhuma orientação após ações-chave.

**Solução:**
- **Após salvar editais da busca:** Toast com ação "Iniciar candidatura →" para o primeiro edital salvo
- **Após criar candidatura:** Toast com "Ir para inscrição →" que navega para `/editais/inscricao/:id`
- **Ao atingir 100% no formulário:** Banner fixo no topo: "Formulário completo! Marcar como inscrito?"
- **Pipeline vazio:** Empty state com fluxo visual: "1. Busque editais → 2. Salve → 3. Inicie candidatura"

## 10. Tab Documentos sem contexto — Melhorar linkagem

**Problema:** Banco de documentos genérico sem indicar para qual edital serve.

**Solução:**
- Ao salvar um campo do formulário de inscrição no banco (botão "Salvar no banco"), incluir tag `edital_title` no registro
- Na tab Documentos, mostrar tag de origem quando disponível
- No checklist da candidatura, permitir "buscar do banco" com filtro por tipo de documento

---

## Arquivos impactados

| Arquivo | Mudanças |
|---|---|
| `src/pages/Editais.tsx` | Consolidar tabs (3), dialog de confirmação de candidatura, CTAs com label no mobile, guidance toasts, métricas integradas |
| `src/pages/EditalInscricao.tsx` | Header com status da candidatura, breadcrumb, CTA "marcar inscrito", botão criar checklist, esconder FAB |
| `src/hooks/useEditalApplications.ts` | Hook para buscar candidatura por `edital_id` |
| `src/components/editais/ApplicationChecklist.tsx` | Botão "buscar do banco" de documentos |
| `src/components/editais/EditalAIAssistant.tsx` | Receber contexto automático da tab ativa |

## Sem alterações de banco de dados
Todas as tabelas e colunas necessárias já existem.

## Ordem de implementação
1. Consolidar tabs e reorganizar navegação (maior impacto estrutural)
2. Labels nos CTAs mobile + dialog de confirmação
3. Conectar pipeline ao formulário de inscrição
4. Sistema de guidance ("próximos passos")
5. Contexto automático da IA e limpeza de duplicidades

