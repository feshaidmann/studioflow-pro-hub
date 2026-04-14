import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PerfilCultural {
  areas: string[];
  estados: string[];
  palavras_chave: string[];
  porte: string;
}

const AREA_OPTIONS = ["Música", "Audiovisual"];
const UF_OPTIONS = [
  "Nacional", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ",
  "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export default function ProjectCulturalProfile({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [perfil, setPerfil] = useState<PerfilCultural>({ areas: [], estados: [], palavras_chave: [], porte: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("perfil_cultural")
        .eq("id", projectId)
        .single();
      if (data?.perfil_cultural && typeof data.perfil_cultural === "object") {
        const p = data.perfil_cultural as any;
        setPerfil({
          areas: p.areas || [],
          estados: p.estados || [],
          palavras_chave: p.palavras_chave || [],
          porte: p.porte || "",
        });
      }
      setLoading(false);
    })();
  }, [projectId]);

  const toggleItem = (field: "areas" | "estados", value: string) => {
    setPerfil((p) => ({
      ...p,
      [field]: p[field].includes(value) ? p[field].filter((v) => v !== value) : [...p[field], value],
    }));
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !perfil.palavras_chave.includes(kw)) {
      setPerfil((p) => ({ ...p, palavras_chave: [...p.palavras_chave, kw] }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setPerfil((p) => ({ ...p, palavras_chave: p.palavras_chave.filter((k) => k !== kw) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ perfil_cultural: perfil as any })
        .eq("id", projectId);
      if (error) throw error;
      toast({ title: "Perfil cultural salvo" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Perfil Cultural do Projeto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Áreas */}
        <div>
          <Label className="text-xs text-muted-foreground">Áreas culturais</Label>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {AREA_OPTIONS.map((a) => (
              <Badge
                key={a}
                variant={perfil.areas.includes(a) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleItem("areas", a)}
              >
                {a}
              </Badge>
            ))}
          </div>
        </div>

        {/* Estados */}
        <div>
          <Label className="text-xs text-muted-foreground">Estados de interesse</Label>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {UF_OPTIONS.map((uf) => (
              <Badge
                key={uf}
                variant={perfil.estados.includes(uf) ? "default" : "outline"}
                className="cursor-pointer text-xs px-1.5 py-0.5"
                onClick={() => toggleItem("estados", uf)}
              >
                {uf}
              </Badge>
            ))}
          </div>
        </div>

        {/* Palavras-chave */}
        <div>
          <Label className="text-xs text-muted-foreground">Palavras-chave</Label>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {perfil.palavras_chave.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1">
                {kw}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(kw)} />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Ex: edital audiovisual, lei aldir blanc"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            />
            <Button size="sm" variant="outline" onClick={addKeyword} disabled={!newKeyword.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Salvando..." : "Salvar perfil cultural"}
        </Button>
      </CardContent>
    </Card>
  );
}
