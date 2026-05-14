## Goal

Make the specialty field in `ProfessionalFormDialog` behave as a single standardized Select (with "Outro" → free text), and guarantee the value persisted in `professionals.specialty` is exactly what `ProfessionalDetailModal` displays — for both new and edited contacts.

## Scope

Frontend only. Files:
- `src/components/professionals/ProfessionalFormDialog.tsx`
- `src/components/professionals/ProfessionalDetailModal.tsx` (display normalization only)
- `src/constants/specialtyOptions.ts` (export a helper)

No DB migration. No changes to `Professionals.tsx`, list, or filters.

## Changes

### 1. `specialtyOptions.ts`
Add a small helper used by both the form and the modal so logic stays in one place:

```ts
export const SPECIALTY_NONE = "__none__";
export const SPECIALTY_OTHER = "Outro";
export function isPresetSpecialty(v: string): boolean {
  return (SPECIALTY_OPTIONS as readonly string[]).includes(v);
}
```

### 2. `ProfessionalFormDialog.tsx`

- Replace the current Select with three explicit modes driven by `specialtyMode`:
  - `SPECIALTY_NONE` → "Nenhuma" (clears specialty, saves `""`)
  - any preset value → saves that value as-is
  - `SPECIALTY_OTHER` → reveals the free-text input; saves `customSpecialty.trim()`
- Add `<SelectItem value={SPECIALTY_NONE}>Nenhuma</SelectItem>` at the top (shadcn Select cannot use empty string as value).
- On open / `editTarget` change, derive initial mode with `isPresetSpecialty`:
  - preset → `mode = editTarget.specialty`, custom = `""`
  - non-empty non-preset → `mode = "Outro"`, custom = `editTarget.specialty`
  - empty → `mode = SPECIALTY_NONE`, custom = `""`
- Validation: when `mode === "Outro"` and `customSpecialty.trim().length < 2`, block submit and show inline `text-xs text-destructive` ("Descreva a especialidade (mín. 2 caracteres)"). Track via local `specialtyError` state, cleared on input change.
- Compute `finalSpecialty`:
  - `SPECIALTY_NONE` → `""`
  - `Outro` → `customSpecialty.trim()`
  - preset → mode value
- Cap custom at 60 chars (matches typical badge width in modal/list) instead of 100.
- Strip the `specialty` field from the zod `payload` before insert/update and overwrite with `finalSpecialty` (already done; just keep the normalized value).
- Keep the Select `value` controlled; never pass `""` to a `SelectItem`.

### 3. `ProfessionalDetailModal.tsx`

- Normalize what is displayed so the modal never renders stale "Outro" literal:
  - If `professional.specialty` is empty → render nothing (current behavior).
  - Otherwise render the raw stored string (already does this).
- Trim on display: `professional.specialty.trim()` to defend against legacy whitespace records.
- No other changes — the value shown is exactly the value saved.

### 4. Consistency guarantee

By construction:
- DB always stores either `""`, a preset string from `SPECIALTY_OPTIONS`, or a trimmed custom string (never the literal `"Outro"`).
- The detail modal renders `professional.specialty` verbatim.
- Re-opening the form on an edited contact reconstructs the correct mode via `isPresetSpecialty`, so the user sees "Outro" + their custom text again.

## Out of scope

- New columns, ratings/allocations linkage, or schema migration.
- Filters/list specialty rendering (already reads the same field).
- Multi-specialty support.
