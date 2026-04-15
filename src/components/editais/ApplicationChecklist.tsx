import { useState } from "react";
import { Plus, Trash2, Check, Square, LinkIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useApplicationDocs, useAddApplicationDoc, useToggleDocCompleted, useLinkDocumentToAppDoc, useDeleteApplicationDoc } from "@/hooks/useApplicationDocs";
import { useEditalDocuments } from "@/hooks/useEditalDocuments";
import { DOC_TYPE_LABELS, DOC_TYPES, type DocType, type ApplicationDoc } from "@/types/editais";

interface Props {
  applicationId: string;
}

export default function ApplicationChecklist({ applicationId }: Props) {
  const { data: docs = [], isLoading } = useApplicationDocs(applicationId);
  const { data: bankDocs = [] } = useEditalDocuments();
  const addDoc = useAddApplicationDoc();
  const toggleDoc = useToggleDocCompleted();
  const linkDoc = useLinkDocumentToAppDoc();
  const deleteDoc = useDeleteApplicationDoc();

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<string>("outro");
  const [newRequired, setNewRequired] = useState(true);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingDoc, setLinkingDoc] = useState<ApplicationDoc | null>(null);
  const [selectedBankDocId, setSelectedBankDocId] = useState<string>("");

  const completedCount = docs.filter(d => d.is_completed).length;
  const requiredCount = docs.filter(d => d.is_required).length;
  const requiredCompleted = docs.filter(d => d.is_required && d.is_completed).length;
  const progress = docs.length > 0 ? Math.round((completedCount / docs.length) * 100) : 0;

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addDoc.mutate(
      { application_id: applicationId, doc_label: newLabel, doc_type: newType, is_required: newRequired },
      {
        onSuccess: () => {
          setNewLabel("");
          setNewType("outro");
          setAddOpen(false);
        },
      }
    );
  };

  const handleLink = () => {
    if (!linkingDoc || !selectedBankDocId) return;
    linkDoc.mutate(
      { appDocId: linkingDoc.id, editalDocumentId: selectedBankDocId },
      { onSuccess: () => { setLinkOpen(false); setLinkingDoc(null); setSelectedBankDocId(""); } }
    );
  };

  const openLink = (doc: ApplicationDoc) => {
    setLinkingDoc(doc);
    setSelectedBankDocId(doc.edital_document_id || "");
    setLinkOpen(true);
  };

  // Filter bank docs by matching type
  const filteredBankDocs = linkingDoc?.doc_type
    ? bankDocs.filter(d => d.doc_type === linkingDoc.doc_type || d.doc_type === "outro")
    : bankDocs;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Checklist de documentos</p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{docs.length} completos
            {requiredCount > 0 && ` · ${requiredCompleted}/${requiredCount} obrigatórios`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={progress === 100 ? "default" : "outline"} className="text-xs">
            {progress}%
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {docs.length > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum documento no checklist</p>
            <p className="text-xs mt-1">Adicione os documentos exigidos pelo edital ou use a IA para extraí-los automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${
                doc.is_completed ? "bg-muted/50 border-border/50" : "border-border"
              }`}
            >
              <Checkbox
                checked={doc.is_completed}
                onCheckedChange={(checked) => toggleDoc.mutate({ id: doc.id, is_completed: !!checked })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${doc.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {doc.doc_label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {doc.is_required && <span className="text-[10px] text-destructive font-medium">Obrigatório</span>}
                  {doc.doc_type && (
                    <span className="text-[10px] text-muted-foreground">
                      {DOC_TYPE_LABELS[doc.doc_type as DocType] || doc.doc_type}
                    </span>
                  )}
                  {doc.edital_document_id && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      <LinkIcon className="h-2.5 w-2.5 mr-0.5" />
                      Vinculado
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openLink(doc)} title="Vincular documento do banco">
                  <LinkIcon className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteDoc.mutate(doc.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add doc dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar documento ao checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descrição do documento</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Memorial descritivo (2.000 palavras)" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(dt => (
                    <SelectItem key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={newRequired} onCheckedChange={(c) => setNewRequired(!!c)} id="req" />
              <Label htmlFor="req" className="text-sm">Obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={addDoc.isPending || !newLabel.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link doc dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular documento do banco</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione um documento do seu banco para vincular a: <strong>{linkingDoc?.doc_label}</strong>
            </p>
            {filteredBankDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum documento compatível no banco. Crie um na aba "Documentos".
              </p>
            ) : (
              <Select value={selectedBankDocId} onValueChange={setSelectedBankDocId}>
                <SelectTrigger><SelectValue placeholder="Selecione um documento" /></SelectTrigger>
                <SelectContent>
                  {filteredBankDocs.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleLink} disabled={linkDoc.isPending || !selectedBankDocId}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
