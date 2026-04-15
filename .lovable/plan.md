

# Redesign da Jornada IA nos Editais

## Diagnostico dos problemas atuais

### Friccao alta
1. A IA esta isolada numa aba separada ("IA") — o artista precisa sair do contexto do edital, ir ate outra aba, e preencher manualmente dados que o sistema ja tem (titulo do edital, projeto vinculado, tipo)
2. O componente exige que o usuario escolha uma acao ANTES de ver o formulario — dois cliques so para comecar
3. Nenhuma acao e pre-populada com dados do edital ou candidatura em questao — o usuario redigita tudo
4. O resultado e texto puro sem formatacao, sem acao de "salvar no banco de documentos"

### Layout pobre
5. Os 5 cards de acao ocupam muito espaco vertical com pouca hierarquia visual — parecem todos iguais em importancia
6. O formulario dentro de um Card generico sem indicacao de progresso ou contexto
7. A area de resultado nao tem acoes uteis (so copiar) — falta "Salvar como documento", "Refinar com IA", "Usar nesta candidatura"

### Jornada desconectada
8. Nao ha ponte entre o Pipeline (candidatura) e a IA — deveria ser possivel chamar a IA direto do card de candidatura
9. O checklist de documentos nao oferece "Gerar com IA" para cada item
10. Ao gerar um memorial, nao ha como salvar direto na `edital_documents` do banco

---

## Plano de melhorias

### 1. IA contextual no Pipeline (maior impacto)
- Adicionar botao "Assistente IA" no DropdownMenu de cada card de candidatura no Pipeline
- Ao clicar, abrir um Dialog/Sheet pre-populado com os dados do edital (titulo, tipo, criterios) e projeto vinculado
- Elimina a necessidade de preencher campos manualmente

### 2. Acoes IA no Checklist de documentos
- Para cada item do checklist (ex: "Memorial descritivo"), adicionar botao inline "Gerar com IA"
- Ao clicar, chamar a acao correspondente (generate_memorial, adapt_language) ja com contexto da candidatura
- O resultado pode ser salvo como `custom_content` no item OU salvo no banco de documentos e vinculado

### 3. Redesign do EditalAIAssistant
- Remover a tela de selecao de acao (5 cards) — substituir por lista compacta com radio/toggle horizontal
- Pre-popular campos quando vindo de contexto (candidatura ou edital)
- Adicionar acoes no resultado:
  - "Salvar no Banco de Documentos" (cria registro em `edital_documents`)
  - "Refinar" (re-envia com instrucao de ajuste, mantendo historico)
  - "Copiar" (ja existe)
- Renderizar resultado com formatacao markdown basica (paragrafos, listas)

### 4. Simplificar tabs — mover IA para drawer contextual
- Remover a aba "IA" standalone da TabsList (reduz de 6 para 5 tabs)
- A IA fica acessivel via:
  - Botao flutuante/FAB na pagina de Editais (acesso rapido global)
  - Dentro do Pipeline (contextual por candidatura)
  - Dentro do Checklist (contextual por documento)
- Isso elimina a sensacao de "ferramenta separada" e integra a IA no fluxo natural

### 5. Feedback visual e hierarquia
- Loading state com skeleton de texto (nao so spinner)
- Indicador de tokens/custo apos cada geracao (transparencia)
- Badge "IA" nos documentos gerados pela IA no banco

---

## Detalhes tecnicos

**Arquivos modificados:**
- `src/components/editais/EditalAIAssistant.tsx` — redesign completo: layout horizontal de acoes, props para contexto pre-populado, acoes no resultado (salvar, refinar), markdown rendering
- `src/components/editais/ApplicationChecklist.tsx` — adicionar botao "Gerar com IA" por item, integrar com `useEditalAI`
- `src/pages/Editais.tsx` — remover tab "IA", adicionar Sheet/Dialog com EditalAIAssistant contextual, botao FAB para acesso rapido, integrar IA no Pipeline dropdown
- `src/hooks/useEditalAI.ts` — adicionar metodo `refine()` para re-prompting, retornar flag `isAIGenerated`

**Nenhuma alteracao de banco de dados necessaria** — as tabelas existentes ja suportam tudo (salvar em `edital_documents`, vincular via `edital_application_docs`).

**Dependencia nova:** `react-markdown` (ja pode estar instalado) para renderizar resultado formatado.

