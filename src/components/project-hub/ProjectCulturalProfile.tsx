import { useState, useEffect, useId, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus, Save, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PerfilCultural {
  areas: string[];
  estados: string[];
  palavras_chave: string[];
  porte: string;
}

const AREA_OPTIONS = [
  "Música", "Audiovisual", "Artes Cênicas", "Artes Visuais",
  "Literatura", "Patrimônio Cultural", "Cultura Popular",
  "Dança", "Circo", "Cultura Digital",
];
const UF_OPTIONS = [
  "Nacional", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ",
  "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export default function ProjectCulturalProfile({ projectId }: { projectId: string }) {
  const [perfil, setPerfil] = useState<PerfilCultural>({ areas: [], estados: [], palavras_chave: [], porte: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [open, setOpen] = useState(false);

  const headerId = useId();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Foco automático ao expandir / devolução de foco ao recolher
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        panelRef.current?.focus({ preventScroll: false });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      const active = document.activeElement;
      if (panelRef.current && active && panelRef.current.contains(active)) {
        triggerRef.current?.focus();
      }
    }
  }, [open]);

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

  const keywordButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const newKeywordInputRef = useRef<HTMLInputElement>(null);

  const removeKeyword = (kw: string) => {
    const list = perfil.palavras_chave;
    const idx = list.indexOf(kw);
    setPerfil((p) => ({ ...p, palavras_chave: p.palavras_chave.filter((k) => k !== kw) }));
    // Mover foco para o próximo chip remanescente, ou anterior, ou para o input.
    const next = list[idx + 1] ?? list[idx - 1] ?? null;
    requestAnimationFrame(() => {
      delete keywordButtonsRef.current[kw];
      if (next && keywordButtonsRef.current[next]) {
        keywordButtonsRef.current[next]?.focus();
      } else {
        newKeywordInputRef.current?.focus();
      }
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ perfil_cultural: perfil as any })
        .eq("id", projectId);
      if (error) throw error;
      toast.success("Perfil cultural salvo!", { description: "Veja recomendações de editais na aba Editais → Meus Editais" });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBadgeKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    field: "areas" | "estados",
    value: string,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleItem(field, value);
    }
  };

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  if (loading) return null;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-controls={panelId}
            aria-labelledby={headerId}
            className="w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-lg"
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 hover:bg-muted/40 transition-colors rounded-t-lg">
              <div className="flex-1 min-w-0">
                <CardTitle id={headerId} className="text-base">Perfil Cultural do Projeto</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Estes filtros são usados para recomendar editais compatíveis com seu projeto.
                </p>
              </div>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </CardHeader>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent
          id={panelId}
          ref={panelRef}
          role="region"
          aria-labelledby={headerId}
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          className="focus-visible:outline-none"
        >
          <CardContent className="space-y-4">
            {/* Áreas */}
            <div>
              <Label className="text-xs text-muted-foreground">Áreas culturais</Label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {AREA_OPTIONS.map((a) => {
                  const selected = perfil.areas.includes(a);
                  return (
                    <Badge
                      key={a}
                      variant={selected ? "default" : "outline"}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleItem("areas", a)}
                      onKeyDown={(e) => handleBadgeKeyDown(e, "areas", a)}
                    >
                      {a}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Estados */}
            <div>
              <Label className="text-xs text-muted-foreground">Estados de interesse</Label>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {UF_OPTIONS.map((uf) => {
                  const selected = perfil.estados.includes(uf);
                  return (
                    <Badge
                      key={uf}
                      variant={selected ? "default" : "outline"}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      className="cursor-pointer text-xs px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleItem("estados", uf)}
                      onKeyDown={(e) => handleBadgeKeyDown(e, "estados", uf)}
                    >
                      {uf}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Palavras-chave */}
            <div>
              <Label className="text-xs text-muted-foreground">Palavras-chave</Label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {perfil.palavras_chave.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) {
                          keywordButtonsRef.current[kw] = el;
                        } else {
                          delete keywordButtonsRef.current[kw];
                        }
                      }}
                      aria-label={`Remover palavra-chave ${kw}`}
                      onClick={() => removeKeyword(kw)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" || e.key === "Delete") {
                          e.preventDefault();
                          removeKeyword(kw);
                        }
                      }}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  ref={newKeywordInputRef}
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ex: edital audiovisual, lei aldir blanc"
                  className="flex-1"
                  aria-label="Nova palavra-chave"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button size="sm" variant="outline" onClick={addKeyword} disabled={!newKeyword.trim()} aria-label="Adicionar palavra-chave">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              {saving ? "Salvando..." : "Salvar perfil cultural"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
