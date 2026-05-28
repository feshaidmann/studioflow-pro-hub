/**
 * Ordem canônica da jornada do artista.
 *
 * Usada pelo drawer "Mais" no mobile e pela sidebar desktop para exibir
 * os módulos de ferramentas na mesma sequência narrativa em ambas as plataformas.
 *
 * Para reordenar/adicionar/remover itens da jornada, edite APENAS este array.
 */
export const JOURNEY_ORDER: readonly string[] = [
  "/carreira",      // 1º — oportunidades (editais + palcos)
  "/music-dna",     // 2º — entenda a faixa antes de submeter
  "/professionals", // 3º — equipe conforme necessidade
  "/captadores",    // 4º — bookers e produtores executivos
] as const;
