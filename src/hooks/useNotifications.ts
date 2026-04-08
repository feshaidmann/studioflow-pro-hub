import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        link: r.link,
        read: r.read,
        type: r.type,
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const addNotification = useCallback(async (data: { title: string; message: string; link?: string; type?: string }) => {
    if (!user) return;
    const { data: row } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: data.title,
      message: data.message,
      link: data.link ?? "",
      type: data.type ?? "general",
    }).select().single();
    if (row) {
      setNotifications((prev) => [{
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        link: row.link,
        read: row.read,
        type: row.type,
        createdAt: row.created_at,
      }, ...prev]);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead, addNotification, refresh: fetchNotifications };
}
