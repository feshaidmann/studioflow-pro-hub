## Goal

Make the "Mostrar/Ocultar dados financeiros" toggle in `ProfessionalDetailModal` persist per logged-in user and consistently hide every fee/delivery field across the modal.

## Files

- `src/components/professionals/ProfessionalDetailModal.tsx`

## Changes

### 1. Per-user persistence
- Read `user` from `useAuth()`.
- Build the storage key dynamically: `professionals.show_financial:${user?.id ?? "anon"}`.
- Initialize `showFinancial` lazily from that key.
- Re-sync state when `user?.id` changes (effect on `user?.id`) — re-read the key so a logged-out → logged-in transition picks up the right preference instead of leaking the previous user's choice.
- Persist on every change with the per-user key.

### 2. Toggle visibility
- Currently hidden when `avgFee === null && avgDeliveryDays === null`, but the collaboration history can still contain per-row fees that depend on this toggle.
- Show the toggle whenever any of these is true:
  - `metrics.avgFee !== null`
  - `metrics.avgDeliveryDays !== null`
  - any `collaborationHistory[i].fee > 0`
  - any `collaborationHistory[i].deliveryDueDate` present
- Otherwise keep it hidden.

### 3. Consistent gating across the modal
Every fee/delivery surface inside the modal must check `showFinancial`:
- Aggregated card "Cachê médio" — already gated.
- Aggregated card "Prazo médio" — already gated, keep.
- History row `R$ {h.fee}` — already gated, keep.
- History row `delivery due date` — currently never rendered; do not introduce.
- Add the same `showFinancial` gate to any future fee surface by funneling through one `canShowMoney` boolean derived once near the top of the component.

### 4. Defaults & a11y
- Default state: `false` (do not reveal financial data until user opts in).
- Button gets `aria-expanded={showFinancial}` and `aria-controls="prof-financial-panel"`; the panel container gets the matching `id`.

## Out of scope
- Server-side persistence (would need a `profiles` column).
- Changing what counts as financial data (fee vs delivery split).
- Privacy of guests viewing other users (RLS already enforces this).
