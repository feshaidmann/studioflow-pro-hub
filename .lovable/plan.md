## Refinos na seção "Compatibilidade com playlists"

Apenas UI/apresentação em `src/components/music-dna/PlaylistMatchCard.tsx`. Sem mudar lógica de matching nem dados.

### Problemas identificados na screenshot

1. **Nomes duplicados sem distinção** — "Indie BR Soft" aparece em 1º (39%) e 2º (37%) com descrição idêntica. No banco são clusters diferentes (slugs `indie-br-soft` e `indie-br-soft-2`), mas o usuário não vê diferença.
2. **Hierarquia fraca** — best match tem o mesmo peso visual dos outros dois; só um badge pequeno o diferencia.
3. **Gaps pouco acionáveis** — `0.81 → 0.48` mostra origem/destino mas não a direção da mudança (reduzir/aumentar) nem ordem de grandeza relativa.
4. **Texto de header confuso** — "294 faixas no mais próximo" mistura contexto do best match no parágrafo geral.
5. **Sample tracks** — só nome da banda, sem indicação de que são exemplos reais do cluster.
6. **Score sem qualificação** — 39% parece "ruim" sem contexto; faltam faixas qualitativas (Forte/Médio/Fraco).

### Mudanças propostas

**Header**
- Manter título + ícone.
- Substituir parágrafo por descrição mais curta e neutra: "Comparamos sua faixa contra clusters do banco de referência. Score = quão próxima ela está do perfil sonoro de cada cluster."
- Mover a contagem "X faixas" para dentro de cada card (mais preciso).

**Card do best match (destacado)**
- Fundo sutil `bg-primary/5` + borda `border-primary/30` para separar do resto.
- Título maior (`text-base`), badge "Melhor match" mantida.
- Score grande à direita (`text-2xl font-mono`) com qualificador abaixo ("Forte" ≥60%, "Médio" 30-59%, "Fraco" <30%).
- Linha de metadata: `294 faixas · cluster #1`.
- Bloco "Pontos para se aproximar" com ícones direcionais: ↓ vermelho-tênue se precisa reduzir, ↑ verde-tênue se precisa aumentar. Valor formatado com delta relativo: `Energia · reduzir −0.33 (0.81 → 0.48)`.
- Sample tracks: prefixo "Faixas típicas desse perfil:" e exibir até 4 com `band` em itálico.

**Cards 2 e 3 (compactos)**
- Layout mais denso: nome + score na mesma linha, barra fina, sem gaps nem samples (clicáveis no futuro para expandir, fora do escopo).
- Quando o `name` do perfil já apareceu acima, anexar sufixo discreto: `Indie BR Soft · variante B` (derivado do slug `-2`, `-3`…).

**Disambiguação de nomes duplicados**
- Helper local: ao renderizar, se um `profile.name` já apareceu, gera label "{name} · variante B/C/…" baseado na ordem de aparição. Não muda o dado.

**Estado de carregamento**
- Trocar "Calculando…" por 3 skeletons (`Skeleton` do shadcn) imitando a altura dos cards.

**Acessibilidade & responsivo**
- `Progress` ganha `aria-label` com nome do cluster e score.
- Gaps usam `flex-wrap` para não quebrar em telas estreitas.

### Fora do escopo
- Não tocar em `playlistMatch.ts`, banco, ou cálculo de score.
- Não consolidar clusters duplicados no banco (decisão separada — se quiser, faço numa segunda etapa).

### Arquivo afetado
- `src/components/music-dna/PlaylistMatchCard.tsx` (única edição)
