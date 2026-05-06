import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { trackAppEvent } from "@/lib/analytics";

export const FOLDERS = [
  { key: "composicao", label: "Composição", icon: "Music" },
  { key: "gravacao", label: "Gravação", icon: "Mic" },
  { key: "stems", label: "Stems", icon: "Layers" },
  { key: "mix", label: "Mix", icon: "Sliders" },
  { key: "master", label: "Master", icon: "Disc" },
  { key: "capa", label: "Capa", icon: "Image" },
  { key: "videos", label: "Vídeos", icon: "Film" },
  { key: "divulgacao", label: "Divulgação", icon: "Megaphone" },
  { key: "documentos", label: "Documentos", icon: "FileText" },
] as const;

export type FolderKey = (typeof FOLDERS)[number]["key"];

export interface ProjectFile {
  id: string;
  projectId: string;
  userId: string;
  folder: FolderKey;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  status: "em_revisao" | "final";
  uploadedByName: string;
  versionNumber: number;
  parentFileId: string | null;
  comments: string;
  createdAt: string;
  updatedAt: string;
}

function dbToFile(row: any): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    folder: row.folder,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    storagePath: row.storage_path,
    status: row.status,
    uploadedByName: row.uploaded_by_name,
    versionNumber: row.version_number,
    parentFileId: row.parent_file_id,
    comments: row.comments ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useProjectFiles(projectId: string) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (!error && data) setFiles(data.map(dbToFile));
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Upload
  const uploadFile = useCallback(async (file: File, folder: FolderKey) => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "";
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `${projectId}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file);
      if (uploadError) { console.error("Storage upload error:", uploadError, "path:", storagePath); toast.error(`Erro ao enviar: ${uploadError.message}`); setUploading(false); return null; }

      const { data: row, error: dbError } = await supabase
        .from("project_files")
        .insert({
          project_id: projectId,
          user_id: user.id,
          folder,
          file_name: fileName,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          storage_path: storagePath,
          status: "em_revisao",
          uploaded_by_name: profile?.display_name || user.email?.split("@")[0] || "Usuário",
        })
        .select()
        .single();
      if (dbError || !row) { toast.error("Erro ao salvar metadados"); setUploading(false); return null; }

      const newFile = dbToFile(row);
      setFiles((prev) => [newFile, ...prev]);
      trackAppEvent("file_uploaded", {
        project_id: projectId,
        folder,
        mime_type: file.type,
        size_kb: Math.round(file.size / 1024),
      });
      toast.success("Arquivo enviado!");
      return newFile;
    } finally {
      setUploading(false);
    }
  }, [user, projectId, profile]);

  // Delete
  const deleteFile = useCallback(async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;
    await supabase.storage.from("project-files").remove([file.storagePath]);
    await supabase.from("project_files").delete().eq("id", fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.success("Arquivo excluído");
  }, [files]);

  // Rename
  const renameFile = useCallback(async (fileId: string, newName: string) => {
    await supabase.from("project_files").update({ original_name: newName }).eq("id", fileId);
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, originalName: newName } : f));
  }, []);

  // Update status
  const updateStatus = useCallback(async (fileId: string, status: "em_revisao" | "final") => {
    await supabase.from("project_files").update({ status }).eq("id", fileId);
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status } : f));
    toast.success(status === "final" ? "Marcado como final" : "Marcado como em revisão");
  }, []);

  // Update comments
  const updateComments = useCallback(async (fileId: string, comments: string) => {
    await supabase.from("project_files").update({ comments } as any).eq("id", fileId);
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, comments } : f));
  }, []);

  // Get signed URL for preview/download
  const getFileUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(storagePath, 3600);
    if (error) { console.error(error); return null; }
    return data.signedUrl;
  }, []);

  return { files, loading, uploading, uploadFile, deleteFile, renameFile, updateStatus, updateComments, getFileUrl, refetch: fetchFiles };
}
