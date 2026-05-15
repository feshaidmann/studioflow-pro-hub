/**
 * Teste de integração de routing: garante que as rotas legadas
 * `/editais/*` e `/palcos/*` SEMPRE redirecionam para `/carreira`,
 * nunca caindo no fallback 404 (`NotFound`).
 *
 * Espelha a configuração de rotas declarada em `src/App.tsx`
 * (somente os redirects legados + uma sentinela `/carreira` e `*`),
 * evitando montar a árvore completa de providers/páginas.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

function CarreiraSentinel() {
  const loc = useLocation();
  return (
    <div data-testid="carreira">
      <span data-testid="pathname">{loc.pathname}</span>
      <span data-testid="search">{loc.search}</span>
    </div>
  );
}

function NotFoundSentinel() {
  return <div data-testid="not-found">404</div>;
}

function EditalInscricaoSentinel() {
  return <div data-testid="edital-inscricao">inscricao</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/carreira" element={<CarreiraSentinel />} />
        {/* Mesma ordem do App.tsx: a rota específica vem antes do catch-all. */}
        <Route path="/editais/inscricao/:id" element={<EditalInscricaoSentinel />} />
        <Route path="/editais" element={<Navigate to="/carreira?tipo=edital&from=legacy" replace />} />
        <Route path="/editais/*" element={<Navigate to="/carreira?tipo=edital&from=legacy" replace />} />
        <Route path="/palcos" element={<Navigate to="/carreira?tipo=palco&from=legacy" replace />} />
        <Route path="/palcos/*" element={<Navigate to="/carreira?tipo=palco&from=legacy" replace />} />
        <Route path="*" element={<NotFoundSentinel />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("redirects legados /editais e /palcos → /carreira", () => {
  const editaisPaths = [
    "/editais",
    "/editais/",
    "/editais/qualquer-coisa",
    "/editais/novo",
    "/editais/123/edit",
    "/editais/abc/def/ghi",
  ];

  const palcosPaths = [
    "/palcos",
    "/palcos/",
    "/palcos/qualquer-coisa",
    "/palcos/123",
    "/palcos/abc/def",
  ];

  it.each(editaisPaths)("'%s' redireciona para /carreira (tipo=edital)", (path) => {
    renderAt(path);
    expect(screen.queryByTestId("not-found")).toBeNull();
    expect(screen.getByTestId("pathname").textContent).toBe("/carreira");
    expect(screen.getByTestId("search").textContent).toContain("tipo=edital");
    expect(screen.getByTestId("search").textContent).toContain("from=legacy");
  });

  it.each(palcosPaths)("'%s' redireciona para /carreira (tipo=palco)", (path) => {
    renderAt(path);
    expect(screen.queryByTestId("not-found")).toBeNull();
    expect(screen.getByTestId("pathname").textContent).toBe("/carreira");
    expect(screen.getByTestId("search").textContent).toContain("tipo=palco");
    expect(screen.getByTestId("search").textContent).toContain("from=legacy");
  });

  it("preserva /editais/inscricao/:id (não é redirecionado)", () => {
    renderAt("/editais/inscricao/00000000-0000-4000-8000-000000000000");
    expect(screen.getByTestId("edital-inscricao")).toBeInTheDocument();
    expect(screen.queryByTestId("carreira")).toBeNull();
    expect(screen.queryByTestId("not-found")).toBeNull();
  });
});
