// Slug canônico para agrupar versões da mesma música.
// Remove acentos, pontuação, marcadores comuns de versão (v1, v2, demo, mix, master, final…)
// para que "Ondas v1.wav", "ondas-demo-mix", "Ondas (master)" caiam no mesmo grupo.

const VERSION_MARKERS = [
  "v\\d+",
  "ver\\d+",
  "versao\\s*\\d+",
  "vers\\s*\\d+",
  "rev\\d+",
  "take\\s*\\d+",
  "demo",
  "rough",
  "rascunho",
  "draft",
  "mix(?:\\s*bruto)?",
  "premix",
  "pre-?master",
  "mastered?",
  "master(?:izado)?",
  "final",
  "remix",
  "edit",
  "edition",
  "alt(?:ernate)?",
  "instrumental",
  "acapella",
];

export function trackSlug(name: string): string {
  let s = (name || "").toLowerCase().trim();
  // remove extensão
  s = s.replace(/\.[a-z0-9]{2,5}$/i, "");
  // normaliza acentos
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // remove conteúdo entre () e []
  s = s.replace(/[\(\[][^\)\]]*[\)\]]/g, " ");
  // marca delimitadores
  s = s.replace(/[_\-.]+/g, " ");
  // remove marcadores de versão
  const re = new RegExp(`\\b(?:${VERSION_MARKERS.join("|")})\\b`, "gi");
  s = s.replace(re, " ");
  // colapsa espaços
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "faixa-sem-nome";
}
