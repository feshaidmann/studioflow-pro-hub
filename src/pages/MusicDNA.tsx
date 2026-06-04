import { Dna } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import MusicDNAAnalyzer from "@/components/music-dna/MusicDNAAnalyzer";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";

export default function MusicDNA() {
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get("project") ?? undefined;
  const initialAnalysisId = searchParams.get("analysis") ?? undefined;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <MobileStickyHeader
        title="DNA Musical"
        subtitle="Diagnóstico técnico e artístico da sua faixa"
      />
      <header className="hidden md:block space-y-1">
        <div className="flex items-center gap-2">
          <Dna className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">DNA Musical</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Diagnóstico técnico e artístico da sua faixa: LUFS, dinâmica, espectro, identidade e referências próximas — com sugestões aplicáveis ao projeto.
        </p>
      </header>
      <MusicDNAAnalyzer defaultProjectId={defaultProjectId} initialAnalysisId={initialAnalysisId} />
    </div>
  );
}
