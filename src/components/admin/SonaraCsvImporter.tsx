import { useRef, useState } from "react";
import Papa from "papaparse";
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classifyGenre, HARDCODED_GENRE_PROFILES } from "@/lib/genreClassifier";

// ── Column mapping: Sonara CSV → import-reference-tracks schema ──────────────
const SONARA_TO_DB: Record<string, string> = {
  artista:              "band",
  bpm:                  "tempo_bpm",
  energia:              "energy",
  dancabilidade:        "danceability",
  sentimento_valence:   "valence",
  acousticidade:        "acousticness",
  loudness_lufs:        "lufs_integrated",
  alcance_dinamico_db:  "dynamic_range_db",
  centroide_espectral_hz: "spectral_centroid",
  rolloff_espectral_hz: "spectral_rolloff",
  zero_crossing_rate:   "zero_crossing_rate",
};

// Columns from Sonara that we intentionally drop (no DB equivalent)
const DROPPED_COLUMNS = new Set(["arquivo", "mfcc_media", "status_analise", "artista"]);

interface SonaraRow extends Record<string, string> {
  arquivo: string;
  artista: string;
  bpm: string;
  energia: string;
  dancabilidade: string;
  sentimento_valence: string;
  acousticidade: string;
  loudness_lufs: string;
  alcance_dinamico_db: string;
  centroide_espectral_hz: string;
  rolloff_espectral_hz: string;
  zero_crossing_rate: string;
}

interface TransformPreview {
  totalRows: number;
  validRows: number;
  genreDistribution: Record<string, number>;
  confidenceCounts: Record<"alta" | "média" | "baixa" | "nula", number>;
  lowConfidenceExamples: Array<{ band: string; filename: string; detected: string; gap: number }>;
  detectedHeaders: string[];
  missingRequired: string[];
}

interface ImportResult {
  batch: string;
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  genres_updated: string[];
  errors: string[];
}

function basename(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
}

function transformRow(
  raw: SonaraRow,
  batchName: string,
  analysisDate: string,
): Record<string, string> | null {
  const band = raw.artista?.trim();
  const arquivo = raw.arquivo?.trim();
  if (!band || !arquivo) return null;

  const filename = basename(arquivo);
  if (!filename) return null;

  const out: Record<string, string> = {
    band,
    filename,
    analysis_date: analysisDate,
    lufs_method: "sonara",
    source_batch: batchName,
  };

  // Remap known numeric columns
  for (const [sonaraCol, dbCol] of Object.entries(SONARA_TO_DB)) {
    if (sonaraCol === "artista") continue; // already handled
    const val = raw[sonaraCol];
    if (val !== undefined && val !== "" && isFinite(Number(val))) {
      out[dbCol] = val;
    }
  }

  // Auto-classify genre
  const genre = classifyGenre(
    {
      tempo_bpm:    Number(raw.bpm)                   || null,
      energy:       Number(raw.energia)               || null,
      danceability: Number(raw.dancabilidade)         || null,
      valence:      Number(raw.sentimento_valence)    || null,
      acousticness: Number(raw.acousticidade)         || null,
      lufs_integrated: Number(raw.loudness_lufs)      || null,
    },
    HARDCODED_GENRE_PROFILES,
  );

  out.genre = genre?.detected ?? "Indefinido";

  // Drop ignored columns (mfcc_media, arquivo, status_analise) — not written to out
  // mfcc_1..13, chroma_cens_1..12, spectral_contrast_1..7 left absent (treated as null by edge fn)

  return out;
}

function buildTransformedCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap(Object.keys)));
  return Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? "")) });
}

interface Props {
  onInserted?: () => void;
}

export function SonaraCsvImporter({ onInserted }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TransformPreview | null>(null);
  const [transformedRows, setTransformedRows] = useState<Array<Record<string, string>>>([]);
  const [batchName, setBatchName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const analysisDate = new Date().toISOString().slice(0, 10);

  const processFile = (f: File) => {
    setFile(f);
    setResult(null);
    setPreview(null);
    setTransformedRows([]);

    const defaultBatch = `sonara-${f.name.replace(/\.csv$/i, "")}-${analysisDate}`;
    setBatchName((prev) => prev || defaultBatch);

    Papa.parse<SonaraRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (parsed) => {
        const headers = parsed.meta?.fields ?? [];
        const isSonara = headers.includes("arquivo") && headers.includes("artista");

        const missingRequired: string[] = [];
        if (!headers.includes("arquivo")) missingRequired.push("arquivo");
        if (!headers.includes("artista")) missingRequired.push("artista");

        const genreDistribution: Record<string, number> = {};
        const confidenceCounts: Record<"alta" | "média" | "baixa" | "nula", number> = {
          alta: 0, média: 0, baixa: 0, nula: 0,
        };
        const lowConfidenceExamples: TransformPreview["lowConfidenceExamples"] = [];

        const tempBatch = defaultBatch;
        const rows: Array<Record<string, string>> = [];

        for (const raw of parsed.data) {
          const transformed = transformRow(raw as SonaraRow, tempBatch, analysisDate);
          if (!transformed) continue;

          rows.push(transformed);

          const g = transformed.genre;
          genreDistribution[g] = (genreDistribution[g] ?? 0) + 1;

          const cls = classifyGenre(
            {
              tempo_bpm:    Number(raw.bpm)                || null,
              energy:       Number(raw.energia)            || null,
              danceability: Number(raw.dancabilidade)      || null,
              valence:      Number(raw.sentimento_valence) || null,
              acousticness: Number(raw.acousticidade)      || null,
              lufs_integrated: Number(raw.loudness_lufs)   || null,
            },
            HARDCODED_GENRE_PROFILES,
          );

          if (!cls) {
            confidenceCounts.nula++;
          } else {
            confidenceCounts[cls.confidence]++;
            if (cls.confidence === "baixa" && lowConfidenceExamples.length < 5) {
              lowConfidenceExamples.push({
                band: transformed.band,
                filename: transformed.filename,
                detected: cls.detected,
                gap: cls.gapPct,
              });
            }
          }
        }

        setTransformedRows(rows);
        setPreview({
          totalRows: parsed.data.length,
          validRows: rows.length,
          genreDistribution,
          confidenceCounts,
          lowConfidenceExamples,
          detectedHeaders: headers,
          missingRequired: isSonara ? [] : missingRequired,
        });
      },
      error: (err) => {
        toast.error(`Erro ao parsear CSV: ${err.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (transformedRows.length === 0 || !batchName.trim()) return;
    setImporting(true);
    setResult(null);

    // Re-apply the final batch name to all rows before sending
    const finalRows = transformedRows.map((r) => ({ ...r, source_batch: batchName.trim() }));
    const csvText = buildTransformedCsv(finalRows);

    try {
      const fd = new FormData();
      fd.append("file", new Blob([csvText], { type: "text/csv" }), `${batchName}.csv`);
      const { data, error } = await supabase.functions.invoke("import-reference-tracks", { body: fd });
      if (error) throw error;
      const res = data as ImportResult;
      setResult(res);
      toast.success(
        `${res.inserted} inseridas, ${res.updated} atualizadas — ${res.genres_updated.length} gênero(s) recalculado(s)`,
      );
      onInserted?.();
    } catch (e) {
      toast.error(`Erro ao importar: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const topGenres = preview
    ? Object.entries(preview.genreDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar CSV do Sonara
          </CardTitle>
          <CardDescription>
            Aceita o formato gerado por <code>diagnostico_sonara_artistas.csv</code>. As colunas são
            remapeadas automaticamente e o gênero é classificado pelo classificador acústico do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f?.name.endsWith(".csv")) processFile(f);
              else toast.error("Apenas arquivos .csv são aceitos");
            }}
          >
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">{file ? file.name : "Clique ou arraste o CSV do Sonara aqui"}</p>
            <p className="text-xs text-muted-foreground mt-1">Colunas esperadas: artista, arquivo, bpm, energia, dancabilidade…</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>

          {preview?.missingRequired && preview.missingRequired.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Formato não reconhecido</AlertTitle>
              <AlertDescription>
                Colunas obrigatórias ausentes: <strong>{preview.missingRequired.join(", ")}</strong>.
                Verifique se este é um CSV gerado pelo script Sonara.
              </AlertDescription>
            </Alert>
          )}

          {preview && preview.missingRequired.length === 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{preview.validRows} faixas válidas</Badge>
                {preview.totalRows !== preview.validRows && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {preview.totalRows - preview.validRows} ignoradas (sem artista/arquivo)
                  </Badge>
                )}
                <Badge variant="secondary">{Object.keys(preview.genreDistribution).length} gêneros detectados</Badge>
                <Badge variant={preview.confidenceCounts.baixa > preview.validRows * 0.3 ? "destructive" : "secondary"}>
                  Confiança baixa: {preview.confidenceCounts.baixa} ({Math.round(preview.confidenceCounts.baixa / Math.max(preview.validRows, 1) * 100)}%)
                </Badge>
                <Badge variant="secondary" className="text-green-600">
                  Alta: {preview.confidenceCounts.alta}
                </Badge>
              </div>

              {preview.confidenceCounts.baixa > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Classificações de baixa confiança</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p>As faixas abaixo tiveram gap ≤ 3 pontos entre o 1º e 2º gênero mais prováveis. O gênero atribuído pode não ser preciso.</p>
                    {preview.lowConfidenceExamples.map((ex, i) => (
                      <div key={i} className="font-mono">
                        {ex.band} — {ex.filename} → <strong>{ex.detected}</strong> (gap {ex.gap}pt)
                      </div>
                    ))}
                    {preview.confidenceCounts.baixa > 5 && (
                      <p className="text-muted-foreground">…e mais {preview.confidenceCounts.baixa - 5} faixas.</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Distribuição por gênero (top 10)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gênero</TableHead>
                      <TableHead className="text-right">Faixas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topGenres.map(([genre, count]) => (
                      <TableRow key={genre}>
                        <TableCell>{genre}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Math.round((count / preview.validRows) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-name">Nome do lote</Label>
                <Input
                  id="batch-name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="ex: sonara-colecao-2026-06"
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Identifica este conjunto de importação no histórico de lotes.
                </p>
              </div>

              <Button onClick={handleImport} disabled={importing || !batchName.trim()}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando…</>
                ) : (
                  `Importar ${preview.validRows} faixas`
                )}
              </Button>
            </>
          )}

          {result && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription className="space-y-1">
                <div>
                  <strong>{result.inserted}</strong> novas ·{" "}
                  <strong>{result.updated}</strong> atualizadas ·{" "}
                  <strong>{result.skipped}</strong> ignoradas
                </div>
                <div>Gêneros recalculados: {result.genres_updated.join(", ") || "—"}</div>
                {result.errors.length > 0 && (
                  <div className="text-destructive text-xs">Erros: {result.errors.join(" | ")}</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
            <p><strong>Mapeamento de colunas:</strong></p>
            <p>
              artista → band · arquivo → filename (basename) · bpm → tempo_bpm · energia → energy ·
              dancabilidade → danceability · sentimento_valence → valence · acousticidade → acousticness ·
              loudness_lufs → lufs_integrated · alcance_dinamico_db → dynamic_range_db
            </p>
            <p className="text-muted-foreground/70">
              Colunas omitidas: mfcc_media (scalar, não compatível com vetor 13D), chroma_cens (ausente no Sonara), status_analise.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
