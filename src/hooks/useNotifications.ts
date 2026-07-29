import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  type: string;
  createdAt: string;
}

function rowToNotification(r: NotificationRow): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    message: r.message,
    link: r.link,
    read: r.read,
    type: r.type,
    createdAt: r.created_at,
  };
}

export const notificationsKey = (userId?: string) => ["notifications", userId ?? "anon"] as const;

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = notificationsKey(user?.id);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(rowToNotification);
    },
  });

  // Realtime: keep the cache fresh instead of manual refetching.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: key }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queryClient]);

  const setCache = useCallback((updater: (prev: Notification[]) => Notification[]) => {
    queryClient.setQueryData<Notification[]>(key, (prev) => updater(prev ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (!error) setCache((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, [setCache]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (!error) setCache((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user, setCache]);

  const addNotification = useCallback(async (data: { title: string; message: string; link?: string; type?: string }) => {
    if (!user) return;
    const { data: row } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: data.title,
      message: data.message,
      link: data.link ?? "",
      type: data.type ?? "general",
    }).select().single();
    if (row) setCache((prev) => [rowToNotification(row), ...prev]);
  }, [user, setCache]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading: isLoading,
    unreadCount,
    markRead,
    markAllRead,
    addNotification,
    refresh: refetch,
  };
}
