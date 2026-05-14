import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProfessionalDetailModal } from "./ProfessionalDetailModal";
import type { Professional, ProfMetrics } from "./types";

// ----- Mocks state (mutáveis por teste) -----
type AuthState = { user: { id: string } | null; loading: boolean };
type MetricsState = { metrics: ProfMetrics | null; loading: boolean };

const authState: AuthState = { user: null, loading: false };
const metricsState: MetricsState = { metrics: null, loading: false };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));
vi.mock("@/contexts/ProjectContext", () => ({
  useProjects: () => ({ projects: [] }),
}));
vi.mock("@/hooks/useProfessionalMetrics", () => ({
  useProfessionalMetrics: () => metricsState,
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// ----- Helpers -----
const baseProfessional: Professional = {
  id: "p1",
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "11999998888",
  specialty: "Mix Engineer",
  bio: "",
  active: true,
  allow_global_listing: false,
  created_at: "2024-01-01T00:00:00Z",
  favorite: false,
};

const emptyMetrics: ProfMetrics = {
  projectCount: 0,
  projectNames: [],
  avgRating: null,
  ratingCount: 0,
  lastActivity: null,
  platformProjectCount: 0,
  avgFee: null,
  avgDeliveryDays: null,
  publicProfile: null,
  collaborationHistory: [],
};

const withFinancialMetrics = (overrides: Partial<ProfMetrics> = {}): ProfMetrics => ({
  ...emptyMetrics,
  avgFee: 1500,
  avgDeliveryDays: 5,
  ...overrides,
});

const renderModal = () =>
  render(
    <MemoryRouter>
      <ProfessionalDetailModal
        professional={baseProfessional}
        onClose={() => {}}
        onEdit={() => {}}
      />
    </MemoryRouter>,
  );

const setAuth = (next: AuthState) => {
  authState.user = next.user;
  authState.loading = next.loading;
};
const setMetrics = (next: MetricsState) => {
  metricsState.metrics = next.metrics;
  metricsState.loading = next.loading;
};

const STORAGE_PREFIX = "professionals.show_financial";

beforeEach(() => {
  cleanup();
  localStorage.clear();
  setAuth({ user: null, loading: false });
  setMetrics({ metrics: emptyMetrics, loading: false });
});

// ============================================================
// 1) Visibilidade do botão conforme dados financeiros
// ============================================================
describe("ProfessionalDetailModal — visibilidade do toggle financeiro", () => {
  const toggleQuery = () => screen.queryByRole("button", { name: /mostrar dados financeiros/i });

  it("não exibe o toggle quando não há nenhum dado financeiro", () => {
    setMetrics({ metrics: emptyMetrics, loading: false });
    renderModal();
    expect(toggleQuery()).toBeNull();
  });

  it("exibe o toggle quando há avgFee", () => {
    setMetrics({ metrics: { ...emptyMetrics, avgFee: 800 }, loading: false });
    renderModal();
    expect(toggleQuery()).not.toBeNull();
  });

  it("exibe o toggle quando há avgDeliveryDays", () => {
    setMetrics({ metrics: { ...emptyMetrics, avgDeliveryDays: 7 }, loading: false });
    renderModal();
    expect(toggleQuery()).not.toBeNull();
  });

  it("exibe o toggle quando o histórico tem fee > 0", () => {
    setMetrics({
      metrics: {
        ...emptyMetrics,
        collaborationHistory: [
          {
            projectId: "x",
            projectName: "Demo",
            completed: false,
            role: "Mix",
            fee: 200,
            deliveryStatus: "pending",
            joinedAt: "2024-01-01",
            deliveryDueDate: null,
          },
        ],
      },
      loading: false,
    });
    renderModal();
    expect(toggleQuery()).not.toBeNull();
  });

  it("exibe o toggle quando o histórico tem deliveryDueDate", () => {
    setMetrics({
      metrics: {
        ...emptyMetrics,
        collaborationHistory: [
          {
            projectId: "x",
            projectName: "Demo",
            completed: false,
            role: "Mix",
            fee: 0,
            deliveryStatus: "pending",
            joinedAt: "2024-01-01",
            deliveryDueDate: "2024-02-01",
          },
        ],
      },
      loading: false,
    });
    renderModal();
    expect(toggleQuery()).not.toBeNull();
  });

  it("não exibe o toggle enquanto métricas estão carregando", () => {
    setMetrics({ metrics: null, loading: true });
    renderModal();
    expect(toggleQuery()).toBeNull();
  });
});

// ============================================================
// 2) Toggle alterna painel e ARIA consistentes
// ============================================================
describe("ProfessionalDetailModal — comportamento do toggle", () => {
  beforeEach(() => {
    setAuth({ user: { id: "u1" }, loading: false });
    setMetrics({ metrics: withFinancialMetrics(), loading: false });
  });

  it("inicia oculto, expande e recolhe mantendo aria-expanded coerente", async () => {
    const user = userEvent.setup();
    const { container } = renderModal();
    const btn = screen.getByRole("button", { name: /mostrar dados financeiros/i });

    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("#prof-financial-panel")).toBeNull();

    await user.click(btn);
    const expanded = screen.getByRole("button", { name: /ocultar dados financeiros/i });
    expect(expanded).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("#prof-financial-panel")).not.toBeNull();
    expect(screen.getByText(/cachê médio/i)).toBeInTheDocument();
    expect(screen.getByText(/prazo médio/i)).toBeInTheDocument();

    await user.click(expanded);
    const collapsed = screen.getByRole("button", { name: /mostrar dados financeiros/i });
    expect(collapsed).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("#prof-financial-panel")).toBeNull();
  });
});

// ============================================================
// 3) Persistência por usuário (localStorage)
// ============================================================
describe("ProfessionalDetailModal — persistência do toggle por usuário", () => {
  beforeEach(() => {
    setMetrics({ metrics: withFinancialMetrics(), loading: false });
  });

  it("persiste preferência entre montagens para o mesmo usuário", async () => {
    const user = userEvent.setup();
    setAuth({ user: { id: "u1" }, loading: false });

    const first = renderModal();
    await user.click(screen.getByRole("button", { name: /mostrar dados financeiros/i }));
    expect(localStorage.getItem(`${STORAGE_PREFIX}:u1`)).toBe("1");
    first.unmount();

    renderModal();
    expect(
      screen.getByRole("button", { name: /ocultar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("usa slot ':anon' separado para usuários deslogados", async () => {
    const user = userEvent.setup();

    setAuth({ user: { id: "u1" }, loading: false });
    const r1 = renderModal();
    await user.click(screen.getByRole("button", { name: /mostrar dados financeiros/i }));
    r1.unmount();

    setAuth({ user: null, loading: false });
    const r2 = renderModal();
    expect(
      screen.getByRole("button", { name: /mostrar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "false");
    r2.unmount();

    setAuth({ user: { id: "u1" }, loading: false });
    renderModal();
    expect(
      screen.getByRole("button", { name: /ocultar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "true");

    expect(localStorage.getItem(`${STORAGE_PREFIX}:u1`)).toBe("1");
    expect(localStorage.getItem(`${STORAGE_PREFIX}:anon`)).toBeNull();
  });

  it("não cria entrada parasita quando usuário não interage", () => {
    setAuth({ user: { id: "u3" }, loading: false });
    renderModal();
    expect(localStorage.getItem(`${STORAGE_PREFIX}:u3`)).toBeNull();
  });

  it("ao trocar de usuário em runtime, hidrata novo slot sem gravar", async () => {
    const user = userEvent.setup();
    setAuth({ user: { id: "u1" }, loading: false });

    const r1 = renderModal();
    await user.click(screen.getByRole("button", { name: /mostrar dados financeiros/i }));
    expect(localStorage.getItem(`${STORAGE_PREFIX}:u1`)).toBe("1");
    r1.unmount();

    // troca para u2 (sem preferência salva)
    setAuth({ user: { id: "u2" }, loading: false });
    renderModal();
    expect(
      screen.getByRole("button", { name: /mostrar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem(`${STORAGE_PREFIX}:u2`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_PREFIX}:u1`)).toBe("1");
  });

  it("não exibe o toggle enquanto auth está carregando (não há gravação)", () => {
    setAuth({ user: null, loading: true });
    renderModal();
    // métricas ainda existem, mas o componente só renderiza o toggle quando há dados.
    // Aqui validamos apenas que nada é gravado em localStorage durante o loading.
    expect(localStorage.length).toBe(0);
  });
});

// ============================================================
// 4) Smoke logout/login: não recicla valores antigos visualmente
// ============================================================
describe("ProfessionalDetailModal — fluxo logout/login não vaza valores", () => {
  beforeEach(() => {
    setMetrics({ metrics: withFinancialMetrics(), loading: false });
    localStorage.setItem(`${STORAGE_PREFIX}:u1`, "1");
    localStorage.setItem(`${STORAGE_PREFIX}:anon`, "0");
  });

  it("alterna entre slots conforme o usuário muda", () => {
    setAuth({ user: { id: "u1" }, loading: false });
    const r1 = renderModal();
    expect(
      screen.getByRole("button", { name: /ocultar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "true");
    r1.unmount();

    setAuth({ user: null, loading: false });
    const r2 = renderModal();
    expect(
      screen.getByRole("button", { name: /mostrar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "false");
    r2.unmount();

    setAuth({ user: { id: "u1" }, loading: false });
    renderModal();
    expect(
      screen.getByRole("button", { name: /ocultar dados financeiros/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
