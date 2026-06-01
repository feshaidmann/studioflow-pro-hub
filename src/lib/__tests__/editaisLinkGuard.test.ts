import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEditaisPath, warnBrokenEditaisLink } from "../editaisLinkGuard";

describe("validateEditaisPath", () => {
  it("returns valid for paths outside /editais namespace", () => {
    expect(validateEditaisPath("/dashboard")).toEqual({ valid: true });
    expect(validateEditaisPath("/carreira")).toEqual({ valid: true });
    expect(validateEditaisPath("/")).toEqual({ valid: true });
    expect(validateEditaisPath("/projects/abc")).toEqual({ valid: true });
  });

  it("returns valid for /editais root", () => {
    expect(validateEditaisPath("/editais")).toEqual({ valid: true });
    expect(validateEditaisPath("/editais/")).toEqual({ valid: true });
  });

  it("returns valid for /editais/inscricao with valid UUID", () => {
    const result = validateEditaisPath("/editais/inscricao/550e8400-e29b-41d4-a716-446655440000");
    expect(result).toEqual({ valid: true });
  });

  it("returns invalid for /editais/inscricao with non-UUID", () => {
    const result = validateEditaisPath("/editais/inscricao/not-a-uuid");
    expect(result.valid).toBe(false);
    expect((result as { valid: false; reason: string }).reason).toContain("UUID");
  });

  it("returns invalid for /editais/inscricao with empty id", () => {
    const result = validateEditaisPath("/editais/inscricao/");
    // Does not match inscricao pattern, falls through to unknown route
    expect(result.valid).toBe(false);
  });

  it("returns invalid for unknown /editais sub-path", () => {
    const result = validateEditaisPath("/editais/lista");
    expect(result.valid).toBe(false);
    expect((result as { valid: false; reason: string }).reason).toContain("legado");
  });

  it("returns invalid for deep nested unknown /editais path", () => {
    const result = validateEditaisPath("/editais/categorias/musica/detalhe");
    expect(result.valid).toBe(false);
  });

  it("handles UUID variants (versions 1-5)", () => {
    // Version 4 UUID
    const v4 = "/editais/inscricao/123e4567-e89b-42d4-a456-426614174000";
    expect(validateEditaisPath(v4)).toEqual({ valid: true });
  });
});

describe("warnBrokenEditaisLink", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("does not warn for valid paths", () => {
    warnBrokenEditaisLink("/editais", "navigation");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns for invalid /editais paths", () => {
    warnBrokenEditaisLink("/editais/broken-path-unique-1", "anchor-click");
    expect(console.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain("editais-link-guard");
  });

  it("is idempotent — same path + source only warns once", () => {
    warnBrokenEditaisLink("/editais/idempotent-test-path", "navigation");
    warnBrokenEditaisLink("/editais/idempotent-test-path", "navigation");
    warnBrokenEditaisLink("/editais/idempotent-test-path", "navigation");
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("warns separately for different sources of the same path", () => {
    warnBrokenEditaisLink("/editais/source-test-path", "navigation");
    warnBrokenEditaisLink("/editais/source-test-path", "anchor-click");
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("includes the reason in the warning message", () => {
    warnBrokenEditaisLink("/editais/reason-test-path", "navigation");
    const message = vi.mocked(console.warn).mock.calls[0][0] as string;
    expect(message).toMatch(/legado|UUID/i);
  });
});
