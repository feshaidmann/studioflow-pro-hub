import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfessionalOption {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  bio?: string;
  allow_global_listing?: boolean;
  city?: string;
  projects_completed?: number;
}

export function useProfessionals() {
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("professionals")
      .select("id, name, specialty, email, phone, bio, allow_global_listing")
      .eq("active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("useProfessionals fetch error:", error);
        if (data) setProfessionals(data as ProfessionalOption[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { professionals, loading };
}
