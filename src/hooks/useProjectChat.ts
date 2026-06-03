import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  is_pending: boolean;
  is_resolved: boolean;
  linked_task_id: string | null;
  attachment_path: string;
  attachment_name: string;
}

export function useProjectChat(projectId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_messages")
      .select("id, project_id, user_id, content, created_at, is_pending, is_resolved, linked_task_id, attachment_path, attachment_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) { setLoading(false); return; }

    const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      (profiles ?? []).forEach((p) => {
        profileMap[p.id] = { display_name: p.display_name || "Usuário", avatar_url: p.avatar_url ?? null };
      });
    }

    setMessages(
      (data ?? []).map((m) => ({
        ...m,
        display_name: profileMap[m.user_id]?.display_name ?? "Usuário",
        avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
        is_pending: m.is_pending ?? false,
        is_resolved: m.is_resolved ?? false,
        linked_task_id: m.linked_task_id ?? null,
        attachment_path: m.attachment_path ?? "",
        attachment_name: m.attachment_name ?? "",
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_messages", filter: `project_id=eq.${projectId}` },
        async (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? { ...m, is_pending: updated.is_pending, is_resolved: updated.is_resolved, linked_task_id: updated.linked_task_id }
                  : m
              )
            );
            return;
          }
          if (payload.eventType === "INSERT") {
            const raw = payload.new as any;
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", raw.user_id)
              .maybeSingle();
            const msg: ChatMessage = {
              ...raw,
              display_name: profile?.display_name ?? "Usuário",
              avatar_url: profile?.avatar_url ?? null,
              is_pending: raw.is_pending ?? false,
              is_resolved: raw.is_resolved ?? false,
              linked_task_id: raw.linked_task_id ?? null,
              attachment_path: raw.attachment_path ?? "",
              attachment_name: raw.attachment_name ?? "",
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Reconcile any messages that arrived between initial fetch and subscription
          fetchMessages();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("[chat] realtime subscription status:", status);
        }
      });

    channelRef.current = channel;

    // Refetch when tab becomes visible again (socket may have dropped)
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchMessages();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string, attachmentPath = "", attachmentName = "") => {
      if (!user || !content.trim()) return;
      setSending(true);
      await supabase.from("project_messages").insert({
        project_id: projectId,
        user_id: user.id,
        content: content.trim(),
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
      });

      // Notify members
      const { data: project } = await supabase
        .from("projects")
        .select("user_id, name")
        .eq("id", projectId)
        .maybeSingle();

      if (project) {
        const recipientIds = new Set<string>();
        if (project.user_id !== user.id) recipientIds.add(project.user_id);
        const { data: members } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId);
        (members ?? []).forEach((m: any) => {
          if (m.user_id && m.user_id !== user.id) recipientIds.add(m.user_id);
        });
        const senderName = user.email?.split("@")[0] ?? "Alguém";
        for (const uid of recipientIds) {
          supabase.functions.invoke("send-push-notification", {
            body: { user_id: uid, title: `💬 ${project.name}`, body: `${senderName}: ${content.trim().slice(0, 80)}`, url: `/projects/${projectId}` },
          });
        }
      }
      setSending(false);
    },
    [projectId, user]
  );

  const togglePending = useCallback(async (messageId: string, isPending: boolean) => {
    const { error } = await supabase.from("project_messages").update({ is_pending: isPending, is_resolved: false }).eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_pending: isPending, is_resolved: false } : m));
    }
  }, []);

  const toggleResolved = useCallback(async (messageId: string, isResolved: boolean) => {
    const { error } = await supabase.from("project_messages").update({ is_resolved: isResolved }).eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_resolved: isResolved } : m));
    }
  }, []);

  const linkTask = useCallback(async (messageId: string, taskId: string) => {
    const { error } = await supabase.from("project_messages").update({ linked_task_id: taskId }).eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, linked_task_id: taskId } : m));
    }
  }, []);

  return {
    messages, loading, sending, sendMessage, currentUserId: user?.id ?? null,
    togglePending, toggleResolved, linkTask,
  };
}
