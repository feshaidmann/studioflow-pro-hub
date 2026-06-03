export interface MarketplaceProvider {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  genres: string[];
  state: string | null;
  city: string | null;
  base_rate_brl: number | null;
  rate_unit: string;
  portfolio_links: { label: string; url: string }[];
  verified_by_jsp: boolean;
  avg_rating: number;
  review_count: number;
}

export interface MarketplaceFilters {
  specialty?: string;
  genre?: string;
  state?: string;
  search?: string;
}

export interface ServiceRequest {
  id: string;
  requester_id: string;
  project_id: string | null;
  specialty: string;
  genre: string | null;
  title: string;
  description: string;
  budget_brl: number | null;
  deadline_date: string | null;
  status:
    | 'open' | 'in_negotiation' | 'accepted' | 'in_progress'
    | 'delivered' | 'approved' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ServiceProposal {
  id: string;
  request_id: string;
  provider_id: string;
  value_brl: number;
  delivery_days: number;
  message: string | null;
  revisions: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface ServiceDelivery {
  id: string;
  proposal_id: string;
  message: string | null;
  revision_number: number;
  status: 'pending_review' | 'approved' | 'revision_requested';
  payment_status: 'pending' | 'confirmed' | 'disputed';
  payment_method: string;
  payment_note: string | null;
  created_at: string;
}

export interface ServiceReview {
  id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
