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
      .select("id, project_id, user_id, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) { setLoading(false); return; }

    // Fetch profile names in batch
    const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
    let profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};

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
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_messages", filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const raw = payload.new as { id: string; project_id: string; user_id: string; content: string; created_at: string };
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", raw.user_id)
            .maybeSingle();
          const msg: ChatMessage = {
            ...raw,
            display_name: profile?.display_name ?? "Usuário",
            avatar_url: profile?.avatar_url ?? null,
          };
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;
      setSending(true);
      await supabase.from("project_messages").insert({
        project_id: projectId,
        user_id: user.id,
        content: content.trim(),
      });

      // Notify all project members (owner + collaborators) except sender
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
            body: {
              user_id: uid,
              title: `💬 ${project.name}`,
              body: `${senderName}: ${content.trim().slice(0, 80)}`,
              url: `/projetos/${projectId}`,
            },
          });
        }
      }

      setSending(false);
    },
    [projectId, user]
  );

  return { messages, loading, sending, sendMessage, currentUserId: user?.id ?? null };
}
