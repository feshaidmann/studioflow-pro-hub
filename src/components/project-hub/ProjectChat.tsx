import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, useMemo } from "react";
import { useProjectChat, ChatMessage } from "@/hooks/useProjectChat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, Lock, AlertCircle, CheckCircle2, ListChecks, Paperclip,
  Filter, X as XIcon, FileText, Download, Image as ImageIcon, Music, AtSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AudioPlayer from "@/components/ui/audio-player";

interface ProjectChatProps {
  projectId: string;
  isOwner?: boolean;
}

interface ProjectMember {
  name: string;
  email: string;
  role: string;
  user_id: string;
}

export default function ProjectChat({ projectId, isOwner = false }: ProjectChatProps) {
  const {
    messages, loading, sending, sendMessage, currentUserId,
    togglePending, toggleResolved, linkTask,
  } = useProjectChat(projectId);

  const [input, setInput] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [playbackUrls, setPlaybackUrls] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch project members once
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from("project_members")
      .select("name, email, role, user_id")
      .eq("project_id", projectId)
      .then(({ data }) => {
        if (data) setMembers(data.filter((m) => m.name));
      });
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mention suggestions
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, members]);

  const displayMessages = filterPending
    ? messages.filter((m) => m.is_pending && !m.is_resolved)
    : messages;

  const pendingCount = messages.filter((m) => m.is_pending && !m.is_resolved).length;

  // Parse @mentions from text, return array of { name, member }
  function parseMentions(text: string): { name: string; member: ProjectMember }[] {
    const regex = /@([\w\s]+?)(?=\s@|\s*$|[.,;!?])/gi;
    const results: { name: string; member: ProjectMember }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const mentionName = match[1].trim().toLowerCase();
      const member = members.find((m) => m.name.toLowerCase() === mentionName);
      if (member) results.push({ name: match[1].trim(), member });
    }
    return results;
  }

  const handleSend = async () => {
    if (!input.trim() && !attachFile) return;

    let attachPath = "";
    let attachName = "";

    if (attachFile) {
      setUploading(true);
      const ext = attachFile.name.split(".").pop() || "bin";
      const storagePath = `${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("project-files").upload(storagePath, attachFile);
      if (error) {
        console.error("Storage upload error:", error, "path:", storagePath);
        toast.error(`Erro no upload: ${error.message}`);
        setUploading(false);
        return;
      }
      attachPath = storagePath;
      attachName = attachFile.name;
      setUploading(false);
    }

    const content = input.trim() || (attachName ? `📎 ${attachName}` : "");

    // Detect @mentions and create tasks
    const mentions = parseMentions(content);
    if (mentions.length > 0 && currentUserId) {
      // Extract task description: remove the @mention prefix, keep the rest
      for (const { name, member } of mentions) {
        const taskDesc = content.replace(new RegExp(`@${name}`, "i"), "").trim();
        if (taskDesc) {
          const desc = taskDesc.length > 120 ? taskDesc.slice(0, 120) + "…" : taskDesc;
          await supabase.from("tasks").insert({
            user_id: currentUserId,
            project_id: projectId,
            description: `[Chat] ${desc}`,
            source: "chat",
            source_module: "chat",
            assigned_to: member.name,
          });
        }
      }
      if (mentions.length > 0) {
        const names = mentions.map((m) => m.name).join(", ");
        toast.success(`Tarefa atribuída a ${names} ✅`);
      }
    }

    await sendMessage(content, attachPath, attachName);
    setInput("");
    setAttachFile(null);
    setMentionQuery(null);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect mention trigger
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex >= 0 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(" ") || query.length <= 30) {
        setMentionQuery(query);
        setMentionIdx(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (member: ProjectMember) => {
    const cursorPos = inputRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex >= 0) {
      const before = input.slice(0, atIndex);
      const after = input.slice(cursorPos);
      setInput(`${before}@${member.name} ${after}`);
    }
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx 20MB)");
        return;
      }
      setAttachFile(file);
    }
  };

  const handleCreateTask = async (msg: ChatMessage) => {
    if (!currentUserId) return;
    setCreatingTask(true);
    const desc = msg.content.length > 120 ? msg.content.slice(0, 120) + "…" : msg.content;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: currentUserId,
      project_id: projectId,
      description: `[Chat] ${desc}`,
      source: "chat",
      source_module: "chat",
    }).select("id").single();

    if (!error && data) {
      await linkTask(msg.id, data.id);
      await togglePending(msg.id, true);
      toast.success("Tarefa criada a partir da mensagem! ✅");
    } else {
      toast.error("Erro ao criar tarefa");
    }
    setCreatingTask(false);
    setActionMenuId(null);
  };

  const handleDownload = async (path: string, name: string) => {
    if (!isOwner) {
      toast.error("Apenas o dono do projeto pode baixar arquivos");
      return;
    }
    const { data } = await supabase.storage.from("project-files").createSignedUrl(path, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = name;
      a.click();
    }
  };

  const loadPlaybackUrl = async (path: string) => {
    if (playbackUrls[path]) return;
    const { data } = await supabase.storage.from("project-files").createSignedUrl(path, 300);
    if (data?.signedUrl) setPlaybackUrls((prev) => ({ ...prev, [path]: data.signedUrl }));
  };

  function relTime(d: string) {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); } catch { return ""; }
  }
  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function isAudioFile(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(ext);
  }

  function getAttachIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return ImageIcon;
    if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(ext)) return Music;
    return FileText;
  }

  // Render message content with highlighted @mentions
  function renderContent(text: string) {
    const parts = text.split(/(@[\w\s]+?)(?=\s@|\s*$|[.,;!?])/gi);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionName = part.slice(1).trim().toLowerCase();
        const isMember = members.some((m) => m.name.toLowerCase() === mentionName);
        if (isMember) {
          return (
            <span key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  }

  if (!currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Faça login para acessar o chat do projeto.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[420px] lg:h-[580px]">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
          <Button variant={filterPending ? "default" : "outline"} size="sm" className="h-6 text-[10px] gap-1" onClick={() => setFilterPending(!filterPending)}>
            <AlertCircle className="h-2.5 w-2.5" />
            {pendingCount} pendência{pendingCount > 1 ? "s" : ""}
            {filterPending && <XIcon className="h-2.5 w-2.5 ml-1" />}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando mensagens…</div>
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filterPending ? "Nenhuma pendência aberta." : "Nenhuma mensagem ainda. Comece a conversa!"}
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            const showActions = actionMenuId === msg.id;
            const AttachIcon = msg.attachment_name ? getAttachIcon(msg.attachment_name) : null;
            const audioAttach = msg.attachment_name && msg.attachment_path && isAudioFile(msg.attachment_name);

            if (audioAttach && !playbackUrls[msg.attachment_path]) {
              loadPlaybackUrl(msg.attachment_path);
            }

            return (
              <div key={msg.id} className={cn("group relative", isMe && "flex flex-col items-end")}>
                <div className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                    {initials(msg.display_name)}
                  </div>
                  <div className={cn("max-w-[72%] flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                    {!isMe && <span className="text-[10px] text-muted-foreground px-1">{msg.display_name}</span>}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm leading-snug relative cursor-pointer",
                        isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
                        msg.is_pending && !msg.is_resolved && "ring-1 ring-yellow-500/50",
                        msg.is_resolved && "ring-1 ring-green-500/30 opacity-70",
                      )}
                      onClick={() => setActionMenuId(showActions ? null : msg.id)}
                    >
                      {renderContent(msg.content)}
                      {(msg.is_pending || msg.linked_task_id) && (
                        <div className="flex gap-1 mt-1.5">
                          {msg.is_pending && !msg.is_resolved && (
                            <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                              <AlertCircle className="h-2 w-2" /> Pendente
                            </Badge>
                          )}
                          {msg.is_resolved && (
                            <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-green-500/50 text-green-500 bg-green-500/10">
                              <CheckCircle2 className="h-2 w-2" /> Resolvido
                            </Badge>
                          )}
                          {msg.linked_task_id && (
                            <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-primary/50 text-primary bg-primary/10">
                              <ListChecks className="h-2 w-2" /> Tarefa
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attachment */}
                    {msg.attachment_name && msg.attachment_path && AttachIcon && (
                      audioAttach && playbackUrls[msg.attachment_path] ? (
                        <div className="mt-1 w-full max-w-[260px]">
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <Music className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-[10px] truncate">{msg.attachment_name}</span>
                            {isOwner && (
                              <button onClick={() => handleDownload(msg.attachment_path, msg.attachment_name)} className="ml-auto shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
                                <Download className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          <AudioPlayer src={playbackUrls[msg.attachment_path]} />
                        </div>
                      ) : !audioAttach ? (
                        isOwner ? (
                          <button
                            className="flex items-center gap-1.5 mt-1 rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-[10px] hover:bg-muted transition-colors max-w-[200px]"
                            onClick={() => handleDownload(msg.attachment_path, msg.attachment_name)}
                          >
                            <AttachIcon className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{msg.attachment_name}</span>
                            <Download className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1 rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-[10px] max-w-[200px]">
                            <AttachIcon className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{msg.attachment_name}</span>
                          </div>
                        )
                      ) : null
                    )}

                    <span className="text-[10px] text-muted-foreground/60 px-1">{relTime(msg.created_at)}</span>
                  </div>
                </div>

                {showActions && (
                  <div className={cn("absolute z-10 mt-1 flex gap-1 bg-card border border-border rounded-lg shadow-lg p-1.5", isMe ? "right-9" : "left-9", "top-full")}>
                    {!msg.is_pending && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => { togglePending(msg.id, true); setActionMenuId(null); toast.success("Marcado como pendência"); }}>
                        <AlertCircle className="h-2.5 w-2.5 text-yellow-500" /> Pendência
                      </Button>
                    )}
                    {msg.is_pending && !msg.is_resolved && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => { toggleResolved(msg.id, true); setActionMenuId(null); toast.success("Resolvido! ✅"); }}>
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> Resolver
                      </Button>
                    )}
                    {!msg.linked_task_id && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={creatingTask}
                        onClick={() => handleCreateTask(msg)}>
                        <ListChecks className="h-2.5 w-2.5 text-primary" /> Criar tarefa
                      </Button>
                    )}
                    {msg.is_pending && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => { togglePending(msg.id, false); setActionMenuId(null); }}>
                        <XIcon className="h-2.5 w-2.5" /> Limpar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {attachFile && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-t-lg border border-b-0 border-border">
          <Paperclip className="h-3 w-3 text-primary shrink-0" />
          <span className="text-xs truncate flex-1">{attachFile.name}</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setAttachFile(null)}>
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Mention autocomplete */}
      {mentionQuery !== null && mentionSuggestions.length > 0 && (
        <div className="border border-border bg-card rounded-lg shadow-lg p-1 mb-1 max-h-40 overflow-y-auto">
          {mentionSuggestions.map((m, i) => (
            <button
              key={m.email || m.name}
              className={cn(
                "flex items-center gap-2 w-full text-left rounded px-2 py-1.5 text-sm transition-colors",
                i === mentionIdx ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
            >
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                {initials(m.name)}
              </div>
              <span className="truncate">{m.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{m.role}</span>
            </button>
          ))}
          <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border mt-1 pt-1">
            <AtSign className="h-2.5 w-2.5 inline mr-0.5" />
            Mencione para atribuir tarefa
          </div>
        </div>
      )}

      {/* Hint when members exist */}
      {members.length > 0 && mentionQuery === null && !input && (
        <div className="text-[10px] text-muted-foreground/50 px-1 pb-0.5 flex items-center gap-1">
          <AtSign className="h-2.5 w-2.5" />
          Digite @ para atribuir tarefa a um membro
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-border">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          placeholder="Digite uma mensagem…"
          className="flex-1 h-9 text-sm"
          disabled={sending || uploading}
        />
        <Button size="sm" className="h-9 px-3" onClick={handleSend} disabled={(sending || uploading) || (!input.trim() && !attachFile)}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
