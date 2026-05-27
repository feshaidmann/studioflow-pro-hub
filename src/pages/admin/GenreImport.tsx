import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Papa from "papaparse";
import { Tags, Upload, FileText, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreviewStats {
  rows: number;
  validRows: number;
  skippedRows: number;
  genres: Record<string, number>;
  bands: Record<string, number>;
  headers: string[];
  missingRequired: string[];
}

interface ImportResult {
  csv_skipped: number;
  staging_inserted: number;
  insert_errors: string[];
  staging_rows: number;
  staging_unique: number;
  updated: number;
  unchanged: number;
  unmatched: number;
  top_genres_after: Array<{ genre: string; n: number }>;
}

const REQUIRED = ["band", "filename", "genre"];

export default function GenreImport() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [dropStaging, setDropStaging] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFileSelected = async (f: File) => {
    setFile(f);
    setResult(null);
    const text = await f.text();
    setCsvText(text);
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
    });
    const headers = parsed.meta?.fields ?? [];
    const missing = REQUIRED.filter((k) => !headers.includes(k));
    const genres: Record<string, number> = {};
    const bands: Record<string, number> = {};
    let valid = 0, skipped = 0;
    for (const r of parsed.data) {
      const band = String(r.band ?? "").trim();
      const filename = String(r.filename ?? "").trim();
      const genre = String(r.genre ?? "").trim();
      if (!band || !filename || !genre) { skipped++; continue; }
      valid++;
      genres[genre] = (genres[genre] ?? 0) + 1;
      bands[band] = (bands[band] ?? 0) + 1;
    }
    setPreview({
      rows: parsed.data.length,
      validRows: valid,
      skippedRows: skipped,
      genres, bands, headers, missingRequired: missing,
    });
  };

  const handleImport = async () => {
    if (!file || !csvText) return;
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", new Blob([csvText], { type: "text/csv" }), file.name);
      fd.append("dropStaging", String(dropStaging));
      const { data, error } = await supabase.functions.invoke("apply-genre-import", { body: fd });
      if (error) throw error;
      const res = data as ImportResult;
      setResult(res);
      toast.success(`${res.updated} atualizadas · ${res.unmatched} sem correspondência`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erro ao aplicar import: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const clearCatalogCache = () => {
    try { sessionStorage.removeItem("acoustic-catalog:v1"); } catch { /* ignore */ }
    toast.success("Cache do catálogo limpo");
  };

  const previewBadges = useMemo(() => {
    if (!preview) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Badge variant="secondary">{preview.validRows} linhas válidas</Badge>
        <Badge variant="secondary">{Object.keys(preview.genres).length} gêneros</Badge>
        <Badge variant="secondary">{Object.keys(preview.bands).length} bandas</Badge>
        {preview.skippedRows > 0 && (
          <Badge variant="outline">{preview.skippedRows} ignoradas (vazias)</Badge>
        )}
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

  const canImport = preview && preview.missingRequired.length === 0 && preview.validRows > 0;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center gap-2">
        <Tags className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Import de Gêneros</h1>
      </header>
      <p className="text-sm text-muted-foreground max-w-3xl">
        Envie um CSV com colunas <code>band, filename, genre</code> para reclassificar gêneros em massa nas
        faixas de referência. Cada update é precedido por backup automático em{" "}
        <code>music_reference_tracks_genre_backup</code>. Os benchmarks por gênero atualizam sozinhos (view derivada).
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Enviar CSV</CardTitle>
          <CardDescription>
            Colunas obrigatórias: <code>band</code>, <code>filename</code>, <code>genre</code>. Linhas com qualquer
            campo vazio são ignoradas. O match contra <code>music_reference_tracks</code> é por <code>(band, filename)</code>.
          </CardDescription>
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
            <p className="text-xs text-muted-foreground mt-1">Tamanho máximo recomendado: 5 MB</p>
            <input
              ref={fileInputRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelected(f);
              }}
            />
          </div>

          {previewBadges}

          {preview && preview.missingRequired.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>CSV inválido</AlertTitle>
              <AlertDescription>
                Faltam colunas obrigatórias: {preview.missingRequired.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {canImport && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={dropStaging}
                  onCheckedChange={(v) => setDropStaging(v === true)}
                />
                Apagar staging após aplicar
              </label>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={importing}>
                    {importing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aplicando…</>
                      : "Aplicar import"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar import de gêneros?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        Vai atualizar a coluna <code>genre</code> em{" "}
                        <strong>{preview.validRows}</strong> linha(s) da staging.
                      </span>
                      <span className="block">
                        Backup automático em <code>music_reference_tracks_genre_backup</code> antes de cada update.
                      </span>
                      <span className="block">
                        Benchmarks por gênero atualizam sozinhos (view derivada).
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImport}>Aplicar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Import aplicado</AlertTitle>
            <AlertDescription>
              {result.updated} atualizadas · {result.unchanged} sem mudança · {result.unmatched} sem correspondência
              {result.insert_errors.length > 0 && (
                <div className="text-destructive text-xs mt-1">
                  Erros na staging: {result.insert_errors.join(" | ")}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold">{result.updated}</p>
              <p className="text-xs text-muted-foreground">Atualizadas</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold">{result.unchanged}</p>
              <p className="text-xs text-muted-foreground">Sem mudança</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-destructive">{result.unmatched}</p>
              <p className="text-xs text-muted-foreground">Sem correspondência</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold">{result.staging_unique}</p>
              <p className="text-xs text-muted-foreground">Únicas em staging</p>
            </CardContent></Card>
          </div>

          <p className="text-xs text-muted-foreground">
            CSV enviado: {result.staging_inserted} linhas · staging final (pós dedupe): {result.staging_rows} ·
            ignoradas no CSV: {result.csv_skipped}
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top gêneros após aplicação</CardTitle>
              <CardDescription>Distribuição atual em <code>music_reference_tracks</code></CardDescription>
            </CardHeader>
            <CardContent>
              {result.top_genres_after.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gênero</TableHead>
                      <TableHead className="text-right">Faixas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.top_genres_after.map((g) => (
                      <TableRow key={g.genre}>
                        <TableCell className="font-medium">{g.genre}</TableCell>
                        <TableCell className="text-right">{g.n}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={clearCatalogCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar cache do catálogo acústico
          </Button>
        </>
      )}
    </div>
  );
}
