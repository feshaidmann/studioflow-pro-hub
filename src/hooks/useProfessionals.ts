import { useQuery } from "@tanstack/react-query";
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
  const { data: professionals = [], isLoading: loading } = useQuery({
    queryKey: ["professionals-options"],
    queryFn: async (): Promise<ProfessionalOption[]> => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, specialty, email, phone, bio, allow_global_listing")
        .eq("active", true)
        .order("name");
      if (error) {
        console.error("useProfessionals fetch error:", error);
        return [];
      }
      return (data as ProfessionalOption[]) ?? [];
    },
  });

  return { professionals, loading };

}
