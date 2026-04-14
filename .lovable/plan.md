

# Plano: Refatorar Tutorial e reposicionar ícone no menu

## Resumo
Duas frentes: (1) reescrever o conteúdo do Tutorial com tom de CX instrucional — direto, orientado a ação, sem jargão técnico desnecessário; (2) mover o link do Tutorial do grupo principal de navegação para o footer da sidebar, discreto ao lado de notificações e logout.

## 1. Reposicionar Tutorial no menu (`AppLayout.tsx`)

**Remover** o item `nav.tutorial` do array `gestaoItems` (linha 45).

**Adicionar** o ícone do Tutorial no footer da sidebar (após NotificationsBell, antes do botão de logout), usando `HelpCircle` em vez de `BookOpen` — mais discreto e convencional para "ajuda". Renderizar como NavLink com tooltip quando sidebar está colapsada.

**Mobile**: remover Tutorial do `primaryMobileItems` (já não aparece por não estar nos 6 primários). Adicionar um pequeno ícone `HelpCircle` no header mobile, ao lado do sino de notificações.

## 2. Refatorar conteúdo do Tutorial (`Tutorial.tsx`)

Reescrever com postura de **CX instrucional**:

- **Tom**: segunda pessoa ("você"), frases curtas, verbos de ação. Sem linguagem de manual técnico.
- **Estrutura por tarefa**: em vez de "O que é o Dashboard", usar "Como acompanhar seus projetos". Cada seção responde a uma pergunta que o usuário faria.
- **Remover mockups inline** — os mockups duplicam a UI real e ocupam espaço sem agregar valor instrucional. Manter apenas os componentes auxiliares (`Step`, `Tip`, `Warn`) que são úteis.
- **Simplificar tabs**: reduzir de 9 para 6 agrupamentos mais intuitivos:
  1. **Primeiros passos** — visão geral + Dashboard + checklist
  2. **Projetos** — criar, gerenciar, detalhe, equipe
  3. **DNA Musical** — upload, análise, feedback
  4. **Finanças** — transações, categorias, visão por projeto
  5. **Agenda** — eventos, conflitos, tipos
  6. **Assistente IA** — exemplos de perguntas, tarefas
- **Profissionais e Perfil**: incorporar como sub-seções em "Primeiros passos" e "Projetos", respectivamente, em vez de tabs separadas.

## Arquivos editados

| Arquivo | Ação |
|---------|------|
| `src/components/AppLayout.tsx` | Remover tutorial de `gestaoItems`, adicionar ícone discreto no footer (desktop) e header (mobile) |
| `src/pages/Tutorial.tsx` | Reescrever conteúdo com tom CX instrucional, reduzir tabs, remover mockups |

Nenhuma alteração de banco ou rotas.

