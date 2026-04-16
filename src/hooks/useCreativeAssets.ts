import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
        },
      });

      if (error) {
        toast({ title: "Erro ao gerar imagem", description: error.message, variant: "destructive" });
        return null;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }

      queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
      return data as { imageUrl: string; imageBase64: string; asset: CreativeAsset };
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
    const results: Array<{ imageUrl: string; imageBase64: string; asset: CreativeAsset } | null> = [];
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

  const deleteAsset = async (id: string, storagePath: string) => {
    await supabase.storage.from("creative-assets").remove([storagePath]);
    await supabase.from("creative_assets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
  };

  return { assets, isLoading, generating, generate, generateBatch, generateText, deleteAsset };
}
