import { useState, useRef } from "react";
import {
  FolderOpen, Upload, Music, Image, FileText, Film, Mic, Layers, Sliders, Disc, Megaphone,
  Download, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Loader2, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectFiles, FOLDERS, type FolderKey } from "@/hooks/useProjectFiles";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Music, Mic, Layers, Sliders, Disc, Image, Film, Megaphone, FileText,
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  em_revisao: { label: "Em revisão", className: "bg-warning/15 text-warning border-warning/30" },
  final: { label: "Final", className: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProjectFilesTabProps {
  projectId: string;
}

export default function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const { files, loading, uploading, uploadFile, deleteFile, renameFile, updateStatus, updateComments, getFileUrl } = useProjectFiles(projectId);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["composicao", "gravacao", "mix", "master"]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState<FolderKey>("composicao");

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleUploadClick = (folder: FolderKey) => {
    setUploadFolder(folder);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      return;
    }
    await uploadFile(file, uploadFolder);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (storagePath: string, originalName: string) => {
    const url = await getFileUrl(storagePath);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    a.target = "_blank";
    a.click();
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const confirmRename = async () => {
    if (editingId && editName.trim()) {
      await renameFile(editingId, editName.trim());
    }
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Arquivos do Projeto</span>
        <Badge variant="secondary" className="text-[10px]">{files.length} {files.length === 1 ? "arquivo" : "arquivos"}</Badge>
      </div>

      {FOLDERS.map((folder) => {
        const Icon = ICON_MAP[folder.icon] || FileText;
        const folderFiles = files.filter((f) => f.folder === folder.key);
        const isOpen = openFolders.has(folder.key);

        return (
          <div key={folder.key} className="rounded-lg border border-border/60 overflow-hidden">
            {/* Folder header */}
            <button
              onClick={() => toggleFolder(folder.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <div className="p-1.5 rounded-md bg-muted/50">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium flex-1 text-left">{folder.label}</span>
              <span className="text-[10px] text-muted-foreground">{folderFiles.length}</span>
            </button>

            {/* Folder content */}
            {isOpen && (
              <div className="border-t border-border/40 bg-muted/10">
                {folderFiles.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground/60 mb-2">Nenhum arquivo nesta pasta</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 h-7"
                      onClick={() => handleUploadClick(folder.key)}
                      disabled={uploading}
                    >
                      <Upload className="h-3 w-3" />
                      Enviar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {folderFiles.map((file) => {
                      const statusInfo = STATUS_LABELS[file.status] || STATUS_LABELS.em_revisao;
                      return (
                        <div key={file.id} className="flex items-center gap-2 px-3 py-2 group hover:bg-muted/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            {editingId === file.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-6 text-xs"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setEditingId(null); }}
                                />
                                <button onClick={confirmRename} className="text-[hsl(var(--success))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-80"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : (
                              <p className="text-xs font-medium truncate">{file.originalName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground">{file.uploadedByName}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => updateStatus(file.id, file.status === "final" ? "em_revisao" : "final")}
                            className="shrink-0"
                          >
                            <Badge variant="outline" className={`text-[9px] cursor-pointer hover:opacity-80 ${statusInfo.className}`}>
                              {statusInfo.label}
                            </Badge>
                          </button>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startRename(file.id, file.originalName)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDownload(file.storagePath, file.originalName)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                              <Download className="h-3 w-3" />
                            </button>
                            <button onClick={() => deleteFile(file.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1.5 h-7 text-muted-foreground"
                        onClick={() => handleUploadClick(folder.key)}
                        disabled={uploading}
                      >
                        <Upload className="h-3 w-3" />
                        {uploading ? "Enviando..." : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
