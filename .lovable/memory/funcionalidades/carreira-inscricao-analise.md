---
name: Carreira · Inscrição de edital simplificada
description: Tela /carreira/inscricao/:id é análise IA (resumo + prazos + documentos + carta), não preenchimento de campos. Persistida em edital_applications.analise_ia via edge function analyze-edital.
type: feature
---
A tela `/carreira/inscricao/:id` NÃO preenche formulário do edital. Ela:

1. Recebe o conteúdo do edital via upload (PDF/DOC/DOCX/TXT até 10MB) OU colar texto.
2. Chama a edge function `analyze-edital` (modelo `google/gemini-2.5-flash`).
3. Devolve `{ resumo, prazos[], documentos[], valor, publico_alvo, carta_sugerida }`.
4. Persiste a análise em `edital_applications.analise_ia` (JSONB) e recarrega ao reabrir a página.

**Removidos permanentemente:**
- Tabela `rascunhos_editais` (DROP CASCADE).
- Hooks `useRascunhoEdital`, `useEditalAI`, `useEditalDocuments` (banco) — não confundir com `useEditalDocuments.ts` do módulo Documentos do Edital, que continua ativo.
- Edge functions `extract-edital-fields` e `edital-ai-assistant` (deletadas).
- Botões "Preencher com meu perfil" e "Preencher tudo com IA".
- Componente `FieldInput` e auto-save por campo.

**Por quê:** o sistema não consegue submeter ao portal oficial do edital, então simular um formulário era custo de IA sem entrega de valor. O novo fluxo entrega decisão ("vale se inscrever?") + ponto de partida ("carta-base pra adaptar").
