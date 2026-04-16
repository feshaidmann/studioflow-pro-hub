

# Diagnóstico CX — DNA Musical (`/music-dna`)

## Jornada atual (mapa)
```text
Entrar → Form (upload + nome + notas) → "Analisar" → Loading (logs) → Result (15+ seções) → [Salvar | Criar arte | Ajustar | Nova]
                                                                          ↑
                                                            cache de sessão restaura aqui
```

## Incoerências e fricções identificadas

### 🔴 Críticas (bugs/contradições)

**1. Campo "references" do schema está órfão**
`formSchema` valida `references[]`, `toggleRef` existe e `REFERENCE_ARTISTS` é importado — mas **não há UI no FormView** para selecionar referências. O usuário nunca consegue informar artistas-base, e o radar/diagnóstico usa só o gênero detectado. Código morto que polui o componente e quebra promessa do "Compare com referências".

**2. Badge "Pro" inconsistente com o subtítulo**
Header diz "Pro" sem qualificar; logo abaixo o disclaimer diz "Análise espectral disponível para todos · IA avançada é Pro". Mostra duas verdades ao mesmo tempo. Usuário free clica "Analisar" e não sabe se vai ou não funcionar.

**3. "Salvar" não devolve o ID da análise salva**
Comentário no código: `// We don't have the ID directly from the mutation`. Resultado: depois de salvar, "Criar arte com este DNA" passa `dna=session` em vez do `savedAnalysisId`. O link contextual entre DNA e Criativo quebra silenciosamente.

**4. Cache de sessão sem indicação visual**
Ao voltar para `/music-dna` o último resultado ressurge automaticamente — sem banner "Você está vendo a última análise · ↻ Nova". Usuário pensa que ficou preso ou que análise nova já rodou.

### 🟠 Hierárquicas (densidade e leitura)

**5. Tela de resultado com 9 cards verticais sem âncora**
Sequência: Header → 6 métricas → Resumo → Diag.Técnico → Seções → Timeline → Radar → Identidade → Refs+Fortes+Gargalos → Arranjo → Próximos passos → Footer. Em mobile (414px) são ~3500px de scroll sem TOC nem agrupamento. Usuário se perde e raramente chega no "Próximos passos" — que é justamente o conteúdo acionável.

**6. Tipografia técnica excessiva**
Uso de `font-mono uppercase tracking-widest text-[8-10px]` em quase todos os labels. Reforça o tom "estúdio", mas a 8-10px em mobile fica ilegível e cria fadiga. Conflita com a memória "macOS minimalista" do projeto que prefere SF/Inter.

**7. Métricas de áudio sem interpretação inline**
"-9.2 LUFS" sozinho não diz nada para o artista independente. O diagnóstico técnico explica depois, mas separa o número da leitura. Falta micro-tag tipo `🟢 ok | 🟡 alto | 🔴 fora` embaixo de cada card métrico, com tooltip explicando.

**8. Timeline de seções sem player/tempo**
Mostra blocos coloridos com `intro/verse/chorus`, mas sem player de áudio sincronizado e sem timestamps visíveis nos blocos curtos (`width > 8 ? label : ""` esconde texto). Usuário não consegue clicar em "chorus" para ouvir o trecho — seção decorativa.

### 🟡 Jornada (continuidade)

**9. Após "Salvar" não há próximo passo claro**
Footer mostra 5 botões em linha: Salvar, Criar arte, Ajustar análise, Nova análise + "Compartilhe com o produtor" (texto solto sem botão). Falta CTA primário "→ Próximos passos" que rolaria para a seção acionável e já permitiria adicionar tudo às tarefas em batch.

**10. "Adicionar à lista de tarefas" sem confirmação visual de destino**
Toast "Adicionado à lista de tarefas" não diz onde nem oferece "Ver no Dashboard". Usuário adiciona 5 sugestões e não sabe que viraram cards `[DNA]` no checklist diário.

**11. "Análises salvas" só aparece no estado inicial**
Lista some quando há resultado ativo. Para comparar duas faixas, usuário tem que clicar "Nova análise" → perde resultado atual → escolhe salva → perde a nova. Sem comparativo lado-a-lado.

**12. "Ajustar análise" (feedback) é genérico**
Botão chama modal de feedback amplo sem indicar que serve para corrigir gênero/métricas (caso de uso descrito na memória `/integracao-e-tarefas`). Parece "feedback do produto" e ninguém clica.

### 🔵 Visuais menores

**13. Emojis decorativos misturados com Lucide icons**
Header de cards usa 🔬📊🎬📡🎭🔗✅⚠️🎛🚀, mas footer/botões usam ícones Lucide. Falta consistência — escolher um sistema (Lucide é o padrão do app).

**14. Badge de gênero duplicada**
Aparece no header do resultado **e** dentro do `CompatibilityBadge` ao lado. Mesma informação duas vezes em 200px de distância.

**15. Cores fora do design system**
`green-500/10`, `orange-500/10`, `purple-400/50`, `blue-400/60` hardcoded no Tailwind. Memória diz "macOS minimalist, neutral gray". Sugestões deveriam usar tokens semânticos (`success`, `warning`, `accent`).

## Recomendações priorizadas

### P0 — Corrigir bugs e contradições
- **Implementar UI de seleção de referências** (chips multi-select com `REFERENCE_ARTISTS`) ou **remover** completamente do schema/imports se decidirmos postergar
- Fazer `saveAnalysis` retornar o ID e propagar para `setSavedAnalysisId` → "Criar arte com este DNA" passa o ID correto
- Consolidar mensagem Pro: uma frase só, no card de resultado avançado, não no header
- Banner "Restaurada da sessão" com ação `↻ Nova análise`

### P1 — Hierarquia e legibilidade
- **Sticky TOC lateral/topo** com 4 âncoras: `Resumo · Métricas · Identidade · Próximos passos`
- Reduzir uso de `font-mono uppercase 8-10px` para labels essenciais; texto de leitura em `text-xs/sm` regular
- Tag de status em cada card métrico (`🟢 ok / 🟡 alerta / 🔴 fora`) com tooltip
- Padronizar ícones para Lucide; remover emojis decorativos dos títulos de seção
- Substituir cores hardcoded por tokens semânticos

### P2 — Jornada acionável
- CTA primário no footer: **"Adicionar todos os próximos passos como tarefas"** (batch)
- Toast com action `Ver no Dashboard →`
- Permitir manter `SavedAnalysesList` visível em painel lateral/colapsável durante visualização (para comparar)
- Renomear "Ajustar análise" → **"Corrigir gênero ou métricas"** (microcopy honesta)

### P3 — Player na timeline (nice-to-have)
- Adicionar player HTML5 escondido + clicar em bloco da timeline → seek + play do trecho da seção
- Dependente de manter o blob de áudio em memória pós-análise (ajuste no `useMusicDNA`)

## Resumo executivo
DNA Musical entrega muito conteúdo técnico de qualidade, mas: **(a)** tem um campo morto (references), **(b)** quebra o link com Criativo após salvar, **(c)** sobrecarrega o usuário com 3500px de scroll sem TOC e tipografia fatigante. As três mudanças de maior impacto são **P0 (bugs) + P1 TOC/legibilidade + P2 batch-to-tasks** — levam a tela de "diagnóstico denso" a "diagnóstico navegável e acionável".

**Sugestão de PRs**:
1. P0 completo (bugs/contradições)
2. P1 TOC + tags de status nas métricas + cleanup tipográfico
3. P2 jornada acionável (batch + toast com link)
4. P3 player sincronizado (após validar uso real)

