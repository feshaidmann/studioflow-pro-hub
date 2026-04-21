import { useState } from "react";
import { toast } from "sonner";
import { analyzeAudioFull } from "@/lib/audioAnalysis";
import { lookupMusicDnaByMetadata, lookupMusicDnaReferences, type MusicDnaLookupResult } from "@/lib/musicDnaLookup";
import { spotifyFeaturesFromDiagnosis, type SpotifyFeatures } from "@/types/musicDna";

export interface MusicDnaLookupOptions {
  artista?: string;
  titulo?: string;
  trackName?: string;
  file?: File;
}

function featuresFromLocal(real: Awaited<ReturnType<typeof analyzeAudioFull>>["real"]): Partial<SpotifyFeatures> {
  const pseudoDiagnosis = {
    realAnalysis: real,
  } as Parameters<typeof spotifyFeaturesFromDiagnosis>[0];
  return spotifyFeaturesFromDiagnosis(pseudoDiagnosis);
}

export function useMusicDnaLookup() {
  const [isLoading, setIsLoading] = useState(false);

  const lookup = async (opts: MusicDnaLookupOptions): Promise<MusicDnaLookupResult | null> => {
    setIsLoading(true);
    try {
      const external = opts.artista || opts.titulo
        ? await lookupMusicDnaByMetadata({ artista: opts.artista, titulo: opts.titulo })
        : opts.trackName
          ? await lookupMusicDnaReferences(opts.trackName)
          : null;

      if (external) {
        toast.success(external.fonte === "acousticbrainz" ? "Dados encontrados no AcousticBrainz" : "BPM encontrado no Deezer");
        return external;
      }

      if (opts.file) {
        const { real } = await analyzeAudioFull(opts.file);
        toast.success("Análise local concluída");
        return { features: featuresFromLocal(real), fonte: "web_audio" };
      }

      toast.error("Não foi possível obter os dados desta faixa");
      return null;
    } catch {
      toast.error("Erro ao buscar dados de áudio");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { lookup, isLoading };
}