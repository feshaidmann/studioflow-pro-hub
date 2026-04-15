

# Proposta: IA Integrada na Jornada de Preenchimento de Editais

## Problema atual

A jornada de preenchimento de editais tem 3 camadas de IA desconectadas entre si:

1. **Extração de campos** (`extract-edital-fields`) — usa Perplexity para extrair campos do edital. Funciona, mas o resultado é genérico e não pré-preenche campos textuais com conteúdo relevante.
2. **Pré-preenchimento** (`handlePreFill`) — apenas copia dados cadastrais do perfil (nome, email, cidade). Campos descritivos como "Memorial", "Justificativa", "Plano de trabalho" ficam vazios.
3. **Assistente IA** (`EditalAIAssistant`) — gera memoriais e adapta linguagem, mas está num Sheet separado, desconectado dos campos do formulário. O artista precisa gerar, copiar e colar manualmente.

**Resultado:** O artista preenche campos textuais longos (memorial, justificativa, metodologia) na mão, mesmo tendo uma IA capaz de gerá-los. A ponte entre "campo vazio" e "IA que gera conteúdo" não existe.

---

## Proposta: IA inline por campo

### Conceito
Cada campo do tipo `textarea` no formulário de inscrição (`EditalInscricao.tsx`) ganha um botão `✨ Gerar com IA` que:
1. Envia o **nome do campo** + **contexto do edital** + **projeto vinculado** + **perfil do artista** para a edge function
2. Recebe o texto gerado e preenche o campo automaticamente
3. Permite refinar inline ("Mais formal", "Adicionar dados de público")

### Fluxo visual
```text
┌─────────────────────────────────┐
│ Memorial descritivo *           │
│ [Descrição: máximo 2000 palavras] │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    (textarea vazio)         │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ [✨ Gerar com IA]  [📋 Copiar] │
│                                 │
│ Se gerado pela IA:              │
│ [🔄 Refinar] [input: instrução] │
└─────────────────────────────────┘
```

### Mudanças

**1. Nova ação na edge function `edital-ai-assistant`**
- Adicionar ação `fill_field` que recebe: `field_name`, `field_description`, `edital_title`, `edital_summary`, `project_id`, `max_words`
- System prompt: "Preencha o campo '{field_name}' de um formulário de inscrição em edital cultural. Use linguagem técnica de editais. Considere o contexto do projeto e perfil do artista."
- Retorna apenas o texto para o campo, sem formatação extra

**2. Componente `FieldInput` com IA (`EditalInscricao.tsx`)**
- Para campos `textarea`, adicionar botão "Gerar com IA" abaixo do campo
- Ao clicar: chama `edital-ai-assistant` com ação `fill_field`
- Loading: skeleton dentro do textarea
- Resultado preenche o campo (editável pelo artista)
- Botão "Refinar" aparece após geração, com input inline para instrução
- Contador de palavras ao lado do limite

**3. Pré-preenchimento inteligente em lote**
- Renomear o botão "Pré-preencher com perfil" para "✨ Preencher tudo com IA"
- Ao clicar:
  - Campos simples (nome, email, cidade) → preenchidos do perfil (como hoje)
  - Campos `textarea` (memorial, justificativa, etc.) → gerados em sequência pela IA, um por um, com indicador de progresso ("Gerando campo 3 de 7...")
- Cada campo gerado fica editável e mostra badge "Gerado por IA"

**4. Salvar conteúdo gerado no banco de documentos**
- Após gerar um campo longo, mostrar opção "Salvar no banco de documentos" (reutilizável em outros editais)
- Usa `edital_documents` existente

**5. Contexto enriquecido na extração**
- Ao extrair campos, passar o `resumo_edital` resultante como contexto para todas as gerações subsequentes
- Armazenar `resumo_edital` no state e repassar ao `fill_field`

---

## Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/pages/EditalInscricao.tsx` | Refatorar `FieldInput` com botão IA inline, lógica de "preencher tudo", progresso por campo |
| `supabase/functions/edital-ai-assistant/index.ts` | Adicionar ação `fill_field` com contexto de campo específico |
| `src/hooks/useEditalAI.ts` | Adicionar método `fillField()` simplificado para chamadas por campo |

## Sem alterações de banco de dados
As tabelas existentes (`rascunhos_editais`, `edital_documents`, `ai_invocations`) já suportam toda a funcionalidade.

## Prioridade de implementação
1. Botão "Gerar com IA" por campo textarea (maior impacto, menor fricção)
2. "Preencher tudo com IA" em lote
3. Refinar inline por campo
4. Salvar campo no banco de documentos

