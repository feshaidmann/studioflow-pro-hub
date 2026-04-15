

# Diagnostico Completo — Friccao, Layout, Jornada e Uso de IA em Todos os Modulos

## Bug detectado durante analise

A aba "Metricas" nos Editais esta **duplicada** (linhas 600-607 em Editais.tsx). Precisa remover a segunda ocorrencia.

---

## 1. DASHBOARD

### Problemas
- **Excesso de informacao sem hierarquia clara.** O dashboard empilha 8+ cards (alertas, checklist, AI, equipe pendente, saude dos projetos, lancamentos, financeiro, transacoes recentes) sem separacao visual por relevancia. O artista nao sabe onde olhar primeiro.
- **AI Assistant colapsavel mas sem call-to-action claro.** O Collapsible "Assistente IA" parece um card generico — nao ha indicacao do que a IA pode fazer ate o usuario expandir e ler.
- **Chips de contexto da IA sao reativos, nao proativos.** Os chips so aparecem quando ja ha problemas. Faltam sugestoes positivas ("Seu projeto X esta quase pronto — que tal revisar o checklist de lancamento?").
- **"Proxima Acao" esta desconectada da IA.** O banner mostra a proxima acao mas nao oferece "Resolver com IA" ou "Me ajude com isso".

### Melhorias propostas
- Conectar o banner "Proxima Acao" ao AI Assistant — clicar no banner envia a acao como prompt pre-formatado para a IA
- Adicionar chip proativo: "Revisao geral" — a IA analisa todos os projetos e sugere prioridades do dia
- Reduzir cards visiveis por padrao: agrupar "Equipe pendente + Alertas" num unico card com tabs internas
- Adicionar skeleton loading nos cards em vez de bloco "Carregando..."

---

## 2. PROJETOS (Lista + Detalhe)

### Problemas
- **Arquivo monolito** — Projects.tsx tem 1163 linhas com wizard de equipe, modais de pagamento, convites e filtros. Isso causa lentidao de desenvolvimento e bugs.
- **Wizard de equipe complexo** — O fluxo new/existing + tipo profissional + proposta + pagamento tem muitos passos sem indicacao de progresso.
- **Sem IA no projeto.** Nao ha assistente contextual no detalhe do projeto. O artista precisa voltar ao Dashboard para usar a IA geral.
- **ProjectDetail tem 7 tabs (Overview, Equipe, Chat, Tarefas, Financeiro, Release, Arquivos)** — sem hierarquia de importancia. Na mobile sao dificeis de navegar.
- **Nenhuma sugestao inteligente.** O Overview mostra dados mas nao sugere acoes ("Mix esta em 55% — falta stem de guitarra do Joao").

### Melhorias propostas
- Adicionar botao "Assistente IA" no ProjectDetail (FAB ou header) que abre um Sheet contextual pre-populado com dados do projeto (estagio, equipe, tarefas, financeiro)
- Na OverviewTab, adicionar secao "Sugestoes IA" que analisa automaticamente o estado do projeto e mostra 2-3 acoes concretas
- No wizard de equipe, adicionar barra de progresso visual (3 steps: Tipo → Contato → Proposta)
- Agrupar tabs em ProjectDetail: "Producao" (Overview+Tarefas+Release) e "Gestao" (Equipe+Financeiro+Arquivos+Chat)

---

## 3. FINANCEIRO

### Problemas
- **Sem IA.** E o modulo mais numerico e que mais se beneficiaria de analise por IA ("Suas despesas com musicos subiram 40% — quer que eu compare com o mercado?").
- **Sem previsoes.** Mostra dados historicos mas nao projeta futuro (burn rate, quando o orcamento vai acabar).
- **Filtros basicos.** So filtra por projeto e periodo. Falta filtro por categoria, por status (pago/pendente).
- **Tabela de transacoes sem acoes em lote.** Nao da para marcar varias como pagas de uma vez.

### Melhorias propostas
- Adicionar FAB "Assistente IA" que analisa padroes financeiros, sugere cortes, projeta break-even
- Adicionar card "Previsao" com burn rate e data estimada de esgotamento do orcamento do projeto
- Filtro por categoria e status pago/pendente
- Acao "Marcar como pago" em lote na tabela

---

## 4. AGENDA

### Problemas
- **Sem IA.** A agenda nao sugere horarios, nao detecta padroes ("Voce sempre marca ensaio na quarta — quer criar um evento recorrente?").
- **Sem visao de calendario.** E uma lista cronologica — falta a visao mensal/semanal classica.
- **Deadlines de equipe isolados.** Os prazos de entrega de colaboradores aparecem num card separado sem integracao visual com os eventos.
- **Sem eventos recorrentes.** O artista precisa criar cada ensaio individualmente.

### Melhorias propostas
- Adicionar IA contextual: "Crie evento" com sugestao inteligente de horario baseada em conflitos
- Implementar visao de calendario mensal (grid) como alternativa a lista
- Unificar deadlines de equipe na timeline de eventos com badge visual distinto
- Suporte a eventos recorrentes (semanal/quinzenal/mensal)

---

## 5. DNA MUSICAL

### Problemas
- **IA somente via edge function de analise** — nao ha chat ou sugestoes interativas apos a analise.
- **Resultado estatico.** Apos a analise, o usuario ve o radar chart e o diagnostico, mas nao pode perguntar "O que devo melhorar primeiro?" ou "Compare com referencia X".
- **Sem ponte com projetos.** A analise nao esta vinculada a nenhum projeto — o artista precisa manualmente "converter em tarefa".
- **Formulario de upload pesado.** Exige selecao de genero e referencias ANTES do upload — friccao alta.

### Melhorias propostas
- Adicionar chat pos-analise: "Pergunte sobre sua mix" — IA conversa sobre o diagnostico com contexto dos dados tecnicos
- Simplificar formulario: upload primeiro, genero/referencias opcionais (a IA pode inferir)
- Vincular analise a projeto: ao abrir DNA Musical, pre-selecionar o projeto ativo
- Botao "Criar tarefas a partir do diagnostico" com pre-selecao inteligente das sugestoes mais impactantes

---

## 6. PARCEIROS/PROFISSIONAIS

### Problemas
- **Sem IA.** Nao ha recomendacao de profissionais ("Para seu projeto de Forro, recomendo um sanfoneiro — voce ja trabalhou com o Joao").
- **Metricas basicas.** Mostra contagem de projetos e nota media, mas nao compara nem destaca profissionais ideais para o proximo projeto.
- **Sem integracao direta com projetos.** Para adicionar um profissional a um projeto, o usuario precisa ir ate Projetos → Equipe → Wizard. Deveria ser possivel direto da ficha do profissional.

### Melhorias propostas
- Adicionar "Recomendar para projeto" na ficha do profissional — lista projetos sem aquela especialidade
- Adicionar IA: "Sugerir equipe ideal" para um projeto — analisa historico e sugere combinacao
- Botao "Adicionar ao projeto X" direto na ficha do profissional

---

## 7. CONFIGURACOES

### Problemas
- **Regras de tarefas automaticas sao obscuras.** Os sliders e switches nao explicam o impacto real de cada regra.
- **Demo data e gerado sem feedback.** Clicar em "Gerar dados" nao mostra progresso nem resultado.

### Melhorias (menor prioridade)
- Tooltip com exemplo concreto em cada regra de tarefa
- Progress bar ao gerar dados demo

---

## 8. EDITAIS (pos-redesign)

### Bug
- Tab "Metricas" duplicada — remover a segunda ocorrencia

### Melhorias residuais
- O FAB de IA poderia ter tooltip "Assistente IA" ao hover
- A busca de editais poderia ter "Buscar editais para meu projeto" — pre-filtra por area do projeto ativo

---

## Resumo — Priorizacao por impacto

| Prioridade | Modulo | Melhoria principal |
|---|---|---|
| 1 | Projetos | IA contextual no ProjectDetail + sugestoes no Overview |
| 2 | Dashboard | Conectar "Proxima Acao" a IA + chips proativos |
| 3 | Financeiro | IA de analise financeira + previsao de burn rate |
| 4 | DNA Musical | Chat pos-analise + simplificar upload |
| 5 | Editais | Fix tab duplicada |
| 6 | Parceiros | Recomendacao IA + "Adicionar ao projeto" direto |
| 7 | Agenda | Visao calendario + IA de sugestao |
| 8 | Config | Tooltips nas regras |

---

## Detalhes tecnicos

### Arquivos impactados
- `src/pages/Dashboard.tsx` — conectar banner ao AI, chips proativos
- `src/pages/ProjectDetail.tsx` — FAB de IA contextual, Sheet com AIAssistant
- `src/components/project-hub/ProjectOverviewTab.tsx` — secao "Sugestoes IA"
- `src/pages/FinancialTracker.tsx` — FAB de IA financeira, card de previsao
- `src/components/music-dna/MusicDNAAnalyzer.tsx` — chat pos-analise, vinculo com projeto
- `src/pages/Professionals.tsx` — botao "Adicionar ao projeto", recomendacao IA
- `src/pages/Editais.tsx` — fix tab duplicada
- `src/pages/Agenda.tsx` — IA contextual (futuro)
- Edge functions novas: `project-ai-assistant` (contexto de projeto), `finance-ai-assistant` (analise financeira)

### Nenhuma alteracao de banco necessaria para a maioria — os dados ja existem nas tabelas atuais. As edge functions usam o Lovable AI Gateway existente.

Deseja que eu implemente por prioridade, comecando pela correcao do bug e pela IA contextual nos Projetos?

