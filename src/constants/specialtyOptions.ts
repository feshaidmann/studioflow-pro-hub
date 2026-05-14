// Especialidades padronizadas — usadas no perfil público e ao adicionar membros
export const SPECIALTY_OPTIONS = [
  "Guitarrista", "Baixista", "Baterista", "Tecladista", "Violinista",
  "Violonista", "Cantor(a)", "Produtor", "Mix Engineer", "Mastering Engineer",
  "Compositor", "Arranjador", "Trompetista", "Saxofonista", "Percussionista",
  "Marketing Musical", "Social Media", "Designer Gráfico", "Assessor de Imprensa",
  "Videomaker", "Fotógrafo", "Diretor Criativo",
] as const;

export const SPECIALTY_NONE = "__none__";
export const SPECIALTY_OTHER = "Outro";

export function isPresetSpecialty(v: string): boolean {
  return (SPECIALTY_OPTIONS as readonly string[]).includes(v);
}
