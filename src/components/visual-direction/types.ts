export interface ArtisticProfile {
  genres: string[];
  moods: string[];
  artist_refs: string;
  external_refs?: string;
  palette: string[];
  identity_phrase?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  label: string; // sempre "Referência de estilo"
  style_tag: string;
  selected?: boolean;
}

export interface CopyOption {
  id: "A" | "B" | "C" | string;
  label: string;
  text: string;
}

export interface PaletteResult {
  colors: string[];
  rationale: string;
}

export interface VisualBriefing {
  id: string;
  project_id: string;
  user_id: string;
  version: number;
  artistic_profile: ArtisticProfile;
  generated_images: GeneratedImage[];
  approved_images: GeneratedImage[];
  generated_palette: PaletteResult;
  copy_options: CopyOption[];
  approved_copy: string;
  designer_notes: string;
  regeneration_count: number;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export const MOOD_OPTIONS = [
  "Melancólico", "Eufórico", "Sombrio", "Etéreo", "Cru", "Sofisticado",
  "Nostálgico", "Onírico", "Urgente", "Íntimo", "Épico", "Minimalista",
] as const;

export const PALETTE_PRESETS: { name: string; hex: string }[] = [
  { name: "Dourado JSP", hex: "#C9A84C" },
  { name: "Violeta JSP", hex: "#8B6FD4" },
  { name: "Verde JSP", hex: "#3DB882" },
  { name: "Azul JSP", hex: "#2D9CDB" },
  { name: "Preto JSP", hex: "#080810" },
];
