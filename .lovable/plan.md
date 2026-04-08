

# Auditoria de Requisitos — Estado Atual vs. Especificação

## Legenda
- ✅ Implementado
- ⚠️ Parcialmente implementado
- ❌ Não implementado

---

## 1. Landing / Welcome

| Requisito | Status | Observação |
|-----------|--------|------------|
| Proposta de valor ligada a projeto musical | ✅ | |
| CTA para cadastro | ✅ | |
| Credibilidade visual | ✅ | |
| Reduzir destaque DNA Musical / sofisticação | ❌ | DNA Musical e Master Analyzer ainda são destaques principais nos features e nas tabs de preview |
| Aumentar destaque "organize lançamento", "prazos", "equipe e custos" | ❌ | Features atuais focam em BPM/tom/LUFS, não em gestão operacional |
| Cortar termos técnicos da primeira dobra | ❌ | "BPM", "tom", "LUFS", "True Peak", "sidechain" ainda presentes |
| Seção "feito para quem usa WhatsApp e planilha" | ❌ | Não existe |
| Comparação antes vs depois | ❌ | Não existe |
| CTA dupla ("Começar simples" / "Ver versão avançada") | ❌ | Há apenas "Criar conta" e "Google" |

## 2. Auth

| Requisito | Status |
|-----------|--------|
| Login simples | ✅ |
| OAuth Google | ✅ |
| Recuperação de senha | ✅ |
| Após cadastro levar para onboarding | ✅ | Redirect funciona via `needsProfileSetup` |
| Microcopy tranquilizadora ("Começar com 1 projeto", etc.) | ❌ |

## 3. Onboarding

| Requisito | Status | Observação |
|-----------|--------|------------|
| 5 passos: momento, tipo, modo, dificuldade, criar projeto | ✅ | 6 passos (inclui identidade + confirmação) |
| Momento atual (ideia/produzindo/pronta/lançar) | ✅ | |
| Tipo de projeto (single/EP/álbum) | ✅ | |
| Modo simples vs avançado | ✅ | |
| Maior dificuldade (5 opções) | ✅ | |
| Criar primeiro projeto automaticamente | ✅ | |
| Usuário entra direto no projeto | ✅ | Navigate para `/projects/{id}` |

## 4. Dashboard

| Requisito | Status | Observação |
|-----------|--------|------------|
| O que fazer hoje (DailyChecklist) | ✅ | |
| Projeto em risco (ProjectAlertsCard) | ✅ | Alertas com severity critical/warning |
| Próximo lançamento (UpcomingReleases) | ✅ | |
| Financeiro (FinancialSummary) | ✅ | |
| Bloco "travamentos" (parado, convite sem resposta, orçamento) | ✅ | Coberto pelo useProjectAlerts |
| Score simples: organizado/atenção/crítico | ✅ | ProjectHealthList com 3 níveis |
| Bloco "próxima ação recomendada" | ⚠️ | Existe nos chips da IA, mas não como bloco visual dedicado |
| Equipe pendente | ⚠️ | Alertas de convite sem resposta existem, mas não há bloco dedicado |
| Reduzir densidade visual | ⚠️ | Ainda carregado com muitos blocos simultâneos |
| Cortar análises sofisticadas | ⚠️ | IA assistant ainda aparece com destaque visual grande |

## 5. Projects

| Requisito | Status | Observação |
|-----------|--------|------------|
| Listagem de projetos com cards | ✅ | |
| Tipo single/EP/álbum | ✅ | |
| Progresso | ✅ | |
| Filtros por estágio e risco | ❌ | Não há filtros na listagem |
| Destacar projetos travados | ❌ | Sem indicador visual na lista |
| Criação ultra-rápida | ⚠️ | Formulário existe mas não é "ultra-rápido" |
| Status visual (no prazo/parado/aguardando terceiro/falta arquivo/falta lançamento) | ❌ | Não existe na lista de projetos |
| Template de projeto por objetivo | ❌ | |

## 6. ProjectDetail (Hub Central)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Aba Visão Geral (progresso, alertas, equipe) | ✅ | ProjectOverviewTab |
| Aba Tarefas (checklist, por etapa, vencidas, concluídas) | ✅ | ProjectTasksTab com categorias |
| Aba Equipe (membros, papel, status, prazo, contato) | ✅ | ProjectTeamTab completo |
| Aba Arquivos | ⚠️ | Existe mas é placeholder "Em breve" — não funcional |
| Aba Financeiro | ✅ | ProjectFinanceTab |
| Aba Lançamento | ✅ | ProjectReleaseTab com checklist completo |
| Chat da equipe | ✅ | Embutido abaixo das abas para owner |

## 7. Tarefas

| Requisito | Status | Observação |
|-----------|--------|------------|
| Geração automática | ✅ | generate-daily-tasks edge function |
| Regras | ✅ | useTaskRules |
| Deduplicação | ✅ | source_key |
| Tarefas manuais | ✅ | |
| Separar: hoje/semana/vencidas/aguardando | ✅ | categorizeTask no useTasks |
| Filtro por projeto | ⚠️ | Existe no Dashboard (select), não na aba de tarefas |
| Filtro por responsável | ❌ | |
| Botão "resolver agora" | ❌ | |
| Subtarefas por etapa | ❌ | |
| Templates de tarefas | ❌ | |
| IA como "3 travamentos / 2 esquecidas / 1 risco" | ⚠️ | Chips da IA fazem algo similar, mas posicionamento não é esse |

## 8. Profissionais

| Requisito | Status | Observação |
|-----------|--------|------------|
| Cadastro | ✅ | |
| Busca | ✅ | |
| Avaliações | ✅ | professional_ratings |
| Status por projeto (convidado/ativo/atrasado/entregou) | ✅ | ProjectTeamTab com delivery_status |
| Histórico de colaboração | ❌ | |
| Custo médio por profissional | ❌ | |
| Prazo médio de entrega | ❌ | |
| Preferência/favoritos | ❌ | |

## 9. Chat de Projeto

| Requisito | Status |
|-----------|--------|
| Chat contextual dentro do projeto | ✅ |
| Marcar mensagem como pendência | ✅ | is_pending |
| Transformar mensagem em tarefa | ✅ | handleCreateTask |
| Anexar arquivo à conversa | ✅ | attachment upload |
| Filtrar mensagens com ação pendente | ✅ | filterPending |
| Conectar mensagens a tarefa e entrega | ✅ | linked_task_id |

## 10. Financeiro

| Requisito | Status | Observação |
|-----------|--------|------------|
| Receitas/despesas/categorias/KPIs | ✅ | |
| Visão por projeto | ✅ | Filtro por projeto existe |
| Custo por faixa | ❌ | |
| Orçamento previsto vs realizado | ⚠️ | total_contract_value existe mas não há visualização comparativa |
| Alerta de estouro | ✅ | useProjectAlerts detecta >90% |
| Pagamentos pendentes por colaborador | ❌ | |
| Custo por etapa (gravação/mix/master/capa/marketing) | ❌ | Categorias existem mas sem visão por etapa |

## 11. Agenda

| Requisito | Status | Observação |
|-----------|--------|------------|
| Eventos/deadlines/vínculo com projeto | ✅ | |
| Visão "próximos 7 dias" | ❌ | |
| Deadlines de colaboradores | ❌ | |
| Alerta quando evento sem preparação | ❌ | |

## 12. Arquivos (Módulo)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Upload/preview/versão/status | ⚠️ | CollaboratorFilesTab tem upload funcional; ProjectFilesTab do owner é placeholder "Em breve" |
| Estrutura por pastas (composição/gravação/mix/master/capa/docs/divulgação) | ❌ | |
| Comentário/histórico/responsável | ❌ | |

## 13. Lançamento

| Requisito | Status | Observação |
|-----------|--------|------------|
| Checklist de distribuição | ✅ | 6 itens |
| Checklist de metadados | ✅ | 6 itens |
| Checklist de créditos | ✅ | Incluído em metadados |
| Checklist jurídico | ✅ | 4 itens |
| Checklist de conteúdo | ✅ | 6 itens |
| Checklist de plataformas (Spotify/YouTube/TikTok/Instagram) | ✅ | 5 itens |
| Indicadores (pronto distribuir/publicar/pendências) | ✅ | status_final section |

## 14. IA / Music DNA

| Requisito | Status | Observação |
|-----------|--------|------------|
| Tecnologia mantida | ✅ | |
| IA operacional (gestão) | ✅ | AITaskAssistant no dashboard |
| IA analítica (master/DNA) | ✅ | MusicDNA + MasterAnalyzer |
| Separar em 2 camadas (core vs Pro) | ❌ | Ambas acessíveis igualmente |

## 15. Admin

| Requisito | Status | Observação |
|-----------|--------|------------|
| Métricas/custos/logs | ✅ | |
| Tempo até criar primeiro projeto | ⚠️ | Parcial no admin-stats (time-to-first) |
| % que conclui onboarding | ✅ | onboardingCompletion |
| % que conclui primeiro projeto | ✅ | projectLaunchRate |
| Feature mais usada | ✅ | topFeatures |
| Ponto de abandono por tela | ❌ | |
| Projetos criados vs lançados | ⚠️ | Dados existem mas não visualmente comparados |

## 16. Perfil Público

| Requisito | Status | Observação |
|-----------|--------|------------|
| Portfólio/especialidades/avaliações | ✅ | |
| Links de trabalhos por projeto | ❌ | |
| Histórico resumido de entregas | ❌ | |
| CTA para convite | ❌ | |

---

## Resumo Executivo

| Área | ✅ | ⚠️ | ❌ |
|------|-----|------|------|
| Landing | 3 | 0 | 6 |
| Auth | 4 | 0 | 1 |
| Onboarding | 7 | 0 | 0 |
| Dashboard | 5 | 4 | 0 |
| Projects | 3 | 1 | 4 |
| ProjectDetail | 5 | 1 | 0 |
| Tarefas | 5 | 2 | 4 |
| Profissionais | 4 | 0 | 4 |
| Chat | 6 | 0 | 0 |
| Financeiro | 3 | 1 | 3 |
| Agenda | 1 | 0 | 3 |
| Arquivos | 0 | 1 | 2 |
| Lançamento | 6 | 0 | 0 |
| IA/DNA | 3 | 0 | 1 |
| Admin | 4 | 2 | 1 |
| Perfil Público | 1 | 0 | 3 |
| **Total** | **60** | **12** | **32** |

## Lacunas Mais Críticas (impacto direto na proposta de valor)

1. **Landing page** — ainda posiciona o produto como ferramenta técnica, não operacional
2. **Arquivos do owner** — placeholder "Em breve", módulo central não funciona
3. **Projects list** — sem filtros, sem status visual de risco/travamento
4. **Financeiro** — falta visão comparativa orçamento vs realizado e custo por etapa
5. **Agenda** — falta visão de 7 dias e integração com deadlines de equipe

