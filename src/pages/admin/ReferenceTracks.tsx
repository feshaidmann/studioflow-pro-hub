import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Papa from "papaparse";
import { Database, Upload, RefreshCw, FileText, Loader2, AlertCircle, CheckCircle2, PackageCheck, Music2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenceCoverageReport } from "@/components/admin/ReferenceCoverageReport";
import { ReferenceTrackIngestor } from "@/components/admin/ReferenceTrackIngestor";
import { SonaraCsvImporter } from "@/components/admin/SonaraCsvImporter";

interface PreviewStats {
  rows: number;
  genres: Record<string, number>;
  bands: Record<string, number>;
  headers: string[];
  missingRequired: string[];
}

interface ImportResult {
  batch: string;
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  genres_updated: string[];
  benchmarks_recalc: Record<string, string>;
  errors: string[];
}

interface BatchSummary {
  source_batch: string;
  total: number;
  genres: number;
  last_at: string;
}

interface CoverageRow {
  genre: string;
  refTracks: number;
  benchmarkTotal: number | null;
  benchmarkAt: string | null;
}

const REQUIRED = ["band", "filename", "genre"];

export default function ReferenceTracks() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshot, setSnapshot] = useState<{ count: number; generated_at: string; size_bytes: number; public_url: string } | null>(null);

  const SNAPSHOT_BUCKET = "creative-assets";
  const SNAPSHOT_PATH = "acoustic-catalog/v1.json";

  const refreshSnapshotMeta = async () => {
    try {
      const { data: pub } = supabase.storage.from(SNAPSHOT_BUCKET).getPublicUrl(SNAPSHOT_PATH);
      const res = await fetch(pub.publicUrl, { cache: "no-store" });
      if (!res.ok) {
        setSnapshot(null);
        return;
      }
      const json = await res.json();
      setSnapshot({
        count: json.count,
        generated_at: json.generated_at,
        size_bytes: Number(res.headers.get("content-length") ?? 0),
        public_url: pub.publicUrl,
      });
    } catch {
      setSnapshot(null);
    }
  };

  const handleGenerateSnapshot = async () => {
    setSnapshotting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-acoustic-catalog", { body: {} });
      if (error) throw error;
      toast.success(`Snapshot gerado: ${data?.count ?? "?"} faixas`);
      // Clear browser session cache so MusicDNAAnalyzer pulls the fresh version
      try { sessionStorage.removeItem("acoustic-catalog:v1"); } catch { /* ignore */ }
      await refreshSnapshotMeta();
    } catch (e) {
      toast.error(`Falha ao gerar snapshot: ${(e as Error).message}`);
    } finally {
      setSnapshotting(false);
    }
  };

  const refreshMeta = async () => {
    setLoadingMeta(true);
    const [{ data: refs }, { data: bms }] = await Promise.all([
      supabase.from("music_reference_tracks").select("source_batch, genre, created_at").limit(10000),
      supabase.from("music_dna_benchmarks").select("genero, total_faixas, atualizado_em"),
    ]);

    if (refs) {
      const map = new Map<string, BatchSummary>();
      for (const r of refs as Array<{ source_batch: string; genre: string; created_at: string }>) {
        const key = r.source_batch || "(sem nome)";
        const cur = map.get(key) ?? { source_batch: key, total: 0, genres: 0, last_at: r.created_at };
        cur.total += 1;
        if (r.created_at > cur.last_at) cur.last_at = r.created_at;
        map.set(key, cur);
      }
      // count distinct genres per batch
      const genreByBatch = new Map<string, Set<string>>();
      for (const r of refs as Array<{ source_batch: string; genre: string; created_at: string }>) {
        const key = r.source_batch || "(sem nome)";
        const set = genreByBatch.get(key) ?? new Set<string>();
        set.add(r.genre);
        genreByBatch.set(key, set);
      }
      for (const [k, v] of map) v.genres = genreByBatch.get(k)?.size ?? 0;
      setBatches([...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at)));
    }

    if (refs) {
      const refByGenre = new Map<string, number>();
      for (const r of refs as Array<{ genre: string }>) {
        refByGenre.set(r.genre, (refByGenre.get(r.genre) ?? 0) + 1);
      }
      const bmMap = new Map<string, { total: number; at: string }>();
      for (const b of (bms ?? []) as Array<{ genero: string; total_faixas: number; atualizado_em: string }>) {
        bmMap.set(b.genero, { total: b.total_faixas, at: b.atualizado_em });
      }
      const allGenres = new Set<string>([...refByGenre.keys(), ...bmMap.keys()]);
      const rows: CoverageRow[] = [];
      for (const g of allGenres) {
        rows.push({
          genre: g,
          refTracks: refByGenre.get(g) ?? 0,
          benchmarkTotal: bmMap.get(g)?.total ?? null,
          benchmarkAt: bmMap.get(g)?.at ?? null,
        });
      }
      setCoverage(rows.sort((a, b) => b.refTracks - a.refTracks));
    }
    setLoadingMeta(false);
  };

  useEffect(() => {
    if (isAdmin) {
      refreshMeta();
      refreshSnapshotMeta();
    }
  }, [isAdmin]);

  const onFileSelected = async (f: File) => {
    setFile(f);
    setResult(null);
    const text = await f.text();
    setCsvText(text);
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
      preview: 5000,
    });
    const headers = parsed.meta?.fields ?? [];
    const missing = REQUIRED.filter((k) => !headers.includes(k));
    const genres: Record<string, number> = {};
    const bands: Record<string, number> = {};
    for (const r of parsed.data) {
      const g = r.genre ?? "(sem)"; genres[g] = (genres[g] ?? 0) + 1;
      const b = r.band ?? "(sem)"; bands[b] = (bands[b] ?? 0) + 1;
    }
    setPreview({ rows: parsed.data.length, genres, bands, headers, missingRequired: missing });
  };

  const handleImport = async () => {
    if (!file || !csvText) return;
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", new Blob([csvText], { type: "text/csv" }), file.name);
      const { data, error } = await supabase.functions.invoke("import-reference-tracks", { body: fd });
      if (error) throw error;
      const res = data as ImportResult;
      setResult(res);
      toast.success(`${res.inserted} novas, ${res.updated} atualizadas — ${res.genres_updated.length} gênero(s) recalculado(s)`);
      refreshMeta();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erro ao importar: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  // Benchmarks agora derivam em tempo real da view unificada — sem ação manual.


  const previewBadges = useMemo(() => {
    if (!preview) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Badge variant="secondary">{preview.rows} linhas</Badge>
        <Badge variant="secondary">{Object.keys(preview.genres).length} gêneros</Badge>
        <Badge variant="secondary">{Object.keys(preview.bands).length} bandas</Badge>
        {preview.missingRequired.length > 0 && (
          <Badge variant="destructive">Faltando: {preview.missingRequired.join(", ")}</Badge>
        )}
      </div>
    );
  }, [preview]);

  if (adminLoading) {
    return <div className="p-8 text-muted-foreground">Carregando…</div>;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Faixas de Referência</h1>
      </header>
      <p className="text-sm text-muted-foreground max-w-3xl">
        Importe CSVs de análise musical (formato com 60+ colunas: features Spotify-like + métricas técnicas) para alimentar
        os benchmarks de gênero do DNA Musical e enriquecer o contexto da IA. A coluna <code>file_path</code> é descartada
        automaticamente para preservar privacidade.
      </p>

      <Tabs defaultValue="ingest" className="w-full">
        <TabsList>
          <TabsTrigger value="ingest" className="flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5" /> Inserir por áudio
          </TabsTrigger>
          <TabsTrigger value="sonara">Importar Sonara CSV</TabsTrigger>
          <TabsTrigger value="import">Importação CSV & lotes</TabsTrigger>
          <TabsTrigger value="coverage">Cobertura por gênero</TabsTrigger>
        </TabsList>

        <TabsContent value="ingest" className="mt-4">
          <ReferenceTrackIngestor onInserted={() => { refreshMeta(); refreshSnapshotMeta(); }} />
        </TabsContent>

        <TabsContent value="sonara" className="mt-4">
          <SonaraCsvImporter onInserted={() => { refreshMeta(); refreshSnapshotMeta(); }} />
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <ReferenceCoverageReport />
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Importar CSV</CardTitle>
          <CardDescription>Arraste ou selecione um arquivo .csv. Linhas duplicadas (mesma banda+filename) são atualizadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f && f.name.endsWith(".csv")) onFileSelected(f);
              else toast.error("Apenas arquivos .csv são aceitos");
            }}
          >
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">{file ? file.name : "Clique ou arraste um CSV aqui"}</p>
            <p className="text-xs text-muted-foreground mt-1">Tamanho máximo recomendado: 20 MB</p>
            <input
              ref={fileInputRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelected(f);
              }}
            />
          </div>

          {previewBadges}

          {preview && preview.missingRequired.length === 0 && (
            <div className="flex items-center gap-2">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando…</> : "Importar"}
              </Button>
              {file && <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>}
            </div>
          )}

          {result && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription className="space-y-1">
                <div><strong>{result.inserted}</strong> novas, <strong>{result.updated}</strong> atualizadas, <strong>{result.skipped}</strong> ignoradas</div>
                <div>Gêneros recalculados: {result.genres_updated.join(", ") || "—"}</div>
                {result.errors.length > 0 && (
                  <div className="text-destructive text-xs">Erros: {result.errors.join(" | ")}</div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" /> Snapshot acústico (catálogo público)
            </CardTitle>
            <CardDescription>
              Gera <code>creative-assets/acoustic-catalog/v1.json</code> com todas as faixas de referência (MFCC + Chroma + métricas físicas).
              Consumido pelo painel de Match Acústico no Music DNA.
            </CardDescription>
          </div>
          <Button onClick={handleGenerateSnapshot} disabled={snapshotting}>
            {snapshotting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando…</> : <><RefreshCw className="h-4 w-4 mr-2" />Gerar snapshot</>}
          </Button>
        </CardHeader>
        <CardContent>
          {snapshot ? (
            <div className="text-sm space-y-1">
              <div><strong>{snapshot.count}</strong> faixas · {(snapshot.size_bytes / 1024).toFixed(0)} KB</div>
              <div className="text-muted-foreground">
                Gerado em {new Date(snapshot.generated_at).toLocaleString("pt-BR")}
              </div>
              <a
                href={snapshot.public_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-primary hover:underline break-all"
              >
                {snapshot.public_url}
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum snapshot encontrado ainda. Clique em <strong>Gerar snapshot</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cobertura de Benchmarks</CardTitle>
            <CardDescription>
              Benchmarks são derivados em tempo real do catálogo de faixas de referência (view unificada). Atualizam automaticamente a cada novo import.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMeta ? <div className="text-sm text-muted-foreground">Carregando…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gênero</TableHead>
                  <TableHead className="text-right">Faixas reais</TableHead>
                  <TableHead className="text-right">Benchmark total</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverage.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma faixa importada ainda.</TableCell></TableRow>
                )}
                {coverage.map((r) => (
                  <TableRow key={r.genre}>
                    <TableCell className="font-medium">{r.genre}</TableCell>
                    <TableCell className="text-right">{r.refTracks}</TableCell>
                    <TableCell className="text-right">{r.benchmarkTotal ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.benchmarkAt ? new Date(r.benchmarkAt).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Importados</CardTitle>
          <CardDescription>Histórico de CSVs processados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Faixas</TableHead>
                <TableHead className="text-right">Gêneros</TableHead>
                <TableHead>Última atualização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum lote ainda.</TableCell></TableRow>
              )}
              {batches.map((b) => (
                <TableRow key={b.source_batch}>
                  <TableCell className="font-mono text-xs">{b.source_batch}</TableCell>
                  <TableCell className="text-right">{b.total}</TableCell>
                  <TableCell className="text-right">{b.genres}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(b.last_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {preview && preview.missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSV inválido</AlertTitle>
          <AlertDescription>
            Faltam colunas obrigatórias: {preview.missingRequired.join(", ")}
          </AlertDescription>
        </Alert>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
