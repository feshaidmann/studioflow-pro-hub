## Objetivo

Tornar o `GenreMismatchHint` mais transparente exibindo:
- Família musical do gênero declarado e do detectado (ou "fora das famílias mapeadas").
- Valores numéricos: score top1, score top2, gap, e os limiares calibrados em uso.

Mudanças apenas visuais/UI no componente — sem alterar lógica de gating, calibração ou banco.

## Arquivos

### 1. `src/lib/genreFamilies.ts`
- Exportar nova função `getFamilies(genre: string): string[]` que devolve a lista de famílias (ou `[]`) a partir do `GENRE_TO_FAMILIES` reverso já existente.
- Exportar `FAMILY_LABELS: Record<string, string>` com rótulos pt-BR amigáveis (ex: `pop → "Pop"`, `brazilian-roots → "Raízes Brasileiras"`, `urban → "Urbano"`, `electronic → "Eletrônico"`, `acoustic → "Acústico"`, `rock → "Rock"`, `funk-br → "Funk BR"`).

### 2. `src/components/music-dna/GenreMismatchHint.tsx`
Adicionar, abaixo do parágrafo "Sinal técnico apenas..." e antes da linha de feedback, um bloco colapsável discreto "Detalhes técnicos" (`<details>` nativo, sem expandir o card por padrão) contendo:

```text
Família declarada: <familias do declared> (ou "—")
Família detectada: <familias do detected> (ou "—")
Top 1 (detectado): <top1 %>  •  Top 2 (runner-up): <top2 %>
Gap: <gap %>
Limiares aplicados: score ≥ <scoreThreshold %>, gap ≥ <gapThreshold %>
```

Observações:
- Usar fonte mono pequena (`text-[11px] font-mono text-muted-foreground`).
- Quando `getFamilies()` retorna `[]`, mostrar "fora das famílias mapeadas" para deixar claro por que `sameFamily()` não impediu o alerta.
- Reaproveitar `getThresholds(declared)` já chamado no componente; não recomputar.
- Nenhuma mudança em condições de retorno antecipado nem em `submitFeedback`.

### 3. Memória
Atualizar a entrada `mem://funcionalidades/dna-musical/feedback-de-classificador` mencionando o painel "Detalhes técnicos" exibido no hint.

## Fora de escopo
- Mudar limiares ou regras de família.
- Adicionar i18n EN (manter pt-BR consistente com o resto do componente).
- Telemetria do clique em "Detalhes".
