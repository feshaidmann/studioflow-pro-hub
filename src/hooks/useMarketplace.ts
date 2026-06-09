import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  MarketplaceProvider,
  MarketplaceFilters,
  ServiceRequest,
  ServiceProposal,
  InboundRequest,
} from "@/types/marketplace";

export function useMarketplaceProviders(filters: MarketplaceFilters) {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_marketplace_providers" as never, {
      p_specialty: filters.specialty ?? null,
      p_genre: filters.genre ?? null,
      p_state: filters.state ?? null,
      p_search: filters.search ?? null,
      p_limit: 50,
      p_offset: 0,
    } as never);
    if (error) {
      console.error("marketplace fetch error", error);
      toast.error("Erro ao carregar profissionais");
    } else {
      setProviders((data as unknown as MarketplaceProvider[]) ?? []);
    }
    setLoading(false);
  }, [filters.specialty, filters.genre, filters.state, filters.search]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, refetch: fetchProviders };
}

export function useServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("requester_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("service_requests fetch", error);
    setRequests((data as ServiceRequest[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(
    async (payload: Partial<ServiceRequest>) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("service_requests")
        .insert({ ...payload, requester_user_id: user.id, status: "open" } as never)
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
      const { error } = await supabase
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
  const { user } = useAuth();
  const [proposals, setProposals] = useState<ServiceProposal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_proposals")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    if (error) console.error("proposals fetch", error);
    setProposals((data as ServiceProposal[]) ?? []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const acceptProposal = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("accept_service_proposal" as never, {
        p_proposal_id: id,
      } as never);
      if (error) {
        toast.error("Erro ao aceitar proposta");
        return false;
      }
      toast.success("Proposta aceita! O profissional será notificado.");
      await fetchProposals();
      return true;
    },
    [fetchProposals],
  );

  const submitProposal = useCallback(
    async (payload: { price: number; delivery_days: number; message: string; providerName: string; providerAvatar: string }) => {
      if (!user || !requestId) return false;
      const alreadySent = proposals.some((p) => p.responder_user_id === user.id && p.status === "sent");
      if (alreadySent) {
        toast.error("Você já enviou uma proposta para este pedido.");
        return false;
      }
      const { error } = await supabase
        .from("service_proposals")
        .insert({
          request_id: requestId,
          provider_user_id: user.id,
          responder_user_id: user.id,
          price: payload.price,
          delivery_days: payload.delivery_days,
          message: payload.message,
          provider_name: payload.providerName,
          provider_avatar: payload.providerAvatar,
          status: "sent",
        });
      if (error) {
        toast.error("Erro ao enviar proposta: " + error.message);
        return false;
      }
      toast.success("Proposta enviada com sucesso!");
      await fetchProposals();
      return true;
    },
    [user, requestId, proposals, fetchProposals],
  );

  return { proposals, loading, refetch: fetchProposals, acceptProposal, submitProposal };
}

/** Lightweight count of open inbound requests for the badge indicator. */
export function useInboundRequestCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    (supabase as unknown as { from: (t: string) => { select: (c: string, o: { count: "exact"; head: boolean }) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<{ count: number | null }> } } } })
      .from("service_requests_inbound")
      .select("id", { count: "exact", head: true })
      .eq("target_provider_ref", user.id)
      .eq("status", "open")
      .then(({ count: c }) => setCount(c ?? 0));
  }, [user?.id]);

  return count;
}

/** Open marketplace feed: service_requests that are public (no specific target) and still open. */
export function useOpenRequestFeed(enabled: boolean) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<InboundRequest[]>([]);
  const [myProposals, setMyProposals] = useState<ServiceProposal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || !enabled) return;
    setLoading(true);
    const [reqRes, propRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id, project_id, specialty_needed, title, briefing, desired_deadline, budget_hint, reference_url, status, created_at, updated_at, closed_at, target_provider_ref, target_provider_name")
        .is("target_provider_ref", null)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("service_proposals")
        .select("*")
        .eq("responder_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setRequests((reqRes.data as unknown as InboundRequest[]) ?? []);
    setMyProposals((propRes.data as ServiceProposal[]) ?? []);
    setLoading(false);
  }, [user, enabled]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const proposalForRequest = useCallback(
    (requestId: string) => myProposals.find((p) => p.request_id === requestId) ?? null,
    [myProposals],
  );

  return { requests, loading, refetch: fetchAll, proposalForRequest };
}

/** Hook para providers verem pedidos direcionados a eles. */
export function useInboundRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<InboundRequest[]>([]);
  const [myProposals, setMyProposals] = useState<ServiceProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setRequests([]); setMyProposals([]); setLoading(false); return; }
    setLoading(true);
    const [reqRes, propRes] = await Promise.all([
      supabase
        .from("service_requests_inbound")
        .select("*")
        .eq("target_provider_ref", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("service_proposals")
        .select("*")
        .eq("responder_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setRequests((reqRes.data as unknown as InboundRequest[]) ?? []);
    setMyProposals((propRes.data as ServiceProposal[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const proposalForRequest = useCallback(
    (requestId: string) => myProposals.find((p) => p.request_id === requestId) ?? null,
    [myProposals],
  );

  const withdrawProposal = useCallback(
    async (proposalId: string) => {
      if (!user) return false;
      const { error } = await supabase
        .from("service_proposals")
        .update({ status: "withdrawn" })
        .eq("id", proposalId)
        .eq("responder_user_id", user.id)
        .in("status", ["sent"]);
      if (error) {
        toast.error("Erro ao retirar proposta");
        return false;
      }
      toast.success("Proposta retirada.");
      await fetchAll();
      return true;
    },
    [user, fetchAll],
  );

  return { requests, myProposals, loading, refetch: fetchAll, proposalForRequest, withdrawProposal };
}
