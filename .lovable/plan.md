
## Plano: CX 10/10 para onboarding e jornada personalizada

Vou transformar o onboarding de uma configuração inicial simples em uma experiência que entrega valor imediatamente: o usuário responde algumas perguntas e vê, logo depois, um StudioFlow claramente adaptado ao momento, dor principal e tipo de projeto dele.

## Objetivo

Fazer com que o artista sinta:

- “O app entendeu meu momento.”
- “Meu primeiro projeto já nasceu com estrutura útil.”
- “O dashboard está priorizando o que importa para mim.”
- “A IA sabe meu contexto sem eu precisar explicar tudo de novo.”
- “As tarefas iniciais fazem sentido com o que eu preenchi.”

## 1. Melhorar o onboarding em si

### Ajustes de experiência

No `src/pages/Onboarding.tsx`, vou evoluir o fluxo atual para parecer menos “formulário” e mais “configuração guiada”.

Mudanças:

- Trocar textos genéricos por textos orientados a benefício.
- Mostrar, em cada etapa, o impacto da resposta:
  - “Isso define o estágio inicial do seu projeto.”
  - “Isso muda o tipo de checklist que vamos criar.”
  - “Isso prioriza os blocos do seu dashboard.”
- Remover classes visuais antigas como `neon-text` e `neon-glow`, alinhando com a identidade macOS minimalista/light mode.
- Melhorar a tela final de confirmação para mostrar um “Plano inicial” antes de concluir.

Exemplo da confirmação final:

```text
Seu StudioFlow vai começar assim:

Projeto: Meu Single
Momento: Tenho música pronta
Foco principal: Lançamento

Vamos criar:
- projeto já na etapa de masterização
- checklist inicial de lançamento
- atalhos para DNA Musical / Master Analyzer
- dashboard priorizando próximos passos de lançamento
```

## 2. Criar um “Plano Inicial Personalizado”

Hoje o onboarding cria um projeto e salva `current_moment` e `main_pain`, mas essas informações quase não viram experiência personalizada.

Vou adicionar uma camada de mapeamento que transforma as respostas em:

- frase de boas-vindas personalizada;
- próxima ação recomendada;
- tarefas iniciais;
- CTA principal;
- prioridade visual no dashboard.

Exemplos:

### Se `main_pain = finance`

O dashboard prioriza:

- resumo financeiro;
- alerta para cadastrar custos/receitas;
- CTA: “Registrar primeiro custo ou receita”.

Tarefas iniciais:

- “Definir orçamento estimado do projeto”
- “Registrar investimento inicial”
- “Anotar previsão de receita ou cachê”

### Se `main_pain = team`

O dashboard prioriza:

- equipe pendente;
- profissionais;
- convite de parceiros.

Tarefas iniciais:

- “Listar quem falta para finalizar o projeto”
- “Convidar um parceiro para o projeto”
- “Definir responsável pela próxima entrega”

### Se `main_pain = launch`

O dashboard prioriza:

- próximos lançamentos;
- checklist de lançamento;
- análise técnica.

Tarefas iniciais:

- “Definir data prevista de lançamento”
- “Rodar análise do master”
- “Preparar capa e materiais de divulgação”

### Se `current_moment = ready`

O projeto já nasce em etapa de masterização e a experiência recomenda:

- Master Analyzer;
- Music DNA;
- checklist de distribuição.

### Se `current_moment = idea`

O projeto nasce em início e a experiência recomenda:

- organizar repertório;
- definir estrutura do single/EP/álbum;
- criar primeiras tarefas de composição/produção.

## 3. Criar componente de boas-vindas contextual no Dashboard

Adicionar um novo componente:

```text
src/components/dashboard/JourneyFocusCard.tsx
```

Ele será exibido no topo do dashboard, principalmente nos primeiros acessos, com:

- saudação personalizada;
- momento atual;
- foco escolhido;
- próxima melhor ação;
- CTA principal;
- CTA secundário;
- explicação curta de por que aquilo aparece.

Exemplo:

```text
Ana, seu foco agora é lançamento.

Como você disse que quer lançar, deixei seu dashboard priorizando
checklist, prazo e análise técnica da faixa.

Próxima melhor ação:
Rodar o DNA Musical ou Master Analyzer antes de enviar para as plataformas.

[Analisar minha faixa] [Ver checklist de lançamento]
```

Esse card deve usar os dados de `profile.current_moment` e `profile.main_pain`.

## 4. Reordenar o Dashboard dinamicamente

No `src/pages/Dashboard.tsx`, a ordem dos blocos será adaptada conforme `main_pain`.

Hoje a ordem é fixa:

1. Checklist
2. Alertas
3. Equipe
4. Projetos
5. Editais
6. Lançamentos
7. Financeiro

Vou transformar isso em uma hierarquia contextual.

### Organização

- `organization`: Checklist, Projetos, Alertas, IA
- `team`: Equipe, Convites, Projetos, Checklist
- `deadlines`: Alertas, Checklist, Lançamentos, Projetos
- `finance`: Financeiro, Transações, Alertas de orçamento, Projetos
- `launch`: Lançamentos, Checklist, Master/DNA, Projetos

No modo simples, manter menos blocos e mais foco. No modo completo, exibir mais detalhes.

## 5. Gerar tarefas iniciais com base no onboarding

Ao concluir o onboarding, além de criar o projeto, o app vai criar um pequeno checklist inicial usando a tabela `tasks` existente.

Não precisa criar nova tabela.

As tarefas serão geradas a partir da combinação:

- `current_moment`
- `main_pain`
- `projectType`
- projeto criado

Exemplo:

```text
current_moment = launching
main_pain = launch
projectType = single

Tarefas:
- Definir data de lançamento do single
- Conferir LUFS/True Peak antes do upload
- Preparar capa em formato quadrado
- Criar texto curto de divulgação
```

Essas tarefas entrarão como:

- `auto_generated: true`
- `source: "onboarding"`
- `source_module: "onboarding"`
- `task_area` correspondente: `lancamento`, `financeiro`, `equipe`, `gravacao`, etc.

## 6. Personalizar o projeto criado no onboarding

Hoje o projeto criado recebe dados básicos e depois ganha tracks padrão genéricas.

Vou melhorar isso para que o projeto inicial reflita melhor o tipo escolhido.

### Single

Tracks sugeridas:

- Voz Principal
- Instrumental / Beat
- Referência
- Master Bus

### EP

Tracks sugeridas:

- Faixa 1
- Faixa 2
- Faixa 3
- Master Bus

### Álbum

Tracks sugeridas:

- Pré-produção
- Faixas principais
- Interlúdios / versões
- Master Bus

Se o usuário estiver em modo simples, a estrutura continua enxuta. Se estiver em modo completo, podemos criar mais detalhes técnicos.

## 7. Injetar contexto de onboarding na IA

Hoje o `AITaskAssistant` recebe projetos, tarefas, finanças, profissionais e alertas, mas não recebe diretamente:

- momento atual;
- dor principal;
- modo escolhido;
- cidade;
- origem do onboarding.

Vou expandir o contexto enviado para a IA no Dashboard:

```text
profileContext:
- displayName
- currentMoment
- mainPain
- trackViewMode
- city
```

E atualizar a função `ai-task-assistant` para usar isso no prompt.

Resultado esperado:

Em vez de uma resposta genérica, a IA poderá dizer:

```text
Como seu foco principal é lançamento e seu projeto está em master,
eu faria nesta ordem:

- Rodar análise técnica da faixa
- Definir data de upload
- Preparar capa e descrição
- Revisar checklist de distribuição
```

## 8. Melhorar o estado vazio pós-onboarding

O componente `FirstRunEmptyState` hoje usa `localStorage` e assume que ainda não existe projeto.

Como o onboarding já cria um projeto, a experiência pós-onboarding deve ser diferente.

Vou ajustar para dois estados:

### Sem projeto real

Mostrar primeiros passos tradicionais.

### Projeto recém-criado pelo onboarding

Mostrar uma experiência mais personalizada:

```text
Seu primeiro projeto já está criado.

Agora vamos transformar ele em progresso real.

[Ver projeto] [Gerar checklist com IA] [Analisar faixa]
```

A checklist visual local deve deixar de ser o principal mecanismo de personalização e passar a refletir tarefas reais quando possível.

## 9. Microcopy e design

Ajustes visuais e de texto:

- Remover linguagem genérica: “Vamos configurar tudo pra você”.
- Usar linguagem mais concreta: “Vamos montar seu plano inicial”.
- Remover efeitos neon/gamer do onboarding e dashboard.
- Manter light mode, glassmorphism leve e estética macOS.
- Melhorar espaçamento no viewport mobile de 434px.
- Reduzir passos com sensação de fricção.
- Dar mais feedback após cada escolha.

## 10. Arquivos principais a alterar

### Onboarding

- `src/pages/Onboarding.tsx`
  - melhorar copy;
  - remover neon;
  - adicionar preview do plano inicial;
  - gerar tarefas iniciais;
  - personalizar projeto criado;
  - manter segurança do fluxo obrigatório.

### Dashboard

- `src/pages/Dashboard.tsx`
  - ler `profile` completo;
  - criar ordem dinâmica dos blocos;
  - passar contexto de onboarding para IA;
  - inserir novo card contextual.

- `src/components/dashboard/DashboardHeader.tsx`
  - substituir saudação genérica por saudação contextual.

- `src/components/dashboard/FirstRunEmptyState.tsx`
  - adaptar para pós-onboarding com projeto já criado.

- `src/components/dashboard/JourneyFocusCard.tsx`
  - novo componente com foco da jornada.

### Tarefas

- `src/hooks/useTasks.ts`
  - reutilizar `addTask` para tarefas iniciais.
  - se necessário, adicionar helper para criação em lote.

### IA

- `src/components/AITaskAssistant.tsx`
  - aceitar `profileContext`.

- `supabase/functions/ai-task-assistant/index.ts`
  - incluir contexto do onboarding no prompt.

### Geração automática de tarefas

- `supabase/functions/generate-daily-tasks/index.ts`
  - opcionalmente considerar `main_pain` e `current_moment` ao gerar tarefas futuras.
  - manter regras atuais de prazo, orçamento, convite, master e lançamento.

## 11. Critério de sucesso CX 10/10

A implementação estará boa quando:

- o usuário entende por que cada pergunta do onboarding existe;
- o projeto criado reflete o momento informado;
- o dashboard muda de prioridade conforme a dor principal;
- a IA responde com base no onboarding;
- as primeiras tarefas não são genéricas;
- o artista vê uma próxima ação clara nos primeiros segundos;
- a experiência mobile fica limpa e sem excesso visual;
- nenhuma informação preenchida fica “morta” no banco sem afetar a jornada.

## Resultado esperado

Depois da implementação, o onboarding deixa de ser apenas cadastro e passa a ser o motor da experiência personalizada do StudioFlow.

O usuário entra, responde poucas perguntas e recebe:

- projeto inicial coerente;
- dashboard priorizado;
- checklist inicial relevante;
- IA contextualizada;
- próxima ação clara;
- sensação real de produto personalizado.
