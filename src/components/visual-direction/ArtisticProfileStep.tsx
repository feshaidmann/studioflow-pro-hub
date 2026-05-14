import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { ArtisticProfile, MOOD_OPTIONS, PALETTE_PRESETS } from "./types";

interface Props {
  initial?: Partial<ArtisticProfile>;
  onSubmit: (profile: ArtisticProfile) => void;
  loading?: boolean;
}

const MAX_GENRES = 4;
const MAX_MOODS = 3;
const MAX_PALETTE = 3;

export default function ArtisticProfileStep({ initial, onSubmit, loading }: Props) {
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [genreInput, setGenreInput] = useState("");
  const [moods, setMoods] = useState<string[]>(initial?.moods ?? []);
  const [artistRefs, setArtistRefs] = useState(initial?.artist_refs ?? "");
  const [externalRefs, setExternalRefs] = useState(initial?.external_refs ?? "");
  const [palette, setPalette] = useState<string[]>(initial?.palette ?? []);
  const [hexInput, setHexInput] = useState("");
  const [identityPhrase, setIdentityPhrase] = useState(initial?.identity_phrase ?? "");

  const addGenre = () => {
    const v = genreInput.trim();
    if (!v || genres.includes(v) || genres.length >= MAX_GENRES) return;
    setGenres([...genres, v]);
    setGenreInput("");
  };
  const onGenreKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addGenre();
    }
  };
  const toggleMood = (m: string) => {
    if (moods.includes(m)) setMoods(moods.filter((x) => x !== m));
    else if (moods.length < MAX_MOODS) setMoods([...moods, m]);
  };
  const togglePresetColor = (hex: string) => {
    if (palette.includes(hex)) setPalette(palette.filter((x) => x !== hex));
    else if (palette.length < MAX_PALETTE) setPalette([...palette, hex]);
  };
  const addHex = () => {
    const v = hexInput.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(v) || palette.includes(v) || palette.length >= MAX_PALETTE) return;
    setPalette([...palette, v]);
    setHexInput("");
  };

  const canSubmit = genres.length > 0 && moods.length > 0 && artistRefs.trim().length > 0 && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      genres,
      moods,
      artist_refs: artistRefs.trim(),
      external_refs: externalRefs.trim() || undefined,
      palette,
      identity_phrase: identityPhrase.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="genre-input">Gêneros <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">(até {MAX_GENRES})</span></Label>
        <div className="flex gap-2">
          <Input
            id="genre-input"
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            onKeyDown={onGenreKey}
            placeholder="Ex: indie folk, MPB experimental"
            disabled={genres.length >= MAX_GENRES}
          />
          <Button type="button" variant="outline" size="icon" onClick={addGenre} disabled={!genreInput.trim() || genres.length >= MAX_GENRES} aria-label="Adicionar gênero">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <Badge key={g} variant="secondary" className="gap-1">
                {g}
                <button type="button" onClick={() => setGenres(genres.filter((x) => x !== g))} aria-label={`Remover ${g}`} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Mood <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">(até {MAX_MOODS})</span></Label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => {
            const selected = moods.includes(m);
            const disabled = !selected && moods.length >= MAX_MOODS;
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMood(m)}
                disabled={disabled}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                aria-pressed={selected}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist-refs">Artistas de referência <span className="text-destructive">*</span></Label>
        <Textarea
          id="artist-refs"
          value={artistRefs}
          onChange={(e) => setArtistRefs(e.target.value)}
          placeholder="Ex: Mitski, Phoebe Bridgers, Liniker — pelo que cada um carrega de verdade"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="external-refs">Referências externas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
        <Textarea
          id="external-refs"
          value={externalRefs}
          onChange={(e) => setExternalRefs(e.target.value)}
          placeholder="Ex: filmes (Lost in Translation), fotógrafos (Wolfgang Tillmans), lugares"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Paleta de cores <span className="text-xs text-muted-foreground">(até {MAX_PALETTE})</span></Label>
        <div className="flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((p) => {
            const selected = palette.includes(p.hex);
            const disabled = !selected && palette.length >= MAX_PALETTE;
            return (
              <button
                key={p.hex}
                type="button"
                onClick={() => togglePresetColor(p.hex)}
                disabled={disabled}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition-all ${
                  selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-foreground/30 disabled:opacity-40"
                }`}
                aria-pressed={selected}
                aria-label={`${p.name} ${p.hex}`}
              >
                <span className="h-4 w-4 rounded-full border border-border/40" style={{ backgroundColor: p.hex }} />
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="#RRGGBB"
            maxLength={7}
            disabled={palette.length >= MAX_PALETTE}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHex(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addHex} disabled={!/^#[0-9a-fA-F]{6}$/.test(hexInput.trim()) || palette.length >= MAX_PALETTE}>
            Adicionar hex
          </Button>
        </div>
        {palette.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {palette.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-border/40" style={{ backgroundColor: c }} />
                {c}
                <button type="button" onClick={() => setPalette(palette.filter((x) => x !== c))} aria-label={`Remover cor ${c}`} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-phrase">Frase identitária <span className="text-xs text-muted-foreground">(opcional, máx. 120)</span></Label>
        <Input
          id="identity-phrase"
          value={identityPhrase}
          onChange={(e) => setIdentityPhrase(e.target.value.slice(0, 120))}
          placeholder="Uma frase que resume a identidade do projeto"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground text-right">{identityPhrase.length}/120</p>
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "Gerando referências…" : "Gerar referências →"}
        </Button>
      </div>
      {!canSubmit && !loading && (
        <p className="text-xs text-muted-foreground text-right">
          Preencha gênero, mood e artistas de referência para continuar.
        </p>
      )}
    </div>
  );
}
