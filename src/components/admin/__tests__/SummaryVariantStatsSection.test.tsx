import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { SummaryVariantStatsSection } from "../SummaryVariantStatsSection";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

interface Row {
  summary_variant: string;
  impressions: number;
  sample_size: number;
  thumbs_up_rate: number;
  thumbs_down_rate: number;
  saved_rate: number;
  copied_rate: number;
  task_created_rate: number;
  composite_score: number;
}

const row = (overrides: Partial<Row> & Pick<Row, "summary_variant">): Row => ({
  impressions: 50,
  sample_size: 60,
  thumbs_up_rate: 0.2,
  thumbs_down_rate: 0.05,
  saved_rate: 0.3,
  copied_rate: 0.1,
  task_created_rate: 0.25,
  composite_score: 0.45,
  ...overrides,
});

describe("SummaryVariantStatsSection — agrupamento por versão do prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invoca a RPC get_summary_variant_stats", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("get_summary_variant_stats"));
  });

  it("renderiza uma seção por versão de prompt distinta (v1 e v2)", async () => {
    mockRpc.mockResolvedValue({
      data: [
        row({ summary_variant: "A.v1" }),
        row({ summary_variant: "B.v1" }),
        row({ summary_variant: "A.v2" }),
        row({ summary_variant: "B.v2" }),
      ],
      error: null,
    });

    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getByText(/Prompt v2/i)).toBeInTheDocument());
    expect(screen.getByText(/Prompt v1/i)).toBeInTheDocument();
    // a versão mais recente recebe badge "Ativo"
    expect(screen.getByText(/Ativo/i)).toBeInTheDocument();
    // ambas variantes versionadas aparecem como rótulos de card
    expect(screen.getByText("A.v2")).toBeInTheDocument();
    expect(screen.getByText("B.v2")).toBeInTheDocument();
    expect(screen.getByText("A.v1")).toBeInTheDocument();
    expect(screen.getByText("B.v1")).toBeInTheDocument();
  });

  it("declara vencedora APENAS quando amostra (≥100 imp.) e delta (≥10pp) batem dentro da mesma versão", async () => {
    mockRpc.mockResolvedValue({
      data: [
        // v2 cumpre critério: B ganha por 15pp
        row({ summary_variant: "A.v2", impressions: 120, task_created_rate: 0.20 }),
        row({ summary_variant: "B.v2", impressions: 110, task_created_rate: 0.35 }),
        // v1 tem amostra mas delta insuficiente (<10pp) → inconclusivo
        row({ summary_variant: "A.v1", impressions: 150, task_created_rate: 0.30 }),
        row({ summary_variant: "B.v1", impressions: 140, task_created_rate: 0.32 }),
      ],
      error: null,
    });

    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getByText(/Concluído · vencedora B/i)).toBeInTheDocument());
    expect(screen.getByText(/inconclusivo/i)).toBeInTheDocument();
    // existe exatamente uma badge "Vencedora" (na v2)
    expect(screen.getAllByText(/Vencedora/i)).toHaveLength(1);
  });

  it("não mistura dados de versões diferentes ao calcular vencedora", async () => {
    // Se misturasse, A teria 30+150=180 task_rate combinado e venceria B (35+32).
    // Como cada versão é avaliada isoladamente, NENHUMA vencedora cross-version surge.
    mockRpc.mockResolvedValue({
      data: [
        row({ summary_variant: "A.v1", impressions: 150, task_created_rate: 0.50 }),
        row({ summary_variant: "B.v1", impressions: 150, task_created_rate: 0.48 }),
        row({ summary_variant: "A.v2", impressions: 120, task_created_rate: 0.10 }),
        row({ summary_variant: "B.v2", impressions: 120, task_created_rate: 0.12 }),
      ],
      error: null,
    });

    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getAllByText(/inconclusivo/i).length).toBeGreaterThan(0));
    // nenhuma das versões cruza o delta de 10pp → nenhuma vencedora
    expect(screen.queryByText(/Vencedora/i)).not.toBeInTheDocument();
  });

  it("mostra 'Em andamento' enquanto a amostra de impressões for insuficiente", async () => {
    mockRpc.mockResolvedValue({
      data: [
        row({ summary_variant: "A.v2", impressions: 30, task_created_rate: 0.5 }),
        row({ summary_variant: "B.v2", impressions: 20, task_created_rate: 0.1 }),
      ],
      error: null,
    });

    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getByText(/Em andamento/i)).toBeInTheDocument());
    expect(screen.queryByText(/Vencedora/i)).not.toBeInTheDocument();
  });

  it("rotula corretamente a versão ativa (mais recente) entre múltiplas versões", async () => {
    mockRpc.mockResolvedValue({
      data: [
        row({ summary_variant: "A.v1" }),
        row({ summary_variant: "A.v3" }),
        row({ summary_variant: "A.v2" }),
      ],
      error: null,
    });

    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getByText(/Prompt v3/i)).toBeInTheDocument());
    // a badge "Ativo" deve aparecer na seção v3 (a maior)
    const ativoBadge = screen.getByText(/Ativo/i);
    const v3Section = screen.getByText(/Prompt v3/i).closest("div")?.parentElement;
    expect(v3Section).toBeTruthy();
    expect(within(v3Section as HTMLElement).getByText(/Ativo/i)).toBe(ativoBadge);
  });

  it("exibe mensagem de erro retornada pela RPC sem quebrar", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    render(<SummaryVariantStatsSection />);
    await waitFor(() => expect(screen.getByText(/permission denied/i)).toBeInTheDocument());
  });
});
