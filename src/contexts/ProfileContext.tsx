import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserType = "artist";
export type TrackViewMode = "basic" | "advanced";
export type UserPlan = "free" | "pro";

export interface Profile {
  id: string;
  display_name: string;
  username: string;
  bio: string;
  user_type: UserType;
  track_view_mode: TrackViewMode;
  plan: UserPlan;
  origin: string;
  whatsapp: string;
  city: string;
  specialties: string[];
  accept_invites: boolean;
  projects_completed: number;
  public_email: string;
  allow_global_listing: boolean;
  onboarding_completed: boolean;
  current_moment: string;
  main_pain: string;
  onboarding_version: number;
  last_onboarding_project_id?: string | null;
  primary_genre?: string | null;
  state?: string | null;
  career_start_year?: number | null;
  created_at?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  userType: UserType;
  displayName: string;
  trackViewMode: TrackViewMode;
  isSimpleMode: boolean;
  plan: UserPlan;
  isPro: boolean;
  loading: boolean;
  needsProfileSetup: boolean;
  updateProfile: (updates: Partial<Omit<Profile, "id" | "created_at">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);



export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, bio, user_type, track_view_mode, plan, origin, whatsapp, city, specialties, accept_invites, projects_completed, public_email, allow_global_listing, onboarding_completed, current_moment, main_pain, onboarding_version, last_onboarding_project_id, primary_genre, state, career_start_year, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      const p = data as unknown as Profile;
      setProfile(p);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateProfile = async (updates: Partial<Omit<Profile, "id" | "created_at">>) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates });
    
    // Optimistic update
    setProfile((prev) => prev ? { ...prev, ...updates } : null);
    await fetchProfile();
  };

  const userType: UserType = profile?.user_type ?? "artist";
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "";
  const trackViewMode: TrackViewMode = profile?.track_view_mode ?? "basic";
  const isSimpleMode = trackViewMode === "basic";
  const plan: UserPlan = (profile?.plan as UserPlan) ?? "pro";
  // MVP validation phase: all users have Pro access
  const isPro = true;

  // Use server-side flag so onboarding only shows on first registration, not on new devices
  // Profile null (trigger failed) OR onboarding not completed → needs setup
  // Skip onboarding for users who arrived via invite (origin = 'invite')
  const needsProfileSetup =
    !loading &&
    !!user &&
    (profile === null || !profile.onboarding_completed);

  return (
    <ProfileContext.Provider
      value={{ profile, userType, displayName, trackViewMode, isSimpleMode, plan, isPro, loading, needsProfileSetup, updateProfile, refreshProfile: fetchProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

