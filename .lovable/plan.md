

# Padronizar Formatação de Markdown em Todos os Componentes de IA

## Problema
Três componentes de IA usam formatações diferentes para renderizar respostas:
- **AITaskAssistant**: usa `renderMarkdown()` manual (só bold, code, listas simples — sem suporte a headers, links, tabelas)
- **ProjectAISheet**: usa `ReactMarkdown` com classes `prose` básicas
- **EditalAIAssistant**: usa `ReactMarkdown` com classes `prose` + overrides de spacing

Resultado: experiência visual inconsistente entre os módulos.

## Solução
Criar um componente compartilhado `AIMarkdownContent` e usá-lo em todos os 3 locais.

## Mudanças

### 1. Novo componente `src/components/ui/ai-markdown-content.tsx`
- Wrapper de `ReactMarkdown` com classes Tailwind padronizadas
- Classes: `prose prose-sm max-w-none` + overrides consistentes para `p`, `ul`, `ol`, `li`, `h1-h4`, `code`, `pre`, `strong`, `a`, `blockquote`, `table`
- Espaçamento compacto adequado para chat (sem margens excessivas)
- Props: `content: string`, `className?: string`

### 2. `src/components/AITaskAssistant.tsx`
- Remover a função `renderMarkdown()` (linhas 114-135)
- Importar `AIMarkdownContent`
- Na linha 510, trocar `<div>{renderMarkdown(msg.content)}</div>` por `<AIMarkdownContent content={msg.content} />`

### 3. `src/components/project-hub/ProjectAISheet.tsx`
- Remover import de `ReactMarkdown`
- Importar `AIMarkdownContent`
- Na linha 192-194, trocar o bloco `<div className="prose..."><ReactMarkdown>` por `<AIMarkdownContent content={msg.content || "..."} />`

### 4. `src/components/editais/EditalAIAssistant.tsx`
- Remover import de `ReactMarkdown`
- Importar `AIMarkdownContent`
- Na linha 289-291, trocar o bloco `<div className="bg-muted/30..."><ReactMarkdown>` por `<AIMarkdownContent content={lastResult} className="bg-muted/30 rounded-lg p-3 max-h-80 overflow-y-auto" />`

## Estilo unificado do `AIMarkdownContent`
```text
- Parágrafos: mb-2, last:mb-0
- Listas: mb-2, pl-4, list-disc/decimal
- Items: mb-0.5
- Headers: font-semibold, mb-1.5, text sizes escalonados
- Code inline: bg-secondary/60, px-1, rounded, font-mono, text-[11px]
- Code block: bg-secondary/40, p-2, rounded-md, overflow-x-auto
- Links: text-primary, underline
- Strong: font-semibold, text-foreground
- Blockquote: border-l-2 border-primary/30, pl-3, italic
```

Nenhuma alteração de backend.

