
# Análise da Pesquisa Unicamp/INCAMP 2026 — Melhorias para o StudioFlow

## Dados da Pesquisa (17 respondentes)

### Perfil dos Respondentes
- Compositores, produtores, multi-instrumentistas, cantores
- Projetos variados: singles, EPs, álbuns, shows ao vivo
- Orçamentos de R$500 a R$100.000+

### Insights Quantitativos

**Disposição a pagar:**
- 65% (11/17) — "Só usaria se fosse grátis"
- 18% (3/17) — Até R$19/mês
- 12% (2/17) — R$20-49/mês
- 6% (1/17) — R$50-99/mês

**Controle sobre projetos (1-10):** Média ~6.8 (range 2-9)

**Ferramentas atuais:** WhatsApp (universal), planilhas, caderno, Google Drive/Agenda

**Por que abandonaram ferramentas:** Complexidade, falta de tempo para aprender, preferência por papel/post-it, não específicas para música

---

## Dores Mapeadas vs. Estado Atual do StudioFlow

### 1. MICRO-TAREFAS DO LANÇAMENTO (Dor #1 — citada extensivamente)
**Problema:** Respondentes listaram dezenas de micro-tarefas: ISRC, UBC, MusixMatch, pitch Spotify, pitch distribuidora, créditos, capa, thumbnail, tags, newsletter, WhatsApp, redes sociais...
**Hoje:** O `ProjectReleaseTab` já tem checklist com 6 seções (Distribuição, Metadados, Jurídico, Conteúdo, Plataformas, Status Final) — mas faltam itens citados na pesquisa.
**Melhoria:** Adicionar itens ao checklist: MusixMatch (letra), Newsletter, Pré-save link, Assessoria de imprensa, e um botão "IA: Gerar release/bio" integrado.

### 2. COMUNICAÇÃO / WHATSAPP (Dor #2 — quase universal)
**Problema:** Todos usam WhatsApp como ferramenta principal de coordenação.
**Hoje:** O app tem Project Chat com Realtime, mas não tem integração com WhatsApp.
**Melhoria:** Adicionar botão "Compartilhar via WhatsApp" nos pontos-chave: convites, atualizações de estágio, lembretes de tarefa. Usa `wa.me` deeplink — zero backend.

### 3. GESTÃO FINANCEIRA SIMPLES (Dor #3)
**Problema:** Maioria não controla gastos. Quem controla usa "cabeça" ou planilha básica.
**Hoje:** O módulo financeiro existe mas exige entrada manual detalhada.
**Melhoria:** Adicionar "Registro Rápido" — um input flutuante no Dashboard tipo "R$ 500 estúdio" que parseia valor + categoria automaticamente via regex simples.

### 4. EDITAIS E BUROCRACIA (Dor #4)
**Problema:** Respondentes citam editais como fonte principal de recurso e "inscrição automática" como feature que pagaria para ter.
**Hoje:** Módulo de Editais existe com IA assistente, checklist, e match.
**Melhoria:** Adicionar "Auto-preenchimento de campos" mais agressivo usando dados do perfil do artista (bio, currículo, portfólio) — já parcialmente implementado no `useEditalAI` mas pode ser mais proativo.

### 5. ONBOARDING SIMPLES (Dor #5 — abandono)
**Problema:** "Nunca usei, não tenho familiaridade", "Abandonei porque não conseguia usar em plenitude".
**Hoje:** Existe fluxo de onboarding + tutorial.
**Melhoria:** Reduzir onboarding para 2 passos (nome + primeiro projeto) e mostrar valor imediato com projeto demo pré-criado.

### 6. DÚVIDAS TÉCNICAS / YOUTUBE (Dor #6)
**Problema:** Todos recorrem ao YouTube para dúvidas de DAW, EQ, mix.
**Hoje:** IA JamSession existe mas não é descoberta facilmente.
**Melhoria:** Adicionar chip "Dúvida técnica?" no AITaskAssistant do Dashboard — direciona para o assistente com contexto de produção.

---

## Plano de Implementação (Priorizado por Impacto)

### Mudança 1: Expandir Release Checklist
**Arquivo:** `src/hooks/useReleaseChecklist.ts`
- Adicionar seção "Divulgação" com: MusixMatch (letra), Pré-save link, Newsletter/mailing, Assessoria de imprensa (release), Compartilhar com contatos
- Adicionar item "Letra cadastrada (MusixMatch)" na seção Plataformas

### Mudança 2: Botões "Compartilhar via WhatsApp"
**Arquivos:** `src/components/project-hub/ProjectOverviewTab.tsx`, `src/components/project-hub/ProjectReleaseTab.tsx`
- Botão com ícone WhatsApp que gera deeplink `https://wa.me/?text=...` com resumo do projeto/atualização
- Sem backend, usa `window.open()`

### Mudança 3: Registro Financeiro Rápido no Dashboard
**Arquivo:** `src/pages/Dashboard.tsx`
- Input inline "R$ 200 estúdio gravação" que parseia valor e tenta inferir categoria
- Dispara criação de transação com 1 clique
- Reduz fricção de "eu não controlo gastos" para "digito uma frase"

### Mudança 4: Chip "Dúvida técnica?" no Assistente IA
**Arquivo:** `src/pages/Dashboard.tsx` (AITaskAssistant chips)
- Adicionar chip "🎛️ Dúvida técnica" que abre o assistente com system prompt de engenheiro de áudio
- Conecta diretamente ao fluxo JamSession existente

### Mudança 5: Auto-preenchimento proativo em Editais
**Arquivo:** `src/pages/EditalInscricao.tsx`
- Ao abrir inscrição, pré-preencher campos com dados do perfil (bio, cidade, gênero do DNA Musical)
- Botão "Preencher com meu perfil" visível no topo

### Sem migrações de banco
Todas as mudanças usam estruturas existentes (release_checklist_data JSONB, transactions, profiles).

