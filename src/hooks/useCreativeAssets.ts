import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { decode } from "base64-arraybuffer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useRateLimitDialog, extractRateLimitInfo } from "@/hooks/useRateLimitDialog";

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
  media_type?: "image" | "video";
}

export function useCreativeAssets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { open: openRateLimit, setQuota } = useRateLimitDialog();
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
    additionalText?: string;
    noText?: boolean;
  }) => {
    if (!user) return null;
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-creative`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
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
          additionalText: params.additionalText,
          noText: params.noText,
        }),
      });

      // Capture quota headers (sent on 200 only)
      const dailyLimit = response.headers.get("x-quota-daily-limit");
      const dailyUsed = response.headers.get("x-quota-daily-used");
      const weeklyLimit = response.headers.get("x-quota-weekly-limit");
      const weeklyUsed = response.headers.get("x-quota-weekly-used");
      const dailyResetsAt = response.headers.get("x-quota-daily-resets-at");
      if (dailyLimit && dailyUsed && weeklyLimit && weeklyUsed && dailyResetsAt) {
        setQuota({
          daily_limit: Number(dailyLimit),
          daily_used: Number(dailyUsed),
          weekly_limit: Number(weeklyLimit),
          weekly_used: Number(weeklyUsed),
          daily_resets_at: dailyResetsAt,
        });
      }

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Structured rate-limit payload → open dialog
        if (body?.error === "rate_limit" && body?.limit_type && body?.resets_at) {
          openRateLimit(body);
          return null;
        }
        toast({ title: "Erro ao gerar imagem", description: body?.error || `HTTP ${response.status}`, variant: "destructive" });
        return null;
      }

      if (body?.error) {
        toast({ title: "Erro", description: body.error, variant: "destructive" });
        return null;
      }

      return body as { imageBase64: string };
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
    videoBlob?: Blob;
  }) => {
    if (!user) return null;
    try {
      const isVideo = !!params.videoBlob;
      const timestamp = Date.now();
      const ext = isVideo ? "webm" : "png";
      const contentType = isVideo ? "video/webm" : "image/png";
      const storagePath = `${user.id}/${timestamp}_${params.format}.${ext}`;

      let body: ArrayBuffer | Blob;
      if (isVideo) {
        body = params.videoBlob!;
      } else {
        const raw = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        body = decode(raw);
      }

      const { error: uploadErr } = await supabase.storage
        .from("creative-assets")
        .upload(storagePath, body, { contentType, upsert: false });

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
          media_type: isVideo ? "video" : "image",
        } as any)
        .select()
        .single();

      if (insertErr) {
        toast({ title: "Erro ao salvar metadados", description: insertErr.message, variant: "destructive" });
        return null;
      }

      queryClient.invalidateQueries({ queryKey: ["creative-assets"] });
      toast({ title: isVideo ? "Vídeo salvo na galeria!" : "Arte salva na galeria!" });
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
