import { useState, useCallback, useEffect } from "react";
import { Layers, Download, X, Save, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { FORMAT_OPTIONS, type FormatOption } from "@/components/creative/FormatSelector";
import type { CreativeAsset } from "@/hooks/useCreativeAssets";

interface ChannelConfig {
  format: FormatOption;
  enabled: boolean;
  contextPrompt: string;
}

const DEFAULT_CONTEXTS: Record<string, string> = {
  "instagram_post": "Post de divulgação para Instagram com nome do artista",
  "story": "Story vertical com 'Ouça agora' e nome do artista",
  "youtube_cover": "Thumbnail chamativa com título do single/álbum",
  "spotify_cover": "Capa quadrada para Spotify com identidade visual do projeto",
  "spotify_canvas": "Arte vertical animável para Canvas do Spotify",
  "spotify_banner": "Banner horizontal do perfil do artista no Spotify",
  "deezer_cover": "Capa quadrada para Deezer com identidade visual do projeto",
  "tidal_cover": "Capa quadrada para Tidal com identidade visual do projeto",
  "twitter_post": "Post de divulgação com data de lançamento",
  "custom": "Arte livre com identidade visual do projeto",
};

function buildInitialChannels(): ChannelConfig[] {
  return FORMAT_OPTIONS.map((f) => ({
    format: f,
    enabled: false,
    contextPrompt: DEFAULT_CONTEXTS[f.id] || "",
  }));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseImageUrl: string;
  basePrompt?: string;
  style: string | null;
  projectId?: string;
  onGenerateBatch: (
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
  ) => Promise<Array<{ imageBase64: string } | null>>;
  onSaveAsset?: (params: {
    imageBase64: string;
    prompt: string;
    style: string | null;
    format: string;
    width: number;
    height: number;
    projectId?: string;
  }) => Promise<CreativeAsset | null>;
}

interface BatchResult {
  imageUrl: string;
  format: string;
  formatId: string;
  width: number;
  height: number;
  prompt: string;
  saved: boolean;
  saving: boolean;
}

export default function DeriveBatchDialog({
  open, onOpenChange, baseImageUrl, basePrompt, style, projectId, onGenerateBatch, onSaveAsset,
}: Props) {
  const [channels, setChannels] = useState<ChannelConfig[]>(buildInitialChannels);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Array<BatchResult | null>>([]);
  const [done, setDone] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  // Reset channels every time dialog opens
  useEffect(() => {
    if (open) {
      setChannels(buildInitialChannels());
      setDone(false);
      setResults([]);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  const selectedCount = channels.filter((c) => c.enabled).length;

  const toggleChannel = (idx: number) => {
    setChannels((prev) => prev.map((c, i) => (i === idx ? { ...c, enabled: !c.enabled } : c)));
  };

  const updateContext = (idx: number, value: string) => {
    setChannels((prev) => prev.map((c, i) => (i === idx ? { ...c, contextPrompt: value } : c)));
  };

  const handleGenerate = useCallback(async () => {
    const selected = channels.filter((c) => c.enabled);
    if (selected.length === 0) return;

    setGenerating(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: selected.length });

    const paramsList = selected.map((ch) => ({
      prompt: basePrompt || "Adaptar esta arte para o canal especificado",
      style,
      format: ch.format.id,
      width: ch.format.width,
      height: ch.format.height,
      editImageUrl: baseImageUrl,
      projectId,
      channelContext: ch.contextPrompt,
    }));

    const batchResults = await onGenerateBatch(paramsList, (current, total) => {
      setProgress({ current, total });
    });

    setResults(
      batchResults.map((r, i) =>
        r ? {
          imageUrl: r.imageBase64,
          format: selected[i].format.label,
          formatId: selected[i].format.id,
          width: selected[i].format.width,
          height: selected[i].format.height,
          prompt: paramsList[i].channelContext || paramsList[i].prompt,
          saved: false,
          saving: false,
        } : null
      )
    );
    setGenerating(false);
    setDone(true);
  }, [channels, baseImageUrl, basePrompt, style, projectId, onGenerateBatch]);

  const downloadImage = async (url: string, filename: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDownloadAll = () => {
    results.forEach((r) => {
      if (!r) return;
      downloadImage(r.imageUrl, `desdobramento_${r.format.replace(/\s/g, "_")}.png`);
    });
  };

  const handleClose = (val: boolean) => {
    if (!generating) {
      onOpenChange(val);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Desdobrar para canais
          </DialogTitle>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src={baseImageUrl}
                alt="Base"
                className="h-16 w-16 rounded-md object-cover border border-border/40"
              />
              <p className="text-xs text-muted-foreground flex-1">
                A IA adaptará esta arte para cada formato selecionado, preservando rostos automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selecione os canais</p>
              {channels.map((ch, idx) => (
                <div key={ch.format.id} className="flex items-start gap-2 py-1">
                  <Checkbox
                    checked={ch.enabled}
                    onCheckedChange={() => toggleChannel(idx)}
                    disabled={generating}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium cursor-pointer" onClick={() => toggleChannel(idx)}>
                      {ch.format.label}{" "}
                      <span className="text-[10px] text-muted-foreground">
                        {ch.format.width}×{ch.format.height}
                      </span>
                    </label>
                    {ch.enabled && (
                      <Input
                        value={ch.contextPrompt}
                        onChange={(e) => updateContext(idx, e.target.value)}
                        placeholder="Contexto para este canal..."
                        className="text-xs h-7"
                        disabled={generating}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {generating && (
              <div className="space-y-1.5">
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Gerando {progress.current}/{progress.total}…
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || selectedCount === 0}
            >
              <Layers className="h-4 w-4 mr-1.5" />
              {generating
                ? `Gerando ${progress.current}/${progress.total}…`
                : `Gerar ${selectedCount} variação${selectedCount !== 1 ? "ões" : ""}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {results.map((r, i) =>
                r ? (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0 relative group">
                      <img src={r.imageUrl} alt={r.format} className="w-full aspect-square object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-white">{r.format}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-white"
                          onClick={() => downloadImage(r.imageUrl, `desdobramento_${r.format.replace(/\s/g, "_")}.png`)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card key={i} className="flex items-center justify-center aspect-square bg-muted/30">
                    <CardContent className="p-2 text-center">
                      <X className="h-5 w-5 mx-auto text-destructive/60 mb-1" />
                      <p className="text-[10px] text-muted-foreground">Falha</p>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDone(false); setResults([]); setChannels(buildInitialChannels()); }}>
                Gerar mais
              </Button>
              <Button className="flex-1" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-1.5" /> Baixar todos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
