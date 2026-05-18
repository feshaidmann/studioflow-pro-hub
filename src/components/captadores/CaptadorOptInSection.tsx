import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Save, Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { PALCO_TIPOS, PORTE_OPTIONS } from "@/constants/captadorOptions";
import { GENRE_OPTIONS } from "@/constants/genreOptions";
import { BRAZIL_STATES } from "@/constants/brazilStates";

function ChipPicker({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted text-muted-foreground"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function CaptadorOptInSection() {
  const { profile, updateProfile } = useProfile();
  const [enabled, setEnabled] = useState(false);
  const [tipos, setTipos] = useState<string[]>([]);
  const [generos, setGeneros] = useState<string[]>([]);
  const [regioes, setRegioes] = useState<string[]>([]);
  const [portes, setPortes] = useState<string[]>([]);
  const [taxa, setTaxa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEnabled(!!profile.is_captador);
    setTipos(profile.captador_palco_tipos ?? []);
    setGeneros(profile.captador_generos ?? []);
    setRegioes(profile.captador_regioes ?? []);
    setPortes(profile.captador_porte ?? []);
    setTaxa(profile.captador_taxa ?? "");
  }, [profile?.id]);

  const toggle = (list: string[], setList: (v: string[]) => void, v: string) => {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const save = async () => {
    setSaving(true);
    await updateProfile({
      is_captador: enabled,
      captador_palco_tipos: tipos,
      captador_generos: generos,
      captador_regioes: regioes,
      captador_porte: portes,
      captador_taxa: taxa,
      allow_global_listing: enabled ? true : profile?.allow_global_listing ?? false,
    } as any);
    setSaving(false);
    toast.success(enabled ? "Perfil de captador atualizado" : "Perfil de captador desativado");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Sou captador / produtor executivo
          {profile?.captador_verificado && (
            <Badge className="bg-primary/15 text-primary border-primary/30 gap-0.5 h-5 text-[10px] ml-1">
              <BadgeCheck className="h-3 w-3" /> Verificado
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Ative para aparecer no diretório <span className="font-medium">/captadores</span> e receber pitches de artistas. Requer listagem pública ativa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Ativar perfil de captador</p>
            <p className="text-xs text-muted-foreground">Seus contatos públicos (e-mail, WhatsApp) ficarão visíveis para artistas.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipos de palco que você contrata</Label>
              <ChipPicker options={PALCO_TIPOS as unknown as string[]} selected={tipos} onToggle={(v) => toggle(tipos, setTipos, v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Gêneros que costuma contratar</Label>
              <ChipPicker options={GENRE_OPTIONS as unknown as string[]} selected={generos} onToggle={(v) => toggle(generos, setGeneros, v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Estados de atuação</Label>
              <ChipPicker options={BRAZIL_STATES.map((s) => s.uf)} selected={regioes} onToggle={(v) => toggle(regioes, setRegioes, v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Porte de evento</Label>
              <ChipPicker options={PORTE_OPTIONS.map((p) => p.v) as string[]} selected={portes} onToggle={(v) => toggle(portes, setPortes, v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Taxa / comissão (campo livre)</Label>
              <Input
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                placeholder='Ex.: "15% sobre cachê", "fee fixo a combinar"'
                className="text-xs"
              />
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar perfil de captador
        </Button>
      </CardContent>
    </Card>
  );
}
