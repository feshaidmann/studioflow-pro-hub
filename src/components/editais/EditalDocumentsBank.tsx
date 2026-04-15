import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEditalDocuments, useUpsertEditalDocument, useDeleteEditalDocument } from "@/hooks/useEditalDocuments";
import { DOC_TYPE_LABELS, DOC_TYPES, type DocType, type EditalDocument } from "@/types/editais";

export default function EditalDocumentsBank() {
  const { data: documents = [], isLoading } = useEditalDocuments();
  const upsertDoc = useUpsertEditalDocument();
  const deleteDoc = useDeleteEditalDocument();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EditalDocument> & { id?: string }>({});

  const openNew = () => {
    setEditing({ doc_type: "outro", title: "", content: "" });
    setEditOpen(true);
  };

  const openEdit = (doc: EditalDocument) => {
    setEditing({ id: doc.id, doc_type: doc.doc_type, title: doc.title, content: doc.content });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editing.title?.trim() || !editing.doc_type) return;
    upsertDoc.mutate(
      { id: editing.id, doc_type: editing.doc_type as DocType, title: editing.title, content: editing.content || "" },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Banco de Documentos</h3>
          <p className="text-xs text-muted-foreground">Documentos reutilizáveis para candidaturas</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhum documento cadastrado</p>
            <p className="text-xs mt-1">Crie bios, memoriais e outros textos para reutilizar em várias candidaturas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {DOC_TYPE_LABELS[doc.doc_type as DocType] || doc.doc_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {wordCount(doc.content)} palavras
                      {doc.last_used_at && ` · Usado em ${new Date(doc.last_used_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteDoc.mutate(doc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar documento" : "Novo documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={editing.title || ""} onChange={(e) => setEditing(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Bio artística resumida" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={editing.doc_type || "outro"} onValueChange={(v) => setEditing(p => ({ ...p, doc_type: v as DocType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(dt => (
                    <SelectItem key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={editing.content || ""}
                onChange={(e) => setEditing(p => ({ ...p, content: e.target.value }))}
                rows={10}
                placeholder="Escreva ou cole o texto do documento..."
              />
              <p className="text-xs text-muted-foreground mt-1">{wordCount(editing.content || "")} palavras</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={upsertDoc.isPending || !editing.title?.trim()}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {upsertDoc.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
