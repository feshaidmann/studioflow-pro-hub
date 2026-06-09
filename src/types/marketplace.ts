export type ProviderSource = "user" | "contact" | "curated";

export interface MarketplaceProvider {
  provider_ref: string;
  source: ProviderSource;
  name: string;
  /** Some DB views surface display_name separately; falls back to name. */
  display_name?: string;
  handle: string | null;
  avatar_url: string;
  bio: string;
  city: string;
  state: string;
  specialties: string[];
  genres: string[];
  projects_completed: number;
  accept_invites: boolean;
  is_user: boolean;
  /** JSP-verified badge (curated providers only). */
  verified_by_jsp?: boolean;
  avg_rating?: number;
  review_count?: number;
  base_rate_brl?: number;
  rate_unit?: string;
  portfolio_links?: Array<{ url: string; label?: string }>;
}

export interface MarketplaceFilters {
  specialty?: string;
  genre?: string;
  state?: string;
  search?: string;
}

export type RequestStatus = "open" | "fulfilled" | "cancelled" | "expired";

export interface ServiceRequest {
  id: string;
  requester_user_id: string;
  project_id: string | null;
  specialty_needed: string;
  title: string;
  briefing: string;
  desired_deadline: string | null;
  budget_hint: string;
  reference_url: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  target_provider_ref: string | null;
  target_provider_name: string | null;
}

/** Subset returned by the service_requests_inbound view — excludes requester_user_id. */
export type InboundRequest = Omit<ServiceRequest, "requester_user_id">;

export type ProposalStatus = "sent" | "accepted" | "rejected" | "withdrawn";

export interface ServiceProposal {
  id: string;
  request_id: string;
  provider_user_id: string | null;
  provider_professional_id: string | null;
  provider_curated_id: string | null;
  responder_user_id: string;
  price: number;
  delivery_days: number;
  message: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  provider_name: string;
  provider_avatar: string;
}
