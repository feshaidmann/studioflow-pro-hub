

# Plano: Módulo "Busca de Editais"

## Resumo
Criar um módulo completo de busca de editais culturais usando Perplexity (já conectado) como motor de busca web, com tabela no banco, Edge Function, hook e página integrada à navegação.

## Adaptação importante
O spec original pedia Claude + web_search da Anthropic. Como optou por Perplexity, a Edge Function usará a API do Perplexity (modelo `sonar`) para busca com grounding em tempo real. O system prompt será preservado integralmente. A Perplexity já faz web search nativamente — não precisa de ferramenta extra.

---

## 1. Migration SQL — Tabela `editais`

Nova tabela com todas as colunas especificadas. RLS restrita ao `user_id = auth.uid()`. Índice único em `(user_id, session_key)`.

## 2. Edge Function — `supabase/functions/edital-search/index.ts`

- Segue padrão de `ai-task-assistant` (auth, CORS, logging)
- Recebe `{ query, sources?, project_id?, save_results? }`
- Chama Perplexity API (`https://api.perplexity.ai/chat/completions`) com modelo `sonar-pro` (multi-step reasoning + citations)
- System prompt copiado literalmente do spec
- User prompt construído com a query + sources do usuário
- Parseia a resposta em markdown e extrai array estruturado de editais
- Se `save_results = true`, persiste na tabela `editais` via service role client
- Retorna `{ message, editais, session_key_list, citations }`

## 3. Hook — `src/hooks/useEditais.ts`

Seguindo padrão de `useTasks.ts`:
- `editais` — query da tabela, filtrável por `project_id`
- `loading`, `searching`
- `search(query, sources?, projectId?)` — chama a edge function
- `saveResults(editais)` — insere via `supabase.from('editais').insert()`
- `deleteEdital(id)` — remove registro
- `exportCSV()` — gera download CSV no cliente (separador `;`, UTF-8 BOM)

## 4. Página — `src/pages/Editais.tsx`

Layout seguindo `Professionals.tsx`:
- Header: "Busca de Editais" + subtítulo
- Campo de busca + botão "Buscar"
- Accordion "Fontes adicionais" (textarea + filtros UF/área)
- Área de resultado: empty state / skeleton / Table com colunas Título|Estado|Órgão|Prazo|Status|Área|Link
- Badge colorido por status (verde/vermelho/cinza)
- Barra de ações: Salvar, Exportar CSV, Vincular a projeto
- Seção "Editais salvos" com tabela + botão de excluir

## 5. Navegação

- `AppLayout.tsx`: novo item `nav.editais` com ícone `FileText`, após Agenda
- `App.tsx`: rota lazy `/editais`
- `LanguageContext.tsx`: traduções `nav.editais` pt/en

## Arquivos criados/editados

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/migrations/xxx_create_editais.sql` |
| Criar | `supabase/functions/edital-search/index.ts` |
| Criar | `src/hooks/useEditais.ts` |
| Criar | `src/pages/Editais.tsx` |
| Editar | `src/components/AppLayout.tsx` (nav item) |
| Editar | `src/App.tsx` (rota) |
| Editar | `src/contexts/LanguageContext.tsx` (traduções) |

## Detalhes técnicos

**Perplexity vs Claude web_search**: A API do Perplexity já inclui busca web nativa — cada resposta vem com `citations` (URLs fonte). Isso substitui diretamente o `web_search_20250305` do Claude. O modelo `sonar-pro` faz raciocínio multi-step e retorna até 2x mais citações.

**Parsing**: Como a Perplexity retorna texto livre (não JSON estruturado), a Edge Function fará um segundo passo com Lovable AI (Gemini Flash) para extrair o array JSON de editais a partir do markdown retornado pela Perplexity. Isso garante dados estruturados confiáveis para persistência.

**Deduplicação**: O índice `UNIQUE (user_id, session_key)` + `ON CONFLICT DO NOTHING` no insert garante que editais duplicados não sejam salvos.

