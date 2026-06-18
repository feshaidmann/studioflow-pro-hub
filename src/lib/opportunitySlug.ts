/**
 * Gera um slug estável para identificar oportunidades pelo par nome+organizador.
 * Usado como session_key no banco e como chave de deduplicação em memória.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
}

export function opportunitySlug(nome: string, organizador: string): string {
  return slugify(`${nome}_${organizador}`);
}
