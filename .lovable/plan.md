
# Diagnóstico — Módulo Carreira

Análise focada em **jornada, usabilidade e CX** do `/carreira` (Editais + Palcos unificados), suas integrações (`oportunidades-search`, `edital-search`, `palco-search`, `edital-ai-assistant`, `match-editais`, `notify-edital-deadlines`) e seu objetivo declarado: **ajudar o artista a descobrir, decidir e conquistar oportunidades de fomento e apresentação.**

---

## 1. Mapa atual da jornada

```text
Descobrir (aba) ──► AISearchPanel ──► resultados (editais + palcos)
                                         │
                  ┌──────────────────────┼─────────────────────┐
                  ▼                      ▼                     ▼
            "Pra você" (perfil)   Grade filtrada        OpportunityDetailSheet
                                                              │
                              ┌───────────────┬───────────────┤
                              ▼               ▼               ▼
                        Marcar interesse  Salvar (IA)    Abrir oficial / Google
                              │
                              ▼
                Aba "Minhas inscrições" (pipeline)
                              │
              ┌───────────────┼──────────────────────┐
              ▼               ▼                      ▼
       ApplicationStatusMenu  EditalResultModal   EditalInscricao (somente edital)
                                                  (assistente IA + checklist)
```

A jornada é coerente, mas tem **6 atritos materiais** que minam o objetivo de "conquistar" (não só descobrir).

---

## 2. Achados — por gravidade

### Críticos (bloqueiam conquista)

**C1. Palco não tem fluxo de conquista.**
`handleApplicationClick` em `Carreira.tsx:347` abre só a sheet de detalhes para palcos. Editais ganham o `EditalInscricao` (assistente IA, checklist, banco de docs, batch-fill). Palco fica órfão: marca interesse → e depois? Sem release/EPK, sem rastreio de contato com organizador, sem template de e-mail de proposta. O módulo promete "conquista" mas só entrega para metade do catálogo.

**C2. "Iniciar candidatura" não leva para a candidatura.**
No `OpportunityDetailSheet` o CTA primário é "Iniciar candidatura", mas o handler só cria a `EditalApplication` e fecha — o usuário precisa ir manualmente à aba "Minhas inscrições" e clicar de novo para chegar no `EditalInscricao`. Quebra de promessa direto no CTA. Esperado: criar + navegar para `/editais/inscricao/:id` no mesmo gesto (e o toast vira confirmação, não atalho).

**C3. Extração de campos é cega ao usuário até clicar.**
`EditalInscricao` exige clique em "Extrair campos" para começar; sem isso a página fica vazia (`extractedFields` null). Em link quebrado (`link_status="broken"`) a extração falha silenciosamente sem fallback. Resultado: usuário entra, vê página vazia, sai. Deveria auto-extrair on-mount com skeleton + estado de erro acionável ("link caiu, cole o texto do edital aqui").

### Sérios (degradam confiança)

**S1. Busca IA não tem memória nem refinamento.**
`AISearchPanel` é stateless: cada busca substitui `aiResults` (`Carreira.tsx:336`). Não há histórico, "buscas salvas", nem refinar ("só dos últimos 30 dias", "exclua SP"). Para uma feature posicionada como "hero", isso é pobre. Buscas anteriores deveriam virar chips reabriveis no topo do painel.

**S2. Resumo da IA e `match_reason` por card não estão integrados.**
A edge function `oportunidades-search` calcula `match_reason` por item (linhas 167-174), mas `OpportunityCard.tsx` não exibe — o investimento de tokens é desperdiçado. O resumo geral aparece em banner separado e o "por que isso apareceu pra você" some.

**S3. "Pra você" só roda em editais já salvos.**
`RecommendedSection` pontua sobre `editais` (estado local de `useEditais` — base do usuário) e `palcosCurados`. Quem entra sem nada salvo vê seção vazia, e o algoritmo de recomendação nunca dispara `edital-search`/`palco-search` proativamente. A promessa "pra você" só se cumpre **depois** que o usuário já fez o trabalho.

**S4. Pipeline não diferencia urgência.**
`TabsContent value="inscricoes"` lista por ordem de criação. Sem ordenação por prazo, sem destaque visual para "vence em <7d", sem agrupamento por status (rascunho / inscrito / aguardando resultado). `notify-edital-deadlines` existe mas não há badge in-app ("3 prazos esta semana"). O usuário precisa de um cockpit, recebe uma lista.

### Médios (fricção evitável)

**M1. Deep-link `?op=tipo:key` só resolve depois das listas carregarem** (`Carreira.tsx:163-173`). Link compartilhado mostra grade primeiro, depois "salta" para o sheet. Mostrar skeleton dedicado quando há `op` na URL.

**M2. Filtros avançados escondem o que é discoverable.** Estado, gênero, prazo estão no `AdvancedFiltersSheet` (gaveta). Em mobile (viewport atual 434px) o usuário só vê os chips de tipo + um botão "Filtros (N)". UF e prazo são os filtros mais valiosos do domínio (artista pensa em "tem no meu estado?" e "dá pra fazer a tempo?"). Promovê-los para chips horizontais scrolláveis.

**M3. `EditalInscricao` mistura 3 modos** (extração, preenchimento, status) sem hierarquia visual clara. Header tem breadcrumb + título + status + projeto + 4 botões. Falta passo a passo (1. Extrair → 2. Vincular projeto → 3. Preencher → 4. Marcar inscrito).

**M4. Ausência de prova social/precedente.** Nada conta "X artistas já se candidataram via StudioFlow a este edital" ou "seu match score: 8/10 porque...". O `match_reason` existe; transformar em score visual já cria credibilidade.

**M5. "Link quebrado" delega ao Google sem contexto.** `buildGoogleFallbackUrl` é genérico ("título + órgão + edital"). Para um edital específico, deveria abrir Google site:gov.br ou site:org-conhecido e logar o report para o cron `check-opportunity-links` reagir.

**M6. Sem export/share.** Não há "exportar minha pipeline para CSV", "compartilhar oportunidade com manager", "imprimir checklist". Artista trabalha com equipe (produtor, manager) e o módulo é silo de 1 pessoa.

### Baixos (polimento)

**B1.** Toast de "Endereço atualizado" para rotas legadas (`/editais`, `/palcos`) é correto mas aparece **toda vez** que alguém abre o link com `from=legacy`; sem dedupe por sessão.
**B2.** Contagem "X oportunidade(s) com filtros aplicados" sempre no plural quando = 1.
**B3.** Empty state da aba "Descobrir" sem oportunidades pede "use a busca inteligente acima" — não tem link/scroll-to.
**B4.** `EditalResultModal` só roda em editais inscritos sem resultado; palcos não têm equivalente para registrar "fui aprovado / toquei / cachet recebido" — perde dados úteis para o módulo Financeiro.

---

## 3. Lacunas estratégicas (objetivo "conquistar")

| Promessa do módulo | Estado atual |
|---|---|
| Descobrir oportunidades certas | ✅ Sólido (IA + curados + filtros) |
| Entender se vale a pena | ⚠️ Parcial (resumo IA existe mas não atinge o card; sem score; sem comparação rápida) |
| Preparar candidatura | ⚠️ Só edital. `EditalDocumentsBank` + `ApplicationChecklist` existem mas escondidos dentro do EditalInscricao |
| Submeter e acompanhar | ❌ Não há "marcar como inscrito" claro, sem comprovante, sem prazo de resultado esperado |
| Registrar resultado e aprender | ⚠️ `EditalResultModal` cobre editais; sem feedback loop ("o que funcionou na sua proposta vencedora") |
| Integrar com resto do app | ⚠️ Vincula projeto, mas resultado aprovado não vira automaticamente entrada financeira nem evento na Agenda |

---

## 4. Recomendações priorizadas (ordem sugerida)

**P0 — desbloquear conquista (1 sprint):**
- Resolver C2: CTA "Iniciar candidatura" navega direto para `/editais/inscricao/:id`.
- Resolver C3: auto-extrair on-mount; estado de erro com fallback de colar texto.
- Resolver C1: criar `PalcoProposta.tsx` análogo ao `EditalInscricao` — gera EPK/release a partir do perfil+projeto, template de e-mail ao organizador, checklist mínimo (foto pro, rider, vídeo ao vivo, valor solicitado).

**P1 — credibilidade da descoberta (1 sprint):**
- S2: renderizar `match_reason` no `OpportunityCard` (linha sutil sob o título).
- S4: pipeline reordena por prazo + destaque "vence em <7d" + chips de status no topo.
- M2: promover UF e prazo para chips horizontais.
- M4: transformar enriquecimento IA em score numérico (1-10) com tooltip explicando.

**P2 — recorrência (1 sprint):**
- S1: salvar últimas 5 buscas IA no `user_settings` + chips de reabertura.
- S3: quando "Pra você" estaria vazio, disparar `oportunidades-search` proativo com queries derivadas do perfil ("editais de fomento para [primary_genre] em [state]").
- B4: `PalcoResultModal` (compareceu? cachet recebido?) com criação automática de `financial_transactions` (recebível) e evento na Agenda.

**P3 — colaboração e dados (backlog):**
- M6: export CSV pt-BR (já temos papaparse), share link assinado, modo "manager view" read-only.
- Integração Agenda: prazo de candidatura vira evento opcional com lembrete.
- Métricas pessoais: dashboard "taxa de aprovação por área/órgão", reaproveita `EditalMetricsDashboard` no nível Carreira (não por edital).

---

## 5. Próximo passo proposto

Posso transformar este diagnóstico em um plano executável priorizando **P0** (3 itens, ~1 sprint) — começando pelo fix de navegação do CTA (C2) e pelo fluxo de proposta para palcos (C1), que juntos dobram a cobertura funcional do módulo.

Quer que eu prossiga para o plano de implementação de P0, ou prefere ajustar a priorização antes?
