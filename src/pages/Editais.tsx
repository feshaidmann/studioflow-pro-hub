import { useState } from "react";
import { Search, Download, Save, Trash2, ExternalLink, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEditais, type Edital } from "@/hooks/useEditais";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

const UF_OPTIONS = [
  "Nacional", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ",
  "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const AREA_OPTIONS = ["Música", "Audiovisual", "Ambos", "Outra"];

function statusColor(status: string) {
  if (status === "Aberto") return "bg-green-500/15 text-green-700 border-green-200";
  if (status === "Encerrado") return "bg-red-500/15 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground border-border";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  } catch { return d; }
}

function EditalTable({ items, onDelete }: { items: Edital[]; onDelete?: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="w-16">UF</TableHead>
            <TableHead>Órgão</TableHead>
            <TableHead className="w-24">Prazo</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Área</TableHead>
            <TableHead className="w-16">Link</TableHead>
            {onDelete && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={e.id || i}>
              <TableCell className="font-medium max-w-[260px] truncate">{e.titulo}</TableCell>
              <TableCell className="text-xs">{e.estado || "—"}</TableCell>
              <TableCell className="text-xs max-w-[140px] truncate">{e.orgao || "—"}</TableCell>
              <TableCell className="text-xs tabular-nums">{formatDate(e.prazo)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
              </TableCell>
              <TableCell className="text-xs">{e.area || "—"}</TableCell>
              <TableCell>
                {e.link && e.link !== "—" ? (
                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : "—"}
              </TableCell>
              {onDelete && (
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => e.id && onDelete(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Editais() {
  const { t } = useLanguage();
  const { projects } = useProjects();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState("");
  const [filterUF, setFilterUF] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);

  const { editais, loading, searching, searchResult, search, saveResults, deleteEdital, exportCSV } = useEditais();

  const handleSearch = () => {
    if (!query.trim()) return;
    const srcList = sources.split("\n").map(s => s.trim()).filter(Boolean);
    let fullQuery = query.trim();
    if (filterUF) fullQuery += ` em ${filterUF}`;
    if (filterArea) fullQuery += ` na área de ${filterArea}`;
    search(fullQuery, srcList.length > 0 ? srcList : undefined, linkedProjectId || undefined);
  };

  const resultEditais = searchResult?.editais || [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{t("editais.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("editais.subtitle")}</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("editais.searchPlaceholder")}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              <Search className="h-4 w-4 mr-1.5" />
              {searching ? t("editais.searching") : t("editais.search")}
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                <ChevronDown className="h-3 w-3" />
                {t("editais.additionalSources")}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <Textarea
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                placeholder={t("editais.sourcesPlaceholder")}
                rows={3}
              />
              <div className="flex gap-2 flex-wrap">
                <Select value={filterUF} onValueChange={setFilterUF}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {AREA_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results */}
      {searching && (
        <Card>
          <CardContent className="pt-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {!searching && !searchResult && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{t("editais.emptyState")}</p>
          </CardContent>
        </Card>
      )}

      {!searching && searchResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("editais.results")} ({resultEditais.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultEditais.length > 0 ? (
              <>
                <EditalTable items={resultEditais} />

                {/* Report */}
                {searchResult.message && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">{t("editais.report")}</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-60 overflow-auto">
                      {searchResult.message}
                    </pre>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-border/40">
                  <Select value={linkedProjectId || ""} onValueChange={(v) => setLinkedProjectId(v || null)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("editais.linkProject")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("editais.noProject")}</SelectItem>
                      {projects.filter(p => !p.completed).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => saveResults(resultEditais, linkedProjectId)}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {t("editais.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(resultEditais)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t("editais.exportCSV")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("editais.noResults")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved editais */}
      {editais.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("editais.saved")} ({editais.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <EditalTable items={editais as any} onDelete={deleteEdital} />
          </CardContent>
        </Card>
      )}

      {loading && editais.length === 0 && (
        <Card>
          <CardContent className="pt-5 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
