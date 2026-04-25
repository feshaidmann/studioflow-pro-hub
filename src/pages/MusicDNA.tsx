import { useNavigate } from "react-router-dom";
import { Dna, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import MusicDNAAnalyzer from "@/components/music-dna/MusicDNAAnalyzer";

export default function MusicDNA() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">DNA Musical</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Diagnóstico técnico e artístico da sua faixa: LUFS, dinâmica, espectro, identidade e referências próximas — com sugestões aplicáveis ao projeto.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => navigate("/track-intelligence")}
        >
          <History className="h-4 w-4" /> Track Intelligence
        </Button>
      </header>
      <MusicDNAAnalyzer />
    </div>
  );
}
