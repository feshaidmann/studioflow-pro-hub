

# Padronização visual da seção de IA no Dashboard

## Diagnóstico

Comparando com `DailyChecklist`, `ProjectAlertsCard`, `FinancialSummary` (padrão visual do dashboard), a seção de IA destoa em três pontos:

1. **Card "Assistente IA"** (`Dashboard.tsx` linhas 219–285)
   - Usa `border-primary/20` + `text-xs` + `text-primary` no título → todos os outros cards usam `glass-card` puro com `text-base` neutro e ícone `text-primary` (só o ícone, não o texto).
   - Padding inconsistente: `pb-1 pt-3 px-4` no header e `pt-0 px-4 pb-3` no content → padrão é `pb-3` no header e `p-6 pt-0` (ou equivalente) no content.
   - Tagline inline ("— pergunte qualquer coisa…") quebra a hierarquia visual.

2. **Botão "Próxima ação"** (linhas 297–326)
   - Usa três variantes de borda/bg coloridas customizadas, label uppercase pequeno, ícone em círculo colorido → não combina com nenhum outro elemento. Deve virar um **Card** padrão com mesmo `glass-card` e indicador de severidade discreto (faixa lateral de 3px ou ícone colorido apenas).

3. **Hierarquia interna do chat (`AITaskAssistant.tsx`)**: o container interno (`rounded-lg border border-border/40 bg-card/40`) duplica visualmente o card pai, criando "card dentro de card". Trocar para fundo transparente sem borda quando `alwaysOpen`.

## Mudanças propostas

### A) Card "Assistente IA" → padrão `glass-card`
- Remover `border-primary/20 shadow-sm` (já vem do `glass-card`).
- Header: `pb-3` (padrão), título `text-base flex items-center gap-2`, ícone `Bot h-4 w-4 text-primary`, texto `Assistente IA` em cor neutra (`foreground`).
- Mover a tagline ("pergunte qualquer coisa…") para `CardDescription` abaixo do título, só em desktop, no mesmo tom `text-muted-foreground text-xs`.
- Chevron de collapse alinhado à direita com `ml-auto` mantendo padrão.
- Content: `px-6 pb-6 pt-0` (alinhado aos demais cards) ou `p-4 pt-0` se for para manter compactação mobile — usar mesma escala do `DailyChecklist`.

### B) Card "Próxima ação" → componente harmonizado
Transformar o `<button>` solto em um `Card glass-card` clicável compacto:
- Mesma borda/raio dos outros cards (`rounded-xl border-border/60`).
- Faixa lateral colorida de 3px (`border-l-4`) indicando severidade (`border-l-destructive` / `border-l-warning` / `border-l-primary`) — substitui as três variantes de bg/border atuais.
- Ícone Bot dentro de círculo `bg-muted` neutro (sem três variantes coloridas) + cor apenas no ícone conforme severidade.
- Tipografia: label "Próxima ação" como `text-xs text-muted-foreground` (sem uppercase exagerado), título em `text-sm font-medium`.
- Hover sutil padrão (`hover:bg-muted/30` já está ok).

### C) Container interno do chat (`AITaskAssistant.tsx`)
- Quando `alwaysOpen`: remover `border border-border/40 bg-card/40` do wrapper das mensagens — fica fundo transparente, sem "card duplo".
- Manter borda/bg só no popover (modo não-`alwaysOpen`).

## Arquivos modificados

- `src/pages/Dashboard.tsx` — refatorar `aiAssistantCard` (header padrão) e botão `nextAction` (virar Card com faixa lateral).
- `src/components/AITaskAssistant.tsx` — `chatBody` sem moldura quando `alwaysOpen`; ajustar paddings internos.

## Sem migrações de banco
Mudanças puramente visuais.

