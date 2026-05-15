import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GENRE_OPTIONS, DISTRIBUTOR_OPTIONS } from "@/constants/genreOptions";

// ── Section / item definitions ──

export interface ChecklistItemDef {
  key: string;
  label: string;
  type: "check" | "text" | "select";
  options?: readonly string[];
}

export interface SectionDef {
  key: string;
  label: string;
  items: ChecklistItemDef[];
}

export const RELEASE_SECTIONS: SectionDef[] = [
  {
    key: "distribuicao",
    label: "Distribuição",
    items: [
      { key: "distribuidora", label: "Distribuidora definida", type: "select", options: DISTRIBUTOR_OPTIONS },
      { key: "data_lancamento", label: "Data de lançamento", type: "text" },
      { key: "upc", label: "Código UPC", type: "text" },
      { key: "isrc", label: "Código ISRC", type: "text" },
      { key: "idioma", label: "Idioma principal", type: "text" },
      { key: "genero", label: "Gênero / subgênero", type: "select", options: GENRE_OPTIONS },
    ],
  },
  {
    key: "metadados",
    label: "Metadados",
    items: [
      { key: "titulo", label: "Título da release", type: "text" },
      { key: "artista_principal", label: "Artista principal", type: "text" },
      { key: "feat", label: "Feat / colaboradores", type: "text" },
      { key: "compositores", label: "Compositores", type: "text" },
      { key: "produtores", label: "Produtores", type: "text" },
      { key: "creditos", label: "Créditos completos", type: "check" },
    ],
  },
  {
    key: "juridico",
    label: "Jurídico",
    items: [
      { key: "splits", label: "Splits definidos", type: "check" },
      { key: "registro", label: "Registro de obra", type: "check" },
      { key: "contratos", label: "Contratos assinados", type: "check" },
      { key: "autorizacoes", label: "Autorizações (sample, cover, etc.)", type: "check" },
    ],
  },
  {
    key: "conteudo",
    label: "Conteúdo",
    items: [
      { key: "capa", label: "Capa (3000×3000 RGB)", type: "check" },
      { key: "thumbnail", label: "Thumbnail YouTube", type: "check" },
      { key: "teaser", label: "Teaser / preview", type: "check" },
      { key: "reels", label: "Reels preparados", type: "check" },
      { key: "stories", label: "Stories preparados", type: "check" },
      { key: "press_kit", label: "Press kit / release notes", type: "check" },
    ],
  },
  {
    key: "plataformas",
    label: "Plataformas",
    items: [
      { key: "spotify", label: "Spotify for Artists (pitch)", type: "check" },
      { key: "youtube", label: "YouTube (upload / premiere)", type: "check" },
      { key: "tiktok", label: "TikTok (pré-save / sound)", type: "check" },
      { key: "instagram", label: "Instagram (countdown / bio)", type: "check" },
      { key: "musixmatch", label: "Letra cadastrada (MusixMatch)", type: "check" },
      { key: "outras", label: "Outras plataformas", type: "check" },
    ],
  },
  {
    key: "divulgacao",
    label: "Divulgação",
    items: [
      { key: "presave_link", label: "Link de pré-save", type: "text" },
      { key: "newsletter", label: "Newsletter / mailing", type: "check" },
      { key: "press_release", label: "Assessoria de imprensa (release)", type: "check" },
      { key: "whatsapp_contatos", label: "Compartilhar com contatos (WhatsApp)", type: "check" },
    ],
  },
  {
    key: "status_final",
    label: "Status Final",
    items: [
      { key: "pronto_distribuir", label: "Pronto para distribuir", type: "check" },
      { key: "pronto_publicar", label: "Pronto para publicar", type: "check" },
      { key: "pendencias_criticas", label: "Sem pendências críticas", type: "check" },
    ],
  },
];

// ── State shape ──

export type ItemState = { checked: boolean; value: string };
export type ChecklistState = Record<string, ItemState>;

function defaultState(): ChecklistState {
  const s: ChecklistState = {};
  for (const sec of RELEASE_SECTIONS) {
    for (const item of sec.items) {
      s[item.key] = { checked: false, value: "" };
    }
  }
  return s;
}

// ── Standalone helper: marca um item do checklist sem precisar do hook ──
// Usado pelo módulo Direção Visual para auto-marcar capa/reels/stories/thumbnail
// quando o usuário salva uma arte vinculada ao projeto.
export async function markChecklistItem(
  projectId: string,
  userId: string,
  key: string,
): Promise<{ alreadyChecked: boolean; label: string | null }> {
  const def = RELEASE_SECTIONS.flatMap((s) => s.items).find((i) => i.key === key);
  const label = def?.label ?? null;

  const { data: existing } = await supabase
    .from("release_checklists")
    .select("id, items")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    const current = (existing.items as ChecklistState) ?? {};
    if (current[key]?.checked) return { alreadyChecked: true, label };
    const next = { ...defaultState(), ...current, [key]: { checked: true, value: "" } };
    await supabase
      .from("release_checklists")
      .update({ items: next as any })
      .eq("id", existing.id);
  } else {
    const next = { ...defaultState(), [key]: { checked: true, value: "" } };
    await supabase
      .from("release_checklists")
      .insert({ project_id: projectId, user_id: userId, items: next as any });
  }
  return { alreadyChecked: false, label };
}

// ── Hook ──

export function useReleaseChecklist(projectId: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistState>(defaultState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const rowIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch
  useEffect(() => {
    if (!user || !projectId) return;
    setLoading(true);
    supabase
      .from("release_checklists")
      .select("id, items")
      .eq("project_id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          rowIdRef.current = data.id;
          const merged = { ...defaultState(), ...(data.items as ChecklistState) };
          setItems(merged);
        } else {
          rowIdRef.current = null;
          setItems(defaultState());
        }
        setLoading(false);
      });
  }, [user, projectId]);

  // Persist (debounced)
  const persist = useCallback(
    (next: ChecklistState) => {
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        if (rowIdRef.current) {
          await supabase
            .from("release_checklists")
            .update({ items: next as any })
            .eq("id", rowIdRef.current);
        } else {
          const { data } = await supabase
            .from("release_checklists")
            .insert({ project_id: projectId, user_id: user.id, items: next as any })
            .select("id")
            .single();
          if (data) rowIdRef.current = data.id;
        }
        setSaving(false);
      }, 600);
    },
    [user, projectId],
  );

  const toggleCheck = useCallback(
    (key: string) => {
      setItems((prev) => {
        const next = { ...prev, [key]: { ...prev[key], checked: !prev[key].checked } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setValue = useCallback(
    (key: string, value: string) => {
      setItems((prev) => {
        const next = { ...prev, [key]: { ...prev[key], value, checked: value.trim().length > 0 } };
        persist(next);
        return next;
      });
      // Mirror to projects table for market intelligence
      if (projectId && value.trim()) {
        if (key === "distribuidora") {
          supabase.from("projects").update({ distributor: value }).eq("id", projectId);
        } else if (key === "genero") {
          supabase.from("projects").update({ genre: value }).eq("id", projectId);
        }
      }
    },
    [persist, projectId],
  );

  // Stats
  const totalItems = RELEASE_SECTIONS.reduce((a, s) => a + s.items.length, 0);
  const checkedItems = Object.values(items).filter((i) => i.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return { items, loading, saving, toggleCheck, setValue, progress, checkedItems, totalItems, sections: RELEASE_SECTIONS };
}
