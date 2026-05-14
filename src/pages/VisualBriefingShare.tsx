import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Palette, Download, AlertTriangle } from "lucide-react";

interface ShareData {
  briefing: {
    id: string;
    artistic_profile: any;
    approved_images?: any[];
    generated_images?: any[];
    generated_palette?: { colors: string[]; rationale?: string };
    approved_copy?: string;
    designer_notes?: string;
    created_at: string;
  };
  project: { name: string | null; artist: string | null };
  pdf_url: string | null;
  expires_at: string;
}

export default function VisualBriefingShare() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectRef}.supabase.co/functions/v1/get-visual-briefing-share?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json?.error ?? "Não foi possível abrir o link");
        } else {
          setData(json as ShareData);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro de rede");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando briefing…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
        <h1 className="text-lg font-semibold">Link indisponível</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{error ?? "Este link de briefing pode ter expirado ou sido revogado."}</p>
      </div>
    );
  }

  const b = data.briefing;
  const selected = (b.approved_images?.length ? b.approved_images : (b.generated_images ?? []).filter((i: any) => i.selected)) ?? [];
  const palette = b.generated_palette;
  const expiresLabel = new Date(data.expires_at).toLocaleString("pt-BR");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Palette className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">Briefing — {data.project.artist || "—"} · {data.project.name || "—"}</h1>
              <p className="text-[11px] text-muted-foreground">Compartilhado · expira em {expiresLabel}</p>
            </div>
          </div>
          {data.pdf_url && (
            <Button asChild size="sm" variant="outline">
              <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4 mr-1.5" /> Baixar PDF
              </a>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        {data.pdf_url && (
          <details open className="rounded-xl border border-border bg-card overflow-hidden">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none px-4 py-2 border-b border-border">
              Prévia do PDF
            </summary>
            <iframe
              src={data.pdf_url}
              title="Prévia do briefing PDF"
              className="w-full h-[600px] bg-background"
            />
          </details>
        )}

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Gêneros</p>
              <p>{b.artistic_profile?.genres?.join(" · ") || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Mood</p>
              <p>{b.artistic_profile?.moods?.join(" · ") || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Artistas de referência</p>
              <p>{b.artistic_profile?.artist_refs || "—"}</p>
            </div>
            {b.artistic_profile?.identity_phrase && (
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Frase identitária</p>
                <p className="italic">"{b.artistic_profile.identity_phrase}"</p>
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Referências de estilo</p>
              <div className="grid grid-cols-3 gap-2">
                {selected.map((img: any) => (
                  <div key={img.id} className="aspect-square rounded-md overflow-hidden border border-border">
                    {img.url ? <img src={img.url} alt={`Referência — ${img.style_tag}`} className="w-full h-full object-cover" /> : null}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">Imagens são referências de estilo geradas por IA — não são arte final.</p>
            </div>
          )}

          {palette?.colors?.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Paleta</p>
              <div className="flex flex-wrap gap-2">
                {palette.colors.map((hex) => (
                  <div key={hex} className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: hex }} />
                    <span className="text-xs font-mono">{hex}</span>
                  </div>
                ))}
              </div>
              {palette.rationale && <p className="text-xs text-muted-foreground">{palette.rationale}</p>}
            </div>
          ) : null}

          {b.approved_copy && (
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Copy aprovada</p>
              <p className="text-sm whitespace-pre-wrap">{b.approved_copy}</p>
            </div>
          )}

          {b.designer_notes && (
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Notas para o designer</p>
              <p className="text-sm whitespace-pre-wrap">{b.designer_notes}</p>
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">StudioFlow · Direção Visual</Badge>
        </p>
      </main>
    </div>
  );
}
