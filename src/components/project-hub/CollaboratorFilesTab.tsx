import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FolderOpen, Upload, Trash2, FileText, Loader2, Music } from "lucide-react";
import AudioPlayer from "@/components/ui/audio-player";

interface CollabFile {
  id: string;
  folder: string;
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  status: string;
  created_at: string;
  user_id: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  em_revisao: { label: "Em revisão", color: "bg-warning/20 text-warning border-warning/30" },
  final: { label: "Final", color: "bg-success/20 text-success border-success/30" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAudioMime(mime: string) {
  return mime.startsWith("audio/");
}

interface CollaboratorFilesTabProps {
  projectId: string;
}

export default function CollaboratorFilesTab({ projectId }: CollaboratorFilesTabProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [files, setFiles] = useState<CollabFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [playbackUrls, setPlaybackUrls] = useState<Record<string, string>>({});

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("project_files")
      .select("id, folder, original_name, mime_type, size, storage_path, status, created_at, user_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setFiles(data);
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Máximo 20MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "";
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `${projectId}/entregas/${fileName}`;

      const { error: uploadErr } = await supabase.storage.from("project-files").upload(storagePath, file);
      if (uploadErr) { console.error("Storage upload error:", uploadErr, "path:", storagePath); toast.error(`Erro ao enviar: ${uploadErr.message}`); return; }

      const { data: row, error: dbErr } = await supabase.from("project_files").insert({
        project_id: projectId,
        user_id: user.id,
        folder: "documentos",
        file_name: fileName,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        storage_path: storagePath,
        status: "em_revisao",
        uploaded_by_name: profile?.display_name || user.email?.split("@")[0] || "Colaborador",
      }).select().single();

      if (dbErr || !row) { toast.error("Erro ao salvar"); return; }
      setFiles((prev) => [row as CollabFile, ...prev]);
      toast.success("Arquivo enviado!");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const loadPlaybackUrl = async (fileId: string, storagePath: string) => {
    if (playbackUrls[fileId]) return;
    const { data } = await supabase.storage.from("project-files").createSignedUrl(storagePath, 300);
    if (data?.signedUrl) setPlaybackUrls((prev) => ({ ...prev, [fileId]: data.signedUrl }));
  };

  const handleDelete = async (file: CollabFile) => {
    await supabase.storage.from("project-files").remove([file.storage_path]);
    await supabase.from("project_files").delete().eq("id", file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    toast.success("Arquivo excluído");
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando arquivos…</div>;

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Meus Arquivos</span>
        <Badge variant="secondary" className="text-xs ml-auto">{files.length}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Enviar arquivo
        </Button>
        <span className="text-xs text-muted-foreground">Máximo 20MB</span>
      </div>

      {files.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum arquivo enviado por você neste projeto.
        </div>
      )}

      <div className="space-y-2">
        {files.map((file) => {
          const statusInfo = STATUS_LABELS[file.status] ?? STATUS_LABELS.em_revisao;
          const isAudio = isAudioMime(file.mime_type);

          if (isAudio && !playbackUrls[file.id]) {
            loadPlaybackUrl(file.id, file.storage_path);
          }

          return (
            <div key={file.id} className="rounded-lg border border-border bg-card/60 p-3">
              <div className="flex items-center gap-3">
                {isAudio ? <Music className="h-5 w-5 text-primary shrink-0" /> : <FileText className="h-5 w-5 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.original_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* No download button for collaborators — only playback */}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(file)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {isAudio && playbackUrls[file.id] && (
                <div className="mt-2">
                  <AudioPlayer src={playbackUrls[file.id]} fileName={file.original_name} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
