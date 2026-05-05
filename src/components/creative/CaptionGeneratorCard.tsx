import { useMemo, useState } from "react";
import { Copy, FileText, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import type { CreativeCaption } from "@/hooks/useCreativeAssets";

const PLATFORMS = [
  { value: "instagram-feed", label: "Instagram Feed" },
  { value: "reels-shorts", label: "Reels / Shorts" },
  { value: "tiktok", label: "TikTok" },
  { value: "spotify-streaming", label: "Spotify / streaming" },
  { value: "whatsapp", label: "WhatsApp / comunidade" },
];

const PHASES = [
  { value: "teaser", label: "Teaser" },
  { value: "pre-save", label: "Pré-save" },
  { value: "launch", label: "Lançamento" },
  { value: "post-launch", label: "Pós-lançamento" },
  { value: "behind-scenes", label: "Bastidores" },
  { value: "show", label: "Show / agenda" },
];

const OBJECTIVES = [
  { value: "listen-now", label: "Ouvir agora" },
  { value: "save-pre-save", label: "Salvar / pré-save" },
  { value: "comment", label: "Comentar" },
  { value: "share", label: "Compartilhar" },
  { value: "follow", label: "Seguir o artista" },
  { value: "book-show", label: "Chamar para show" },
];

const TONES = [
  { value: "authentic", label: "Autêntico" },
  { value: "emotional", label: "Emocional" },
  { value: "direct", label: "Direto" },
  { value: "poetic", label: "Poético" },
  { value: "funny", label: "Bem-humorado" },
  { value: "urgent", label: "Urgente" },
];

const LENGTHS = [
  { value: "short", label: "Curto" },
  { value: "medium", label: "Médio" },
  { value: "storytelling", label: "Storytelling" },
];

const HASHTAGS = [
  { value: "few", label: "Poucas" },
  { value: "moderate", label: "Moderadas" },
  { value: "none", label: "Sem hashtags" },
];

const labelFor = (items: Array<{ value: string; label: string }>, value: string) => items.find((item) => item.value === value)?.label || value;

interface Props {
  prompt: string;
  dnaContext?: string;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  projectId?: string;
  formatLabel: string;
  captions: CreativeCaption[];
  captionsLoading?: boolean;
  generateText: (params: {
    prompt: string;
    dnaContext?: string;
    trackName?: string;
    artistName?: string;
    releaseDate?: string;
    platform?: string;
    objective?: string;
    tone?: string;
    format?: string;
    campaignPhase?: string;
    length?: string;
    hashtagsMode?: string;
  }) => Promise<{ text: string } | null>;
  saveCaption: (params: {
    caption: string;
    projectId?: string;
    trackName?: string;
    artistName?: string;
    platform: string;
    campaignPhase: string;
    objective: string;
    tone: string;
    length: string;
    hashtagsMode: string;
    prompt?: string;
    dnaContext?: string;
  }) => Promise<CreativeCaption | null>;
  deleteCaption: (id: string) => Promise<void>;
}

export default function CaptionGeneratorCard({
  prompt,
  dnaContext,
  trackName,
  artistName,
  releaseDate,
  projectId,
  formatLabel,
  captions,
  captionsLoading,
  generateText,
  saveCaption,
  deleteCaption,
}: Props) {
  const [platform, setPlatform] = useState("instagram-feed");
  const [campaignPhase, setCampaignPhase] = useState("launch");
  const [objective, setObjective] = useState("listen-now");
  const [tone, setTone] = useState("authentic");
  const [length, setLength] = useState("medium");
  const [hashtagsMode, setHashtagsMode] = useState("few");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedLabels = useMemo(() => ({
    platform: labelFor(PLATFORMS, platform),
    campaignPhase: labelFor(PHASES, campaignPhase),
    objective: labelFor(OBJECTIVES, objective),
    tone: labelFor(TONES, tone),
    length: labelFor(LENGTHS, length),
    hashtagsMode: labelFor(HASHTAGS, hashtagsMode),
  }), [platform, campaignPhase, objective, tone, length, hashtagsMode]);

  const handleGenerate = async () => {
    if (!prompt.trim() && !trackName?.trim() && !dnaContext) {
      toast({ title: "Informe a música", description: "Preencha a ideia, o nome da faixa ou use um DNA Musical.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await generateText({
        prompt: prompt.trim() || "Legenda para divulgação musical",
        dnaContext,
        trackName: trackName?.trim() || undefined,
        artistName: artistName?.trim() || undefined,
        releaseDate,
        platform: selectedLabels.platform,
        campaignPhase: selectedLabels.campaignPhase,
        objective: selectedLabels.objective,
        tone: selectedLabels.tone,
        length: selectedLabels.length,
        hashtagsMode: selectedLabels.hashtagsMode,
        format: formatLabel,
      });
      if (result?.text) {
        setCaption(result.text.trim());
        setSaved(false);
        trackEvent("creative_caption_generated", {
          platform: selectedLabels.platform,
          campaign_phase: selectedLabels.campaignPhase,
          objective: selectedLabels.objective,
          project_linked: !!projectId,
          has_dna: !!dnaContext,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text = caption) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Legenda copiada para a área de transferência." });
  };

  const handleSave = async () => {
    if (!caption.trim() || saved) return;
    const result = await saveCaption({
      caption,
      projectId,
      trackName,
      artistName,
      platform: selectedLabels.platform,
      campaignPhase: selectedLabels.campaignPhase,
      objective: selectedLabels.objective,
      tone: selectedLabels.tone,
      length: selectedLabels.length,
      hashtagsMode: selectedLabels.hashtagsMode,
      prompt,
      dnaContext,
    });
    if (result) setSaved(true);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">Legenda de divulgação</span>
          </div>
          <Badge variant="secondary" className="shrink-0">independente</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Select value={platform} onValueChange={setPlatform}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={campaignPhase} onValueChange={setCampaignPhase}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PHASES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={objective} onValueChange={setObjective}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{OBJECTIVES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={tone} onValueChange={setTone}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{TONES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={length} onValueChange={setLength}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{LENGTHS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={hashtagsMode} onValueChange={setHashtagsMode}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{HASHTAGS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/40 p-3 min-h-28">
          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Gerando legenda de campanha…</p>
          ) : caption ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Gere uma legenda focada em divulgar a música, adaptada ao canal, fase e CTA.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="text-xs gap-1.5" onClick={handleGenerate} disabled={loading}>
            {caption ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {loading ? "Gerando…" : caption ? "Gerar novamente" : "Gerar legenda"}
          </Button>
          {caption && <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleCopy()}><Copy className="h-3 w-3" />Copiar</Button>}
          {caption && <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={saved}><Save className="h-3 w-3" />{saved ? "Salva" : "Salvar"}</Button>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Histórico recente</p>
          {captionsLoading ? (
            <p className="text-xs text-muted-foreground">Carregando legendas…</p>
          ) : captions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma legenda salva ainda.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {captions.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                  <p className="text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">{item.caption}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground truncate">{item.platform} · {item.objective}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(item.caption)}><Copy className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCaption(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
