import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Copy,
  Check,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { DataSkeleton } from "@/components/ui/data-skeleton";
import {
  DOC_TYPE_LABELS,
  useEditalDocuments,
  type EditalDocType,
  type EditalDocument,
} from "@/hooks/useEditalDocuments";
import { toast } from "sonner";

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as EditalDocType[];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ doc }: { doc: EditalDocument }) {
  if (!doc.content || doc.content.trim().length < 20) {
    return <Badge variant="outline" className="text-amber-700 border-amber-300">Rascunho</Badge>;
  }
  if (doc.last_used_at) {
    return <Badge variant="secondary">Usado em {formatDate(doc.last_used_at)}</Badge>;
  }
  return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">Pronto</Badge>;
}

export default function EditalDocumentos() {
  const { documents, loading, saving, saveDocument, deleteDocument, markUsed } =
    useEditalDocuments();
  const [editing, setEditing] = useState<EditalDocument | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EditalDocType | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [docType, setDocType] = useState<EditalDocType>("bio");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => (filter === "all" ? documents : documents.filter((d) => d.doc_type === filter)),
    [documents, filter],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<EditalDocType, number>> = {};
    documents.forEach((d) => {
      map[d.doc_type] = (map[d.doc_type] ?? 0) + 1;
    });
    return map;
  }, [documents]);

  function openNew() {
    setEditing(null);
    setDocType("bio");
    setTitle("");
    setContent("");
    setOpen(true);
  }

  function openEdit(doc: EditalDocument) {
    setEditing(doc);
    setDocType(doc.doc_type);
    setTitle(doc.title);
    setContent(doc.content);
    setOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Informe um título");
      return;
    }
    const saved = await saveDocument({
      id: editing?.id,
      doc_type: docType,
      title: title.trim(),
      content,
    });
    if (saved) setOpen(false);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 2 MB para texto)");
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast.error("Apenas .txt ou .md são lidos automaticamente. Para PDF/DOC, copie o texto e cole aqui.");
      return;
    }
    const text = await file.text();
    setContent(text);
    if (!title) setTitle(file.name.replace(/\.(txt|md)$/i, ""));
    toast.success("Texto carregado do arquivo");
  }

  async function handleCopy(doc: EditalDocument) {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 1500);
      markUsed(doc.id);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/carreira">
              <ArrowLeft className="h-4 w-4 mr-1" /> Carreira
            </Link>
          </Button>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo documento
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Documentos do edital
        </h1>
        <p className="text-sm text-muted-foreground">
          Banco reutilizável de biografias, memoriais e materiais usados nas inscrições.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          Todos ({documents.length})
        </button>
        {DOC_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {DOC_TYPE_LABELS[t]} ({counts[t] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <DataSkeleton variant="card" lines={4} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Nenhum documento ainda. Crie sua biografia, memorial e portfólio para reutilizar nas inscrições."
                : "Nenhum documento deste tipo."}
            </p>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Criar primeiro documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-1.5 text-[10px]">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </Badge>
                    <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                  </div>
                  <StatusBadge doc={doc} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {doc.content || "Sem conteúdo."}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{doc.content.length.toLocaleString("pt-BR")} caracteres</span>
                  <span>Atualizado {formatDate(doc.updated_at)}</span>
                </div>
                <div className="flex gap-2 mt-auto pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopy(doc)}
                    disabled={!doc.content}
                  >
                    {copiedId === doc.id ? (
                      <Check className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(doc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingId(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar documento" : "Novo documento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as EditalDocType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOC_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Título</Label>
                <Input
                  className="mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Bio curta 2026"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Conteúdo</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" /> Importar .txt
                  </Button>
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="Cole ou escreva o texto. Para PDF/DOC, copie do arquivo original e cole aqui."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {content.length.toLocaleString("pt-BR")} caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Inscrições já vinculadas continuam intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) await deleteDocument(deletingId);
                setDeletingId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
