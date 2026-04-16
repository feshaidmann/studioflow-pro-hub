

# Refatorar Welcome, Tutorial e Documentação + Testes das Novas Funcionalidades

## Contexto

A plataforma recebeu várias funcionalidades novas que **não estão refletidas** no Tutorial nem na Documentação:
- **Módulo Criativo** (`/criativo`) — geração de artes e legendas com IA
- **Módulo Editais** (`/editais`) — busca, match, inscrição com IA
- **DNA Musical → Criativo** — integração para gerar arte a partir de análise
- **WhatsApp sharing** — botões de compartilhamento nos projetos
- **Release Checklist expandido** — seção Divulgação (MusixMatch, pré-save, newsletter, press release)
- **Chip "Dúvida técnica"** no assistente IA
- **Auto-preenchimento de editais** com dados do perfil
- **AIMarkdownContent** — formatação padronizada de IA (já implementada)

A Welcome page tem **problemas de legibilidade mobile** (grid 4 colunas não escala bem em 434px), textos hardcoded sem `t()`, e a seção "Antes vs Depois" quebra em telas estreitas.

A Documentação (`docs/DOCUMENTACAO.md`) referencia URLs antigas (`jsp-flux.lovable.app`) e IDs de projeto antigos, além de não incluir os novos módulos (Editais, Criativo, EditalInscricao).

## Plano

### 1. Welcome.tsx — Refatorar para mobile-first

**Problemas atuais:**
- Grid de features usa `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — em 434px fica apertado com textos cortados
- Seção "Antes vs Depois" com `w-[45%]` — texto trunca em mobile
- `glass-card` sem definição clara (pode não existir no CSS)
- Comparações hardcoded em PT sem `t()`

**Mudanças:**
- Simplificar grid de features para `grid-cols-1 sm:grid-cols-2` com ícone + texto em linha horizontal
- Refatorar "Antes vs Depois" para layout empilhado em mobile (antes em cima, depois embaixo) com `flex-col` em telas pequenas
- Atualizar features para incluir Editais e Criativo como destaques
- Reduzir de 8 features para 6 mais impactantes (remover redundância)

### 2. Tutorial.tsx — Adicionar abas para Editais e Criativo

**Adicionar 2 novas abas:**
- `editais` (icon: FileText, label: "Editais") — explicar busca, match IA, inscrição, auto-preenchimento, documentos
- `creative` (icon: Palette, label: "Criativo") — explicar geração de arte, integração DNA Musical, legendas, galeria

**Atualizar abas existentes:**
- Na aba "Projetos": mencionar WhatsApp sharing, Release Checklist expandido (seção Divulgação)
- Na aba "DNA Musical": mencionar botão "Criar arte com este DNA" e integração com Criativo
- Na aba "IA": adicionar exemplos de "Dúvida técnica" e mencionar chip no Dashboard

### 3. docs/DOCUMENTACAO.md — Atualizar para v3.1

**Correções:**
- URL publicada: `studioflow-pro-hub.lovable.app` (não `jsp-flux.lovable.app`)
- Preview URL: atualizar para o ID correto do projeto
- Adicionar módulos 10.8 (Editais) e 10.9 (Criativo) na seção de Módulos Funcionais
- Adicionar `EditalInscricao` nas rotas protegidas
- Atualizar Edge Functions: adicionar `edital-ai-assistant`, `edital-monitor`, `edital-search`, `extract-edital-fields`, `generate-creative`, `match-editais`, `project-ai-assistant`
- Atualizar contagem de Edge Functions (de 11 para 18)
- Adicionar tabelas de editais no modelo de dados se existirem
- Atualizar changelog com v3.1 (novos módulos, AIMarkdownContent, WhatsApp, pesquisa Unicamp)

### 4. Testes das novas funcionalidades

Usar o browser para testar:
- Navegação Welcome → Auth (botões funcionam)
- Tutorial: abas navegam corretamente
- Verificar se `AIMarkdownContent` renderiza corretamente nos 3 locais (AITaskAssistant, ProjectAISheet, EditalAIAssistant)

## Arquivos modificados
- `src/pages/Welcome.tsx` — layout mobile-first, features atualizadas
- `src/pages/Tutorial.tsx` — 2 novas abas + atualizações nas existentes
- `docs/DOCUMENTACAO.md` — URLs, módulos, edge functions, changelog v3.1

## Sem migrações de banco
Todas as mudanças são frontend e documentação.

