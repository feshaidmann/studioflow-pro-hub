// Gêneros musicais — lista padronizada para projetos e perfis
export const GENRE_OPTIONS = [
  "MPB",
  "Sertanejo",
  "Funk",
  "Pop",
  "Rock",
  "Hip-Hop / Trap",
  "R&B / Soul",
  "Gospel",
  "Eletrônica",
  "Forró",
  "Pagode / Samba",
  "Bossa Nova / Jazz",
  "Indie / Alternativo",
  "Reggae / Reggaeton",
  "Axé / Pagodão",
  "Pisadinha / Brega Funk",
  "Clássico / Instrumental",
  "Outros",
] as const;

// Top gêneros para grids compactos (onboarding)
export const TOP_GENRES = [
  "MPB", "Sertanejo", "Funk", "Pop", "Rock",
  "Hip-Hop / Trap", "Gospel", "Eletrônica", "Forró", "Pagode / Samba", "Outros",
] as const;

export const AUDIENCE_SIZE_OPTIONS = [
  { value: "0-500",   label: "Menos de 500 seguidores" },
  { value: "500-2k",  label: "500 a 2.000 seguidores" },
  { value: "2k-10k",  label: "2.000 a 10.000 seguidores" },
  { value: "10k-50k", label: "10.000 a 50.000 seguidores" },
  { value: "50k+",    label: "Mais de 50.000 seguidores" },
] as const;

export const DISTRIBUTOR_OPTIONS = [
  "DistroKid",
  "TuneCore",
  "CD Baby",
  "Believe",
  "ONErpm",
  "Amuse",
  "Orchard",
  "Ingrooves",
  "Outra",
] as const;

export const BRAZIL_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;
