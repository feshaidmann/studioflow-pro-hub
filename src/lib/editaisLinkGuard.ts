/**
 * Runtime guard para links de /editais.
 *
 * Rotas válidas atualmente registradas em App.tsx:
 *   - /editais                       → redirect para /carreira?tipo=edital
 *   - /editais/inscricao/:id         → página EditalInscricao (id deve ser UUID)
 *
 * Qualquer outro caminho sob /editais é considerado quebrado/legacy e
 * deve emitir um warning antes de o usuário cair no fallback 404.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EditaisValidation =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Valida um pathname (sem querystring) contra as rotas de /editais conhecidas.
 * Retorna `valid: true` para qualquer caminho que NÃO pertença a /editais —
 * a função só opina sobre o próprio namespace.
 */
export function validateEditaisPath(pathname: string): EditaisValidation {
  if (!pathname.startsWith("/editais")) return { valid: true };

  // /editais (raiz) → redirect ativo
  if (pathname === "/editais" || pathname === "/editais/") {
    return { valid: true };
  }

  // /editais/inscricao/:id
  const inscricaoMatch = pathname.match(/^\/editais\/inscricao\/([^/]+)\/?$/);
  if (inscricaoMatch) {
    const id = inscricaoMatch[1];
    if (!UUID_RE.test(id)) {
      return {
        valid: false,
        reason: `id da inscrição não é um UUID válido ("${id}").`,
      };
    }
    return { valid: true };
  }

  return {
    valid: false,
    reason: "rota /editais desconhecida — provavelmente um link legado.",
  };
}

/**
 * Loga um warning estruturado no console quando um link de /editais é inválido.
 * Idempotente por URL durante a sessão para não floodar o console.
 */
const warnedPaths = new Set<string>();
export function warnBrokenEditaisLink(
  pathname: string,
  source: "navigation" | "anchor-click",
  extra?: Record<string, unknown>,
) {
  if (warnedPaths.has(`${source}:${pathname}`)) return;
  warnedPaths.add(`${source}:${pathname}`);

  const result = validateEditaisPath(pathname);
  if (result.valid) return;

  // eslint-disable-next-line no-console
  console.warn(
    `[editais-link-guard] link quebrado detectado (${source}): ${pathname} — ${result.reason}`,
    extra ?? {},
  );
}
