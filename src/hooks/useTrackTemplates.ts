import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TemplateTrack {
  id: string;
  templateId: string;
  name: string;
  position: number;
}

export interface TrackTemplate {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  tracks: TemplateTrack[];
}

export function useTrackTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TrackTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); return; }
    setLoading(true);
    const { data: tpls } = await supabase
      .from("track_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (tpls && tpls.length > 0) {
      const ids = tpls.map((t: any) => t.id);
      const { data: trkRows } = await supabase
        .from("template_tracks")
        .select("*")
        .in("template_id", ids)
        .order("position", { ascending: true });
      const tracksByTemplate: Record<string, TemplateTrack[]> = {};
      (trkRows || []).forEach((r: any) => {
        if (!tracksByTemplate[r.template_id]) tracksByTemplate[r.template_id] = [];
        tracksByTemplate[r.template_id].push({ id: r.id, templateId: r.template_id, name: r.name, position: r.position });
      });
      setTemplates(tpls.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        name: t.name,
        isDefault: t.is_default,
        createdAt: t.created_at,
        tracks: tracksByTemplate[t.id] || [],
      })));
    } else {
      setTemplates([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = useCallback(async (name: string, trackNames: string[], setAsDefault = false) => {
    if (!user) return null;
    // If setting as default, unset others
    if (setAsDefault) {
      await supabase.from("track_templates").update({ is_default: false }).eq("user_id", user.id);
    }
    const { data: tpl } = await supabase.from("track_templates").insert({
      user_id: user.id,
      name,
      is_default: setAsDefault,
    }).select().single();
    if (!tpl) return null;
    if (trackNames.length > 0) {
      await supabase.from("template_tracks").insert(
        trackNames.map((n, i) => ({ template_id: tpl.id, name: n, position: i }))
      );
    }
    await fetchTemplates();
    return tpl.id;
  }, [user, fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, name: string, trackNames: string[], isDefault: boolean) => {
    if (!user) return;
    if (isDefault) {
      await supabase.from("track_templates").update({ is_default: false }).eq("user_id", user.id);
    }
    await supabase.from("track_templates").update({ name, is_default: isDefault }).eq("id", id);
    // Delete old tracks and re-insert
    await supabase.from("template_tracks").delete().eq("template_id", id);
    if (trackNames.length > 0) {
      await supabase.from("template_tracks").insert(
        trackNames.map((n, i) => ({ template_id: id, name: n, position: i }))
      );
    }
    await fetchTemplates();
  }, [user, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    await supabase.from("track_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setDefaultTemplate = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("track_templates").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("track_templates").update({ is_default: true }).eq("id", id);
    setTemplates((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
  }, [user]);

  const defaultTemplate = templates.find((t) => t.isDefault) ?? null;

  return { templates, loading, defaultTemplate, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, refresh: fetchTemplates };
}
