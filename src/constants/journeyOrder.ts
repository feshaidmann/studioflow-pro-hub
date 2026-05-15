/**
 * Ordem canônica da jornada do artista.
 *
 * Usada pelo drawer "Mais" no mobile (e por qualquer outro lugar que precise
 * exibir os módulos de gestão na mesma sequência narrativa).
 *
 * Para reordenar/adicionar/remover itens da jornada, edite APENAS este array.
 */
export const JOURNEY_ORDER: readonly string[] = [
  "/carreira",      // 1º — oportunidades (editais + palcos)
  "/music-dna",     // 2º — entenda a faixa
  "/professionals", // 3º — equipe conforme necessidade
] as const;
