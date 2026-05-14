export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  active: boolean;
  allow_global_listing: boolean;
  created_at: string;
  favorite: boolean;
}

export interface ProfMetrics {
  projectCount: number;
  projectNames: string[];
  avgRating: number | null;
  ratingCount: number;
  lastActivity: string | null;
  platformProjectCount: number;
  avgFee: number | null;
  avgDeliveryDays: number | null;
  publicProfile: { username: string; display_name: string } | null;
  collaborationHistory: Array<{
    projectId: string | null;
    projectName: string;
    completed: boolean;
    role: string;
    fee: number;
    deliveryStatus: string;
    joinedAt: string;
    deliveryDueDate: string | null;
  }>;
}

export type RatingsMap = Record<string, { avg: number; count: number }>;
export type AllocationsMap = Record<string, Array<{ id: string; name: string }>>;

/** Stable color from a name string for avatar background. */
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 88%)`;
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Mask BR phone progressively: (XX) XXXXX-XXXX */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  if (!value) return true;
  const d = value.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 11;
}
