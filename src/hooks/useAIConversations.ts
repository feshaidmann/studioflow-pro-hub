import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: unknown;
  created_at: string;
}

export function useAIConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (data) setConversations(data as AIConversation[]);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (!active) return;
      if (data) setConversations(data as AIConversation[]);
    };
    run();
    return () => { active = false; };
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    let active = true;
    setLoadingMessages(true);
    supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, suggestions, created_at")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setMessages((data ?? []).map((m) => ({ ...m, role: m.role as "user" | "assistant" })));
        setLoadingMessages(false);
      });
    return () => { active = false; };
  }, [activeConversationId]);

  const createConversation = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    const title = firstMessage.length > 60 ? firstMessage.slice(0, 57) + "…" : firstMessage;
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title })
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) return null;
    setConversations((prev) => [data as AIConversation, ...prev]);
    return (data as AIConversation).id;
  }, [user]);

  const saveMessage = useCallback(async (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    suggestions?: unknown,
  ): Promise<void> => {
    if (!user) return;
    await supabase.from("ai_messages").insert([{
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
      suggestions: (suggestions ?? null) as Json,
    }]);
    // Bump updated_at on the conversation
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    // Move conversation to top of list
    setConversations((prev) => {
      const found = prev.find((c) => c.id === conversationId);
      if (!found) return prev;
      const updated = { ...found, updated_at: new Date().toISOString() };
      return [updated, ...prev.filter((c) => c.id !== conversationId)];
    });
  }, [user]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    await supabase
      .from("ai_conversations")
      .update({ title })
      .eq("id", conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
    );
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    loadingMessages,
    createConversation,
    saveMessage,
    renameConversation,
    deleteConversation,
    startNewConversation,
    loadConversations,
  };
}
