

# Plano: Tornar o Assistente IA recolhível no Dashboard

## Resumo
Adicionar um toggle de colapsar/expandir no card do Assistente IA na página inicial, usando o componente `Collapsible` do Radix UI que já existe no projeto.

## Alteração

**Arquivo: `src/pages/Dashboard.tsx`**

- Envolver o card do Assistente IA com `Collapsible`, `CollapsibleTrigger` e `CollapsibleContent`
- O header do card (titulo "Assistente IA") vira o trigger clicável
- Adicionar ícone `ChevronDown`/`ChevronUp` no header indicando o estado
- Estado padrão: **recolhido** (para economizar espaço visual na primeira carga)
- Persistir preferência no `localStorage` (chave `sfp_ai_collapsed`) para manter entre sessões

