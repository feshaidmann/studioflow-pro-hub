## Objetivo

Manter o botão de exportar PDF já existente em `BriefingStep` e adicionar uma área visível que exibe o link e um preview do arquivo retornado pela edge function `export-visual-briefing`.

## Estado atual

- `BriefingStep.tsx` já tem o botão "Baixar PDF" que invoca `export-visual-briefing`, salva `pdf_url` em `visual_briefings` e abre em nova aba.
- Quando existe `pdf_url`, o usuário consegue só "Copiar link" — mas o link em si não é mostrado e não há preview embutido.

## Mudanças (somente `BriefingStep.tsx`)

1. **Card "PDF gerado"** que aparece quando `pdfUrl` existe (após exportar ou se `briefing.pdf_url` já estiver salvo):
   - URL truncada exibida em `font-mono text-xs` com tooltip do link completo.
   - Badge informando que o link expira em 1h (a edge function gera signed URL com TTL de 3600s).
   - Botões: "Abrir em nova aba" (`<a target="_blank">`), "Copiar link" (já existe), "Regenerar" (chama `handleExport` novamente).

2. **Preview embutido** opcional via `<iframe src={pdfUrl} className="w-full h-[480px] rounded-md border border-border" title="Preview do briefing PDF" />`, dentro de um `<details>` colapsável "Ver preview" para não pesar o render por padrão.

3. **Estado vazio**: quando ainda não foi gerado, manter o layout atual (apenas o botão "Baixar PDF") sem placeholder extra.

4. **Acessibilidade**: `aria-label` no link e no iframe; o botão regenerar reusa o estado `exporting`.

## Fora de escopo

- Edge function `export-visual-briefing` (já funcional).
- Migrações ou novas tabelas.
- Pro gating do export (separado, conforme conversado).
- Outros steps do stepper.