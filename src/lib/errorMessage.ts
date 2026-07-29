/**
 * Extrai uma mensagem legível de um erro desconhecido (catch (e: unknown)).
 * Evita o uso de `any` em blocos catch e mantém um fallback previsível na UI.
 */
export function getErrorMessage(error: unknown, fallback = "Erro inesperado"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}
