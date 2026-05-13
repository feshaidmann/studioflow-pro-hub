## 1. Diagnóstico atual

### Código
- `src/pages/Carreira.tsx` (639 linhas) concentra layout, filtros, pipeline, deep-link, IA e callbacks → arquivo inflado.
- `OpportunityCard` mistura badges (Tipo + Status + Área + "Pra você") + footer com 3 ações concorrentes (Abrir/Buscar, Candidatar, Salvar/Remover) → ruído visual alto.
- `OpportunityFilters` sidebar de 260px com 7 controles empilhados em desktop (Buscar, Tipo, Ocultar encerrados, Prazo, Status, Estado, Gênero). Status duplica "Ocultar encerrados". Gênero só vale para palco mas aparece sempre.
- `AISearchPanel` repetido em mobile e desktop (duas instâncias renderizadas).
- Sheet de detalhe + EditalResultModal + redirecionamento para `/editais/inscricao/:id` criam três modos diferentes de "abrir" uma oportunidade.

### UX/CX
- Em `/carreira` o usuário vê: header + tabs + sidebar de filtros + painel IA + (eventualmente) bloco "Pra você" + chips + contador + grid. São ~5 hierarquias verticais antes do primeiro card → cognitivamente pesado.
- IA fica ao lado da lista, não acima — quem entra esperando "buscar editais" precisa procurar.
- Links quebrados aparecem como botão "Buscar" amarelo no card sem explicação; o usuário não entende por que o link "oficial" sumiu.
- Pipeline ("Minhas inscrições") fica em outra aba sem contador de prazos próximos nem agrupamento por status.

### IA — está sendo útil?
- `oportunidades-search` faz só **classificação de intenção** (edital/palco/ambos) com heurística + fallback Gemini Flash Lite, depois delega para `edital-search`/`palco-search`.
- O `AISearchPanel` mostra apenas o badge "Detectado: edital|palco|ambos" → valor percebido baixo. Não há ranking, não há justificativa por resultado, não há indicação de "por que isso combina com você".
- Recomendações ("Pra você") em `RecommendedSection` são determinísticas (estado/gênero/specialties), sem nenhuma camada de IA. Promessa de "busca inteligente" não se cumpre além de roteamento.
- Não há feedback loop ("não foi útil" / "esconder essa fonte") nem cache por sessão visível.

### Banco — links quebrados
```
editais        : 3 broken / 9 ok / 1 unknown / 13 total
palcos_curados : 7 broken / 8 ok / 0 unknown / 15 total
```
1 edital quebrado tem candidatura associada (precisa preservar o vínculo).

---

## 2. Limpeza dos links quebrados (executar primeiro)

- **palcos_curados**: deletar fisicamente as 7 linhas com `link_status='broken'` (tabela global, sem vínculos diretos críticos — `edital_applications` referenciando essas linhas não existe).
- **editais**:
  - Deletar fisicamente os 2 editais broken **sem** candidatura.
  - Para o 1 edital broken **com** candidatura: marcar como inativo via `status='Encerrado'` + `inferido=true` e adicionar nota no `resumo` ("Link oficial fora do ar — preservado por candidatura ativa"), em vez de deletar (evita quebrar histórico do usuário).
- Executar via tool `supabase--insert` (DELETE/UPDATE) — não migration.

---

## 3. Refactor do módulo Carreira

### 3.1 Arquitetura de arquivos
- Quebrar `Carreira.tsx` em:
  - `Carreira.tsx` (apenas composição + tabs)
  - `carreira/DescobrirTab.tsx` (lista + filtros + IA)
  - `carreira/InscricoesTab.tsx` (pipeline)
  - `carreira/useCarreiraFilters.ts` (URL ↔ state, lista filtrada/ordenada, deep-link)
  - `carreira/useCarreiraInterest.ts` (ensureOpportunity + handleInterest + handleSave + handleRemove)

### 3.2 Layout minimalista (jornada intuitiva)

Hierarquia visual nova (1 coluna até md, 2 colunas em lg+):

```text
┌─ Carreira ─────────────────────────────────────────────┐
│ [✨ Caixa de busca IA — full-width, hero]              │
│  "O que você procura?  ex: festivais MPB no Sul"       │
│  chips de exemplo · botão "Buscar"                     │
├────────────────────────────────────────────────────────┤
│ [chips compactos] Todas · Editais · Palcos             │
│ [chips de filtro ativo / Limpar]                       │
├────────────────────────────────────────────────────────┤
│ Pra você (3 cards horizontais — só sem filtros ativos) │
├────────────────────────────────────────────────────────┤
│ N oportunidades · [⇅ Ordenar] · [⚙ Filtros avançados] │
│ ┌─ card ─┐ ┌─ card ─┐                                  │
│ └────────┘ └────────┘                                  │
└────────────────────────────────────────────────────────┘
```

Mudanças concretas:
- **IA vira hero** (acima da lista, full-width). Remove a duplicação mobile/desktop.
- **Filtros principais viram chips horizontais** (Tipo + Prazo + Encerrados toggle). Estado/Gênero/Status migram para um **Sheet "Filtros avançados"** (botão único). Reduz 7 controles visíveis → 3.
- **Cards mais limpos**: 1 badge de tipo (Edital/Palco) à esquerda + status como dot colorido. Resumo, prazo e local ficam; "Área" e "Pra você" só aparecem em hover/detalhe.
- **Footer do card com 1 ação primária** (Candidatar/Marcar interesse) + ícone discreto de link/Google. "Salvar/Remover" some do card e migra para o detail sheet (menu ⋯).
- **Links quebrados**: substituir botão amarelo "Buscar" por um chip cinza inline `Link oficial fora do ar · ⌕ buscar` no header do card, com tooltip explicando. Reduz alarmismo.
- **Aba Inscrições**: agrupar por status (Interesse / Em preparação / Inscrito / Resultado) com headers; destacar prazos < 7 dias com borda colorida.

### 3.3 IA — torná-la realmente útil

Mínimo para que a IA cumpra a promessa (sem expandir escopo):
- **Justificativa por resultado**: `oportunidades-search` passa a retornar, junto com cada item, um campo `match_reason` curto (1 frase) gerado a partir da query + perfil do usuário (estado, gênero, fase de carreira). Renderiza como linha extra nos cards "vindos da IA" (`origem === 'ai'`).
- **Resumo da busca**: substituir o badge "Detectado: edital" por uma frase no topo dos resultados ("Encontrei 6 editais e 2 palcos focados em MPB no Sul. Priorizei prazos abertos."), gerada na própria edge function reutilizando a chamada de classificação.
- **Feedback inline**: cada card vindo da IA ganha 2 botões discretos `👍 útil / 👎 não é isso`, gravados em uma nova tabela `ai_search_feedback` (já compatível com `analytics_events` se preferir não criar tabela).
- **Filtro residual após IA**: depois de uma busca IA, mostrar pílula `Resultados da IA (limpar)` no topo da grid em vez de misturar silenciosamente com editais salvos (já existe parcialmente, melhorar visibilidade).

> Não vou refatorar `edital-search`/`palco-search` agora — só `oportunidades-search` (adiciona match_reason + summary) e o painel.

---

## 4. Detalhes técnicos

- Arquivos a tocar:
  - **Novos**: `src/pages/carreira/DescobrirTab.tsx`, `src/pages/carreira/InscricoesTab.tsx`, `src/pages/carreira/useCarreiraFilters.ts`, `src/pages/carreira/useCarreiraInterest.ts`, `src/components/carreira/AdvancedFiltersSheet.tsx`, `src/components/carreira/MatchReasonLine.tsx`, `src/components/carreira/AISearchHero.tsx`.
  - **Editados**: `src/pages/Carreira.tsx`, `src/components/carreira/OpportunityCard.tsx`, `src/components/carreira/OpportunityFilters.tsx` (vira "avançados"), `src/components/carreira/AISearchPanel.tsx` (deprecado → AISearchHero), `supabase/functions/oportunidades-search/index.ts` (adiciona summary + match_reason por item).
- Sem novas migrações obrigatórias. Feedback da IA: gravar em `analytics_events` (`event_name='carreira_ai_feedback'`, properties = `{verdict, opportunity_key, query}`) para evitar nova tabela.
- Limpeza de links: 2 statements via `supabase--insert`:
  1. `DELETE FROM palcos_curados WHERE link_status='broken';`
  2. `DELETE FROM editais WHERE link_status='broken' AND id NOT IN (SELECT opportunity_id FROM edital_applications WHERE opportunity_id IS NOT NULL);`
  3. `UPDATE editais SET status='Encerrado', resumo = COALESCE(NULLIF(resumo,''),'') || ' [Link oficial fora do ar]' WHERE link_status='broken';`
- Manter compatibilidade total das URLs atuais (`?tipo=`, `?op=`, `?tab=`).

---

## 5. Fora de escopo
- Reescrita das edge functions `edital-search`/`palco-search` (mantém prompts e fontes atuais).
- Onboarding de novas fontes (HostGator continua bloqueado, conforme memória).
- Mudança no `EditalInscricao.tsx` (assistente de inscrição) — só ajusta o link de entrada.
