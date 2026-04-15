

# Melhorias Adicionais para a Jornada de Editais

Após as 10 correções já implementadas, identifico 7 oportunidades de evolução que aumentariam conversão e retenção.

---

## 1. Alertas de prazo inteligentes

**Problema:** Editais vencem silenciosamente. O artista só descobre que perdeu o prazo ao revisitar a lista.

**Solução:**
- Na carga da página e no Dashboard, verificar editais com prazo nos próximos 3/7 dias
- Mostrar banner de urgência no topo de "Meus Editais" com contagem regressiva
- Criar notificação automática (tabela `notifications`) quando o prazo estiver a 3 dias
- Badge visual vermelho nos cards de editais prestes a vencer

**Arquivos:** `src/pages/Editais.tsx`, `src/pages/Dashboard.tsx`, `src/hooks/useEditais.ts`

---

## 2. Histórico e aprendizado por resultado

**Problema:** A tab "Resultado" registra aprovação/reprovação mas não gera nenhum insight. O campo `licoes_aprendidas` é opcional e não é reutilizado.

**Solução:**
- Após registrar resultado, exibir prompt: "O que funcionou?" / "O que melhorar?"
- Na aba Meus Editais, mostrar card de resumo: taxa de aprovação, valor total aprovado, principais motivos de recusa
- Quando a IA gerar textos para novas candidaturas, passar lições aprendidas de editais anteriores como contexto

**Arquivos:** `src/components/editais/EditalResultModal.tsx`, `src/pages/Editais.tsx`, `supabase/functions/edital-ai-assistant/index.ts`

---

## 3. Templates de candidatura reutilizáveis

**Problema:** Cada inscrição começa do zero. Campos como "resumo do projeto", "currículo artístico", "justificativa" são reescritos a cada edital.

**Solução:**
- Ao salvar rascunho, oferecer "Salvar como template" para campos genéricos (que não mencionam o nome do edital)
- No `EditalInscricao`, ao preencher um campo vazio, mostrar sugestão "Usar resposta de {edital anterior}" se existir texto similar no banco de documentos
- Integrar com `edital_documents` existente, adicionando filtro por `doc_type` como "template_campo"

**Arquivos:** `src/pages/EditalInscricao.tsx`, `src/components/editais/EditalDocumentsBank.tsx`

---

## 4. Comparador de editais

**Problema:** Artista com 10+ editais salvos não consegue comparar rapidamente qual priorizar (valor, prazo, compatibilidade).

**Solução:**
- Adicionar checkbox de seleção nos cards de editais salvos
- Botão "Comparar selecionados" que abre um dialog lado a lado com: valor, prazo, área, público-alvo, score de compatibilidade
- Máximo de 3 editais por comparação

**Arquivos:** `src/pages/Editais.tsx` (novo componente `EditalCompareDialog`)

---

## 5. Onboarding contextual da jornada

**Problema:** Artista novo não entende a relação entre Buscar → Salvar → Candidatar → Inscrição. Os empty states ajudam mas não conectam a jornada completa.

**Solução:**
- Na primeira visita à aba Editais (sem editais salvos nem candidaturas), exibir um mini-walkthrough visual em 4 passos com ilustração simplificada
- Usar `localStorage` para controlar se já foi visto
- Incluir link direto para o Tutorial existente

**Arquivos:** `src/pages/Editais.tsx`

---

## 6. Filtro por prazo e valor nos editais salvos

**Problema:** A lista de editais salvos só filtra por status. Artistas precisam filtrar por "vencendo esta semana" ou "acima de R$ 50k".

**Solução:**
- Adicionar filtros rápidos: "Próximos 7 dias", "Próximos 30 dias", "Com valor"
- Implementar como chips adicionais ao lado dos filtros de status existentes
- Ordenação por valor (quando numérico) e por prazo

**Arquivos:** `src/pages/Editais.tsx`

---

## 7. Progresso global visível no Dashboard

**Problema:** O Dashboard não mostra nada sobre editais. Artista precisa navegar até Editais para saber quantas candidaturas tem ativas.

**Solução:**
- Criar card "Editais em andamento" no Dashboard com: total de candidaturas por status, próximo prazo, e link direto para o pipeline
- Reutilizar dados de `useEditalApplications`

**Arquivos:** `src/pages/Dashboard.tsx`

---

## Sem migrações de banco de dados
Todas as funcionalidades usam tabelas existentes (`editais`, `edital_applications`, `notifications`, `edital_documents`).

## Priorização sugerida
1. **Alertas de prazo** (impacto direto em perda de oportunidades)
2. **Progresso no Dashboard** (visibilidade sem navegar)
3. **Filtros por prazo/valor** (eficiência na triagem)
4. **Templates reutilizáveis** (reduz tempo por inscrição)
5. **Histórico com aprendizado** (melhoria contínua)
6. **Comparador** (decisão informada)
7. **Onboarding contextual** (reduz abandono inicial)

