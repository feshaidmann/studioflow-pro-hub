import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  MarketplaceProvider,
  MarketplaceFilters,
  ServiceRequest,
  ServiceProposal,
} from "@/types/marketplace";

export function useMarketplaceProviders(filters: MarketplaceFilters) {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_marketplace_providers", {
      p_specialty: filters.specialty ?? null,
      p_genre: filters.genre ?? null,
      p_state: filters.state ?? null,
      p_search: filters.search ?? null,
      p_limit: 50,
      p_offset: 0,
    });
    if (error) {
      console.error("marketplace fetch error", error);
      toast.error("Erro ao carregar profissionais");
    } else {
      setProviders((data as MarketplaceProvider[]) ?? []);
    }
    setLoading(false);
  }, [filters.specialty, filters.genre, filters.state, filters.search]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_marketplace_providers", {
        p_specialty: filters.specialty ?? null,
        p_genre: filters.genre ?? null,
        p_state: filters.state ?? null,
        p_search: filters.search ?? null,
        p_limit: 50,
        p_offset: 0,
      });
      if (!active) return;
      if (error) {
        console.error("marketplace fetch error", error);
        toast.error("Erro ao carregar profissionais");
      } else {
        setProviders((data as MarketplaceProvider[]) ?? []);
      }
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [filters.specialty, filters.genre, filters.state, filters.search]);

  return { providers, loading, refetch: fetchProviders };
}

export function useServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("service_requests")
      .select("*")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("service_requests fetch", error);
    setRequests(((data as ServiceRequest[]) ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("service_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) console.error("service_requests fetch", error);
      setRequests(((data as ServiceRequest[]) ?? []));
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [user]);

  const createRequest = useCallback(
    async (payload: Partial<ServiceRequest>) => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("service_requests")
        .insert({ ...payload, requester_id: user.id, status: "open" })
        .select()
        .single();
      if (error) {
        toast.error(
          error.message?.includes("quota_exceeded")
            ? "Você atingiu o limite de 10 pedidos abertos nos últimos 7 dias."
            : "Erro ao criar pedido: " + error.message,
        );
        return null;
      }
      toast.success("Pedido de orçamento publicado.");
      await fetchRequests();
      return data as ServiceRequest;
    },
    [user, fetchRequests],
  );

  const cancelRequest = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("service_requests")
        .update({ status: "cancelled", closed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) toast.error("Erro ao cancelar");
      else {
        toast.success("Pedido cancelado");
        await fetchRequests();
      }
    },
    [fetchRequests],
  );

  return { requests, loading, refetch: fetchRequests, createRequest, cancelRequest };
}

export function useServiceProposals(requestId?: string) {
  const [proposals, setProposals] = useState<ServiceProposal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("service_proposals")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    if (error) console.error("proposals fetch", error);
    setProposals(((data as ServiceProposal[]) ?? []));
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!requestId) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("service_proposals")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) console.error("proposals fetch", error);
      setProposals(((data as ServiceProposal[]) ?? []));
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [requestId]);

  const acceptProposal = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).rpc("accept_service_proposal", {
        p_proposal_id: id,
      });
      if (error) {
        toast.error("Erro ao aceitar proposta");
        return false;
      }
      toast.success("Proposta aceita");
      await fetchProposals();
      return true;
    },
    [fetchProposals],
  );

  return { proposals, loading, refetch: fetchProposals, acceptProposal };
}
