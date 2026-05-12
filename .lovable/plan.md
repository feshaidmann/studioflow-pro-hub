## Objetivo

Suíte de testes Vitest cobrindo a lógica do `GenreMismatchHint` com casos derivados de cenários reais de produtores. Garantir que pares dentro da mesma família (Pop ↔ Pop BR, Rock ↔ Grunge, Sertanejo Raiz ↔ Universitário, etc.) **não** disparam alerta, e que divergências reais (Pop ↔ Heavy Metal, Bossa Nova ↔ Trap, Funk Carioca ↔ Country) **continuam** sinalizadas.

## Arquivos novos

### 1. `src/lib/__tests__/genreFamilies.test.ts`
Testes unitários puros (sem React) sobre `normalizeGenreName`, `sameFamily`, `getFamilies`:
- `normalizeGenreName`: remove acentos/sufixos regionais (`"Pop Brasileiro"` → `"pop"`, `"Sertanejo Universitário"` → `"sertanejo"`, `"Eletrônica / House"` → `"eletronica"`).
- `sameFamily` (cases positivos): Pop ↔ Pop Brasileiro, Rock ↔ Grunge, Rock Alternativo BR ↔ Indie BR, Sertanejo Raiz ↔ Sertanejo Universitário, Hip-Hop ↔ Trap BR, Samba ↔ Pagode, Bossa Nova ↔ Jazz, Synth-Pop ↔ Eletrônica.
- `sameFamily` (cases negativos): Pop ↔ Heavy Metal, Bossa Nova ↔ Trap BR, Funk Carioca ↔ Country, Sertanejo ↔ Hip-Hop, Forró ↔ Eletrônica.
- `getFamilies`: retorna lista correta para gêneros mapeados; `[]` para gênero desconhecido.

### 2. `src/components/music-dna/__tests__/GenreMismatchHint.test.tsx`
Testes de comportamento de renderização (alerta sim/não), mockando `useGenreMismatchCalibration` para retornar thresholds-padrão fixos (`score 0.92 / gap 0.05`) e `submitFeedback` no-op.

Estrutura: array `CASES` com fixtures inspiradas em sessões reais já vistas pelos produtores:

```ts
type Case = {
  name: string;
  declared: string;
  detected: string;
  top1: number;
  top2: number;
  runnerUp?: string;
  shouldAlert: boolean;
};
```

Casos `shouldAlert: false` (silenciado):
- Pop ↔ Pop Brasileiro (top1 0.95, gap 0.10) — mesma família.
- Rock ↔ Grunge (0.94 / gap 0.08).
- Sertanejo Raiz ↔ Sertanejo Universitário (0.96 / gap 0.12).
- Hip-Hop ↔ Trap BR (0.93 / gap 0.07).
- Samba ↔ Pagode (0.97 / gap 0.15).
- Pop ↔ Synth-Pop (mesma família "pop").
- Score abaixo do limiar: declared Rock, detected Pop, 0.89 / gap 0.08 (não alerta).
- Gap insuficiente: declared Rock, detected Pop, 0.95 / gap 0.03 (não alerta).
- Runner-up na mesma família do declared: declared Pop, detected Trap BR (0.93), runnerUp "Pop Brasileiro" (0.86).

Casos `shouldAlert: true` (alerta legítimo):
- Pop ↔ Heavy Metal (0.94 / gap 0.10).
- Bossa Nova ↔ Trap BR (0.93 / gap 0.09).
- Funk Carioca ↔ Country (0.95 / gap 0.12).
- Sertanejo Universitário ↔ Hip-Hop (0.94 / gap 0.08), runnerUp Eletrônica.
- Forró / Piseiro ↔ Heavy Metal (0.96 / gap 0.20).

Implementação:
- `vi.mock("@/hooks/useGenreMismatchCalibration", ...)` com `getThresholds: () => ({ scoreThreshold: 0.92, gapThreshold: 0.05 })` e `submitFeedback: vi.fn()`, `submitting: false`.
- Loop `it.each(CASES)` que monta `hint = { detected, score: top1, runnerUp: runnerUp ? { genre: runnerUp, score: top2 } : { genre: "outro", score: top2 }, top3: [] }` e renderiza `<GenreMismatchHint hint={...} declared={declared} />`.
- `shouldAlert ? expect(screen.queryByText(/Sugestão do classificador/i)).toBeInTheDocument() : ...not.toBeInTheDocument()`.

### 3. (Opcional, mesmo arquivo) `describe("calibração")` 
Um teste extra mocka thresholds elevados (`0.97 / 0.10`) para confirmar que aumentando o limiar (efeito do feedback "Falso alerta") um caso antes alertado deixa de alertar — sem tocar no banco.

## Fora de escopo
- Datasets de áudio reais / WAV embutidos.
- Testes do hook `useGenreMismatchCalibration` (banco) — separáveis em outra suíte.
- Testes da Edge Function.
- Mudanças em código de produção.

## Como rodar
`bunx vitest run src/lib/__tests__/genreFamilies.test.ts src/components/music-dna/__tests__/GenreMismatchHint.test.tsx`
