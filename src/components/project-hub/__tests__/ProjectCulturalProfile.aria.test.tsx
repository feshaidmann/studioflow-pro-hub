import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mocks
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { perfil_cultural: { areas: [], estados: [], palavras_chave: ["alpha", "beta", "gamma"], porte: "" } },
            error: null,
          }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import ProjectCulturalProfile from "../ProjectCulturalProfile";

describe("ProjectCulturalProfile — aria-label das palavras-chave", () => {
  beforeEach(() => cleanup());

  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    const trigger = await screen.findByRole("button", { name: /Perfil Cultural do Projeto/i });
    await user.click(trigger);
  };

  it("renderiza aria-label correspondente a cada palavra-chave atual", async () => {
    const user = userEvent.setup();
    render(<ProjectCulturalProfile projectId="proj-1" />);
    await openPanel(user);

    expect(await screen.findByLabelText("Remover palavra-chave alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover palavra-chave beta")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover palavra-chave gamma")).toBeInTheDocument();
  });

  it("atualiza os aria-labels após remover uma palavra-chave (sem labels desatualizados)", async () => {
    const user = userEvent.setup();
    render(<ProjectCulturalProfile projectId="proj-1" />);
    await openPanel(user);

    const removeBeta = await screen.findByLabelText("Remover palavra-chave beta");
    await user.click(removeBeta);

    await waitFor(() => {
      expect(screen.queryByLabelText("Remover palavra-chave beta")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Remover palavra-chave alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover palavra-chave gamma")).toBeInTheDocument();
  });

  it("aria-label da palavra-chave adicionada reflete o texto digitado", async () => {
    const user = userEvent.setup();
    render(<ProjectCulturalProfile projectId="proj-1" />);
    await openPanel(user);

    const input = await screen.findByLabelText("Nova palavra-chave");
    await user.type(input, "delta");
    await user.click(screen.getByLabelText("Adicionar palavra-chave"));

    expect(await screen.findByLabelText("Remover palavra-chave delta")).toBeInTheDocument();
  });

  it("após múltiplas remoções, nenhum aria-label antigo permanece", async () => {
    const user = userEvent.setup();
    render(<ProjectCulturalProfile projectId="proj-1" />);
    await openPanel(user);

    await user.click(await screen.findByLabelText("Remover palavra-chave alpha"));
    await user.click(await screen.findByLabelText("Remover palavra-chave gamma"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Remover palavra-chave alpha")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Remover palavra-chave gamma")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Remover palavra-chave beta")).toBeInTheDocument();
  });
});
