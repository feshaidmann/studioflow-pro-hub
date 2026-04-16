import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { decode } from "base64-arraybuffer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CreativeAsset {
  id: string;
  prompt: string;
  style: string | null;
  format: string;
  width: number;
  height: number;
  storage_path: string;
  public_url: string | null;
  project_id: string | null;
  created_at: string;
}

export function useCreativeAssets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["creative-assets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("creative_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CreativeAsset[];
    },
    enabled: !!user,
  });

  const generate = async (params: {
    prompt: string;
    style: string | null;
    format: string;
    width: number;
    height: number;
    editImageUrl?: string;
    projectId?: string;
    channelContext?: string;
    trackName?: string;
    artistName?: string;
    releaseDate?: string;
  }) => {
    if (!user) return null;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          prompt: params.prompt,
          style: params.style,
          format: params.format,
          width: params.width,
          height: params.height,
          editImageUrl: params.editImageUrl,
          projectId: params.projectId,
          channelContext: params.channelContext,
          trackName: params.trackName,
          artistName: params.artistName,
          releaseDate: params.releaseDate,
        },
      });

      // supabase.functions.invoke returns FunctionsHttpError on non-2xx; try to read body
      if (error) {
        let serverMsg = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) serverMsg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try { const j = JSON.parse(txt); if (j?.error) serverMsg = j.error; } catch { if (txt) serverMsg = txt; }
          }
        } catch { /* ignore */ }
        toast({ title: "Erro ao gerar imagem", description: serverMsg, variant: "destructive" });
        return null;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }

      return data as { imageBase64: string };
    } catch (e: any) {
      toast({ title: "Erro inesperado", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const generateBatch = async (
    paramsList: Array<{
      prompt: string;
      style: string | null;
      format: string;
      width: number;
      height: number;
      editImageUrl?: string;
      projectId?: string;
      channelContext?: string;
    }>,
    onProgress?: (current: number, total: number) => void
  ) => {
    if (!user) return [];
    const results: Array<{ imageBase64: string } | null> = [];
    for (let i = 0; i < paramsList.length; i++) {
      onProgress?.(i + 1, paramsList.length);
      const result = await generate(paramsList[i]);
      results.push(result);
      if (i < paramsList.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
    return results;
  };

  const generateText = async (params: { prompt: string; dnaContext?: string }) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          mode: "text",
          prompt: params.prompt,
          dnaContext: params.dnaContext,
        },
      });
      if (error) {
        toast({ title: "Erro ao gerar texto", description: error.message, variant: "destructive" });
        return null;
      }
      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }
      return data as { text: string };
    } catch (e: any) {
      toast({ title: "Erro inesperado", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const saveAsset = async (params: {
    imageBase64: string;
    prompt: string;
    style: string | null;
    format: string;
    width: number;
    height: number;
    projectId?: string;
  }) => {
    if (!user) return null;
    try {
      const raw = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const timestamp = Date.now();
      const storagePath = `${user.id}/${timestamp}_${params.format}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("creative-assets")
        .upload(storagePath, decode(raw), { contentType: "image/png", upsert: false });

      if (uploadErr) {
        toast({ title: "Erro ao salvar", description: uploadErr.message, variant: "destructive" });
        return null;
      }

      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const { data: asset, error: insertErr } = await supabase
        .from("creative_assets")
        .insert({
          user_id: user.id,
          project_id: params.projectId || null,
          prompt: params.prompt,
          style: params.style || null,
          format: params.format,
          width: params.width,
          height: params.height,
          storage_path: storagePath,
          public_url: publicUrl,
        })
        .select()
        .single();

      if (insertErr) {
        toast({ title: "Erro ao salvar metadados", description: insertErr.message, variant: "destructive" });
        return null;
      }

      queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
      toast({ title: "Arte salva na galeria!" });
      return asset as CreativeAsset;
    } catch (e: any) {
      toast({ title: "Erro inesperado", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const deleteAsset = async (id: string, storagePath: string) => {
    await supabase.storage.from("creative-assets").remove([storagePath]);
    await supabase.from("creative_assets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
  };

  return { assets, isLoading, generating, generate, generateBatch, generateText, saveAsset, deleteAsset };
}
