

# Diagnostic: "Add to Team" Wizard — UX Issues

## Current Flow (2 steps, ~8-12 fields)

```text
STEP 1: Select
├── Professional type (8 buttons) ← required
├── Instrument (text input, only if "Instrumentista")
├── Contact source toggle: "Novo contato" / "Minha agenda"
│   ├── New: Name*, Specialty, Email, Phone (4 fields)
│   └── Existing: Select dropdown
└── [Continuar →]

STEP 2: Proposal
├── Fee (R$)
├── Deadline (date picker)
├── Access level (select)
├── Notes (textarea)
└── [Enviar proposta / Adicionar à equipe]
```

---

## Problems Found

### 1. Redundant field: "Especialidade" (Specialty)
When the user selects a professional type (e.g. "Mix"), the specialty is auto-filled via `profTypeSpecialty` mapping. But the "Especialidade" text input still appears in the "Novo contato" form, pre-filled with the same value. This is redundant for all types except "Instrumentista" (where the instrument field already covers it). The user sees the same information twice.

### 2. "Instrumento" field duplicates "Especialidade"
When "Instrumentista" is selected, both "Instrumento" (above the source toggle) and "Especialidade" (inside the new contact form) appear. The instrument value is what should become the specialty — having both is confusing.

### 3. Too many required interactions for the simplest case
Adding a brand-new team member with no fee requires: select type → type name → skip specialty → skip email → skip phone → click continue → skip fee → skip deadline → skip notes → submit. That is 4 clicks minimum across 2 steps, but the user sees ~8 empty fields they must consciously skip.

### 4. "Origem do contato" toggle is always visible
Even when the user has zero contacts in their address book, they see "Novo contato / Minha agenda" and must click "Minha agenda" only to find "Nenhum contato cadastrado." This is a dead-end interaction.

### 5. Step 2 fields are all optional but feel mandatory
Fee, deadline, access level, and notes are all optional, yet they occupy a full second step. For a quick add (just name + role), the user must navigate through an entire empty form.

### 6. Access level defaults to "Leitor" silently
The default is reasonable but the user gets no explanation of what each level means in practice until they open the dropdown.

### 7. No inline validation or progress indicator
The user doesn't know which fields are required vs optional. Only "Nome" has a visible asterisk.

---

## Proposed Redesign: Single-Step Wizard

Merge both steps into one scrollable form, collapse optional fields, and eliminate redundancies.

### Changes

1. **Remove "Especialidade" field** from the new contact form — derive it automatically from the selected type + instrument (for Instrumentista).

2. **Move "Instrumento" into the type grid** — when "Instrumentista" is tapped, show the instrument input inline below the grid, not as a separate section.

3. **Auto-hide "Minha agenda" tab** when the user has zero contacts — show only "Novo contato" with no toggle.

4. **Merge Step 2 into Step 1** as a collapsible "Detalhes opcionais" section (fee, deadline, notes). This eliminates one full navigation step.

5. **Move "Nível de acesso"** to a simple inline toggle (Leitor / Admin) with one-line descriptions, placed right after the contact selection — not buried in step 2.

6. **Reduce minimum required fields to 2**: Professional type + Name (for new) or Professional type + selection (for existing).

7. **Single submit button** at the bottom: "Adicionar à equipe". The button label changes to "Enviar proposta" only when an email is provided.

### Result

```text
SINGLE STEP:
├── Professional type (8 buttons)
│   └── Instrument input (only if Instrumentista)
├── Contact source (hidden if no contacts exist)
│   ├── New: Name*, Email, Phone
│   └── Existing: Select dropdown
├── Access level (inline: Leitor / Admin)
├── ▸ Detalhes opcionais (collapsed)
│   ├── Fee (R$)
│   ├── Deadline
│   └── Notes
└── [Adicionar à equipe]
```

Minimum clicks: **3** (select type → type name → submit).
Fields visible by default: **3-4** (type, name, access level, email).
Optional fields: hidden behind a toggle.

### Files to modify

- **`src/pages/Projects.tsx`**: Restructure wizard JSX to single step, remove `wizardStep` state, collapse optional fields, remove specialty input, conditionally hide source toggle, move access level inline.
- **`src/hooks/useProfessionals.ts`**: No changes needed.
- **`src/data/mockData.ts`**: No changes needed.

