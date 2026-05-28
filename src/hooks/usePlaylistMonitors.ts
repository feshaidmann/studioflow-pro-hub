import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlaylistMonitor {
  id: string;
  user_id: string;
  playlist_id: string;
  playlist_name: string;
  playlist_image_url: string | null;
  playlist_external_url: string | null;
  playlist_owner_name: string | null;
  track_spotify_uri: string | null;
  track_name: string;
  status: "monitoring" | "found" | "bookmarked";
  found_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

const KEY = ["playlist_monitors"] as const;

export function useActiveMonitors() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PlaylistMonitor[]> => {
      const { data, error } = await supabase
        .from("playlist_monitors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlaylistMonitor[];
    },
  });
}

interface CreateMonitorInput {
  playlist_id: string;
  playlist_name: string;
  playlist_image_url?: string | null;
  playlist_external_url?: string | null;
  playlist_owner_name?: string | null;
  track_spotify_uri: string | null;
  track_name: string;
  status?: "monitoring" | "bookmarked";
}

export function useCreateMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMonitorInput): Promise<PlaylistMonitor> => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("not_authenticated");

      const status = input.status ?? (input.track_spotify_uri ? "monitoring" : "bookmarked");

      const { data, error } = await supabase
        .from("playlist_monitors")
        .insert({ ...input, user_id: userData.user.id, status })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("duplicate_monitor");
        throw error;
      }
      return data as PlaylistMonitor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

interface UpdateMonitorUriInput {
  id: string;
  track_spotify_uri: string;
  track_name: string;
}

export function useUpdateMonitorUri() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMonitorUriInput): Promise<PlaylistMonitor> => {
      const { data, error } = await supabase
        .from("playlist_monitors")
        .update({
          track_spotify_uri: input.track_spotify_uri,
          track_name: input.track_name,
          status: "monitoring",
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as PlaylistMonitor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlist_monitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

interface CheckInput {
  monitor_id: string;
  playlist_id: string;
  track_spotify_uri: string;
}

export function useCheckMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckInput) => {
      const { data, error } = await supabase.functions.invoke<{
        found: boolean;
        checked_at: string;
        status: "monitoring" | "found" | "bookmarked";
      }>("check-playlist-tracks", { body: input });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
