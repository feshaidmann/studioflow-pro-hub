export type ProviderSource = "user" | "contact" | "curated";

export interface MarketplaceProvider {
  provider_ref: string;
  source: ProviderSource;
  name: string;
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
}

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
}
