## Objetivo

Criar testes de regressão para `ProfessionalDetailModal` cobrindo o toggle de dados financeiros.

## Arquivo

`src/components/professionals/ProfessionalDetailModal.test.tsx` (vitest + @testing-library/react já configurados).

## Estratégia de mocks

O componente depende de vários contextos/hooks externos. Mockamos por módulo via `vi.mock` para isolar o toggle:

- `@/contexts/AuthContext` → `useAuth` retornando `{ user, loading }` controlável por teste (variável module-scoped).
- `@/contexts/ProjectContext` → `useProjects` retornando `{ projects: [] }`.
- `@/hooks/useProfessionalMetrics` → `useProfessionalMetrics` retornando `{ metrics, loading: false }` controlável.
- `react-router-dom` → manter `Link` real via `MemoryRouter` (envolver `render`) e mockar apenas `useNavigate` se necessário (importação parcial).
- `localStorage` é nativo do `jsdom`; limpar em `beforeEach`.

Helper:
```ts
const baseProfessional = { id: "p1", name: "Maria", active: true, ... };
const renderModal = () => render(
  <MemoryRouter>
    <ProfessionalDetailModal professional={baseProfessional} onClose={() => {}} onEdit={() => {}} />
  </MemoryRouter>
);
```

## Casos de teste

### 1. Visibilidade do botão conforme dados financeiros

- **Sem dados** (`avgFee: null`, `avgDeliveryDays: null`, `collaborationHistory: []`) → `queryByRole("button", { name: /mostrar dados financeiros/i })` é `null`.
- **Com `avgFee`** → botão presente.
- **Com `avgDeliveryDays`** → botão presente.
- **Com histórico contendo `fee > 0`** → botão presente.
- **Com histórico contendo `deliveryDueDate`** → botão presente.
- **Enquanto `metrics.loading: true`** → botão ausente.

### 2. Toggle alterna painel e ARIA consistentes

- Estado inicial: `aria-expanded="false"`, painel `#prof-financial-panel` ausente, label "Mostrar dados financeiros".
- Click no botão → `aria-expanded="true"`, painel renderizado com valores formatados (`R$1.500`, `5d`), label "Ocultar...".
- Segundo click → volta ao estado inicial. Garante idempotência.

### 3. Persistência por usuário (`localStorage`)

- **Mesmo usuário entre montagens:** logar `user.id="u1"`, abrir, ligar toggle, desmontar, remontar → toggle volta ligado e `localStorage["professionals.show_financial:u1"] === "1"`.
- **Slot anônimo separado:** com `u1` ligar; depois remontar com `user=null` (e `loading=false`) → toggle inicia desligado (lê `:anon`); ao ligar e remontar com `u1` novamente → ainda ligado (não sobrescreveu slot do `u1`).
- **Troca de usuário em runtime:** montar com `u1` ligado salvo previamente; rerender mudando o mock para `u2` (sem nada salvo) → toggle precisa virar desligado **sem** gravar `u2` no storage (só grava após interação). Verificar `localStorage.getItem("professionals.show_financial:u2") === null`.
- **Não cria entrada parasita:** primeira montagem com `u3` novo, sem clicar no toggle → `localStorage.getItem("professionals.show_financial:u3") === null`.
- **Não vaza durante `auth.loading`:** montar com `loading: true`; clicar não deve produzir gravação ainda; resolver para `u4` → estado é hidratado do `:u4` (vazio → `false`) sem gravar.

### 4. Smoke de logout/login (cenário do bug original)

- Pré-popular `localStorage["professionals.show_financial:u1"] = "1"` e `:anon = "0"`.
- Renderizar com `u1` → toggle inicia ligado.
- Rerender com `user=null` → toggle inicia desligado (slot anon).
- Rerender com `u1` → volta ligado. Confirma não-reciclagem visual entre slots.

## Detalhes técnicos

- Usar `userEvent.setup()` para cliques.
- Para mutar o retorno de `useAuth` entre testes/rerenders sem recriar mocks: módulo de mock exporta uma função que lê de uma variável `let currentAuth = { user: null, loading: false }`; testes ajustam essa variável e chamam `rerender(...)` no resultado.
- `beforeEach`: `localStorage.clear()`, resetar `currentAuth` e `currentMetrics`.
- Não há necessidade de testar formatação de moeda detalhada; basta presença do bloco "Cachê médio"/"Prazo médio".

## Fora de escopo

- Testes de outros toggles ou de `ProfessionalDetailModal` para campos não-financeiros.
- Cross-tab sync (`storage` event) — não implementado no componente.
- Testes E2E via browser; ficam só os unitários com jsdom.
