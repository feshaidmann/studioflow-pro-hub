## Objetivo
Melhorar a acessibilidade do card colapsável "Perfil Cultural do Projeto" com foco automático ao expandir, `aria-labelledby` e navegação por teclado correta.

## Mudanças
**Arquivo:** `src/components/project-hub/ProjectCulturalProfile.tsx`

1. **IDs estáveis** via `useId()`:
   - `headerId` → aplicado ao `<CardTitle>` (heading visível).
   - `panelId` → aplicado ao `CollapsibleContent`.

2. **Trigger (header clicável):**
   - `aria-controls={panelId}` e `aria-expanded` (Radix já gerencia, mas explicitar via `data-state`).
   - Garantir que seja um `<button>` real (Radix `CollapsibleTrigger asChild` + elemento botão) — Enter/Space já funcionam nativamente.
   - `aria-labelledby={headerId}` no trigger para anunciar o título como nome acessível.

3. **Painel:**
   - `<CollapsibleContent id={panelId} role="region" aria-labelledby={headerId}>`.
   - `tabIndex={-1}` + `ref` para receber foco programático.

4. **Foco automático ao expandir:**
   - Estado controlado `open` (`useState(false)`).
   - `useEffect` observa `open`: quando `true`, aguarda o próximo frame (`requestAnimationFrame`) e chama `panelRef.current?.focus({ preventScroll: false })`.
   - Quando recolher, devolver foco ao trigger (`triggerRef.current?.focus()`) — apenas se o foco atual estiver dentro do painel, para não roubar foco do usuário.

5. **Navegação por teclado:**
   - Manter Tab order natural: trigger → primeiro Badge de área → demais controles → botão Salvar.
   - Garantir que `Esc` dentro do painel recolha o card (handler `onKeyDown` no painel: se `key === "Escape"`, `setOpen(false)` e foca trigger).
   - Badges clicáveis (áreas/estados): adicionar `role="button"`, `tabIndex={0}` e `onKeyDown` (Enter/Space) — atualmente só respondem a clique de mouse.

6. **Sem alterações de lógica/dados** — apenas a11y/UX.

## Fora de escopo
Refatoração de outros componentes; mudança visual além do necessário para foco visível (manter `focus-visible` tokens já existentes do shadcn).