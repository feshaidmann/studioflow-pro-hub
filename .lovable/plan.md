

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
| Reduzir destaque DNA Musical / sofisticação | ✅ | Features reposicionadas para gestão operacional |
| Aumentar destaque "organize lançamento", "prazos", "equipe e custos" | ✅ | Top features: lançamento, prazos, equipe |
| Cortar termos técnicos da primeira dobra | ✅ | Sem BPM/LUFS na landing |
| Seção "feito para quem usa WhatsApp e planilha" | ✅ | Seção dedicada com ícone Shield |
| Comparação antes vs depois | ✅ | 5 itens de comparação |
| CTA dupla ("Começar simples" / "Ver versão avançada") | ✅ | "Começar simples" + Google |

## 2. Auth

| Requisito | Status |
|-----------|--------|
| Login simples | ✅ |
| OAuth Google | ✅ |
| Recuperação de senha | ✅ |
| Após cadastro levar para onboarding | ✅ |
| Microcopy tranquilizadora | ✅ | Login: "Dados seguros", Signup: "Começar com 1 projeto" |

## 3. Onboarding

| Requisito | Status |
|-----------|--------|
| 5 passos: momento, tipo, modo, dificuldade, criar projeto | ✅ |
| Momento atual | ✅ |
| Tipo de projeto | ✅ |
| Modo simples vs avançado | ✅ |
| Maior dificuldade | ✅ |
| Criar primeiro projeto automaticamente | ✅ |
| Usuário entra direto no projeto | ✅ |

## 4. Dashboard

| Requisito | Status | Observação |
|-----------|--------|------------|
| O que fazer hoje (DailyChecklist) | ✅ | Com filtro por projeto e fonte |
| Projeto em risco (ProjectAlertsCard) | ✅ | Com botão "Resolver" contextual |
| Próximo lançamento | ✅ | |
| Financeiro | ✅ | |
| Bloco "travamentos" | ✅ | |
| Score simples: organizado/atenção/crítico | ✅ | |
| Bloco "próxima ação recomendada" | ✅ | Banner dedicado no topo |
| Equipe pendente | ✅ | PendingTeamCard dedicado |
| IA com destaque reduzido | ✅ | Borda neutra, título compact |

## 5. Projects

| Requisito | Status | Observação |
|-----------|--------|------------|
| Listagem com cards | ✅ | |
| Tipo single/EP/álbum | ✅ | |
| Progresso | ✅ | |
| Filtros por estágio e risco | ✅ | Implementado |
| Destacar projetos travados | ✅ | Badge visual de status |
| Status visual | ✅ | No prazo/parado/risco orçamento |
| Criação ultra-rápida | ⚠️ | Formulário existe |
| Template de projeto por objetivo | ❌ | |

## 6. ProjectDetail (Hub Central)

| Requisito | Status |
|-----------|--------|
| Aba Visão Geral | ✅ |
| Aba Tarefas | ✅ |
| Aba Equipe | ✅ |
| Aba Arquivos | ✅ | Funcional com 9 pastas, upload, status |
| Aba Financeiro | ✅ | Com orçamento vs realizado e custo por etapa |
| Aba Lançamento | ✅ |
| Chat da equipe | ✅ |

## 7. Tarefas

| Requisito | Status | Observação |
|-----------|--------|------------|
| Geração automática | ✅ | |
| Regras | ✅ | |
| Deduplicação | ✅ | |
| Tarefas manuais | ✅ | |
| Separar: hoje/semana/vencidas/aguardando | ✅ | |
| Filtro por projeto | ✅ | No DailyChecklist |
| Filtro por responsável | ✅ | No DailyChecklist, select de assignee |
| Botão "resolver agora" | ✅ | Nos alertas, navega ao tab correto |
| Subtarefas por etapa | ❌ | |
| Templates de tarefas | ❌ | |

## 8. Profissionais

| Requisito | Status | Observação |
|-----------|--------|------------|
| Cadastro | ✅ | |
| Busca | ✅ | |
| Avaliações | ✅ | |
| Status por projeto | ✅ | |
| Histórico de colaboração | ✅ | Modal de detalhes com projetos, role, cachê, status |
| Custo médio por profissional | ✅ | Cachê médio no modal |
| Prazo médio de entrega | ✅ | Prazo médio no modal |
| Preferência/favoritos | ❌ | |

## 9. Chat de Projeto

| Requisito | Status |
|-----------|--------|
| Chat contextual dentro do projeto | ✅ |
| Marcar mensagem como pendência | ✅ |
| Transformar mensagem em tarefa | ✅ |
| Anexar arquivo à conversa | ✅ |
| Filtrar mensagens com ação pendente | ✅ |
| Conectar mensagens a tarefa e entrega | ✅ |

## 10. Financeiro

| Requisito | Status | Observação |
|-----------|--------|------------|
| Receitas/despesas/categorias/KPIs | ✅ | |
| Visão por projeto | ✅ | |
| Orçamento previsto vs realizado | ✅ | Na aba financeira do projeto |
| Custo por etapa | ✅ | Na aba financeira do projeto |
| Alerta de estouro | ✅ | |
| Pagamentos pendentes por colaborador | ✅ | Card dedicado no financeiro global |
| Custo por faixa | ❌ | |

## 11. Agenda

| Requisito | Status | Observação |
|-----------|--------|------------|
| Eventos/deadlines/vínculo com projeto | ✅ | |
| Visão "próximos 7 dias" | ✅ | Padrão da página |
| Deadlines de colaboradores | ✅ | Seção "Prazos da equipe" |
| Alerta quando evento sem preparação | ❌ | |

## 12. Arquivos (Módulo)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Upload/preview/versão/status | ✅ | Funcional com 9 pastas |
| Estrutura por pastas | ✅ | Composição, gravação, stems, mix, master, capa, vídeos, divulgação, documentos |
| Comentário/histórico/responsável | ⚠️ | Responsável exibido, sem comentários |

## 13. Lançamento

| Requisito | Status |
|-----------|--------|
| Checklist de distribuição | ✅ |
| Checklist de metadados | ✅ |
| Checklist de créditos | ✅ |
| Checklist jurídico | ✅ |
| Checklist de conteúdo | ✅ |
| Checklist de plataformas | ✅ |
| Indicadores (pronto/pendências) | ✅ |

## 14. IA / Music DNA

| Requisito | Status |
|-----------|--------|
| Tecnologia mantida | ✅ |
| IA operacional (gestão) | ✅ |
| IA analítica (master/DNA) | ✅ |
| Separar em 2 camadas (core vs Pro) | ❌ |

## 15. Admin

| Requisito | Status |
|-----------|--------|
| Métricas/custos/logs | ✅ |
| Tempo até criar primeiro projeto | ⚠️ |
| % que conclui onboarding | ✅ |
| % que conclui primeiro projeto | ✅ |
| Feature mais usada | ✅ |
| Ponto de abandono por tela | ❌ |
| Projetos criados vs lançados | ⚠️ |

## 16. Perfil Público

| Requisito | Status | Observação |
|-----------|--------|------------|
| Portfólio/especialidades/avaliações | ✅ | |
| CTA para convite | ✅ | Botão "Convidar para projeto" |
| Links de trabalhos por projeto | ❌ | |
| Histórico resumido de entregas | ❌ | |

---

## Resumo Executivo

| Área | ✅ | ⚠️ | ❌ |
|------|-----|------|------|
| Landing | 9 | 0 | 0 |
| Auth | 5 | 0 | 0 |
| Onboarding | 7 | 0 | 0 |
| Dashboard | 9 | 0 | 0 |
| Projects | 6 | 1 | 1 |
| ProjectDetail | 7 | 0 | 0 |
| Tarefas | 8 | 0 | 3 |
| Profissionais | 7 | 0 | 1 |
| Chat | 6 | 0 | 0 |
| Financeiro | 6 | 0 | 1 |
| Agenda | 3 | 0 | 1 |
| Arquivos | 2 | 1 | 0 |
| Lançamento | 7 | 0 | 0 |
| IA/DNA | 3 | 0 | 1 |
| Admin | 4 | 2 | 1 |
| Perfil Público | 2 | 0 | 2 |
| **Total** | **91** | **4** | **11** |

## Itens Restantes (baixa prioridade)

1. Projects: Template de projeto por objetivo
2. Tarefas: Filtro por responsável, subtarefas, templates
3. Profissionais: Favoritos
4. Financeiro: Custo por faixa
5. Agenda: Alerta de evento sem preparação
6. Arquivos: Comentários em arquivos
7. IA: Separar core vs Pro
8. Admin: Ponto de abandono, projetos criados vs lançados
9. Perfil Público: Links de trabalhos, histórico de entregas
