export type ProjectType = "single" | "ep" | "album" | "beat" | "trilha_guia" | "feat";

export interface MixTrack {
  id: string;
  name: string;
  highPassHz: number;
  eqNotes: string;
  compGrDb: number;
  sidechainTrigger: string;
  gainDbfs: number;
  done: boolean;
  trackSource: string;
  musicianId: string;
  musicianFee: number;
  feePaid: boolean;
  truePeak?: number;
}

export type PermissionsScope = "admin_convidado" | "leitor";

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  instrument: string;
  fee: number;
  notes: string;
  invitationId?: string;
  permissionsScope?: PermissionsScope;
}

export type TransactionType = "income" | "expense";

// Open string type — categories are now maintained in src/constants/transactionCategories.ts
export type TransactionCategory = string;

// Re-export unified categories for backward compat
export {
  artistIncomeCategories as incomeCategories,
  artistExpenseCategories as expenseCategories,
  artistIncomeCategories,
  artistExpenseCategories,
} from "@/constants/transactionCategories";

export interface Transaction {
  id: string;
  projectId: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: TransactionCategory;
  customCategory?: string;
  paid: boolean;
  notes?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  mixPercent: number;
  masterDone: boolean;
  uploadDate: string;
  revenueEstimate: number;
  stage: string;
  lufs: number;
  streamingReady: boolean | null;
  projectType: ProjectType;
  trackCount: number | null;
  totalContractValue: number | null;
  amountPaid: number | null;
  estimatedMonths: number | null;
  completed: boolean;
  notes: string;
  tracks?: MixTrack[];
  professionals?: Professional[];
}

export const mockProjects: Project[] = [
  { id: "1", name: "Summer Vibes EP", artist: "DJ Nova", bpm: 128, key: "Am", mixPercent: 80, masterDone: false, uploadDate: "2026-03-20", revenueEstimate: 2500, stage: "mix", lufs: -12.3, streamingReady: null, projectType: "ep", trackCount: null, totalContractValue: null, amountPaid: null, estimatedMonths: null, completed: false, notes: "" },
  { id: "2", name: "Night Drive", artist: "The Producers", bpm: 96, key: "Dm", mixPercent: 100, masterDone: true, uploadDate: "2026-02-15", revenueEstimate: 1200, stage: "master", lufs: -14.0, streamingReady: true, projectType: "single", trackCount: null, totalContractValue: null, amountPaid: null, estimatedMonths: null, completed: false, notes: "" },
  { id: "3", name: "Bass Cathedral", artist: "MC Flow", bpm: 150, key: "Cm", mixPercent: 60, masterDone: false, uploadDate: "", revenueEstimate: 1800, stage: "rough", lufs: -10.5, streamingReady: null, projectType: "single", trackCount: null, totalContractValue: null, amountPaid: null, estimatedMonths: null, completed: false, notes: "" },
];

export const mockTransactions: Transaction[] = [
  { id: "tr1", projectId: "1", type: "income", description: "Venda exclusiva do beat", amount: 500, date: "2026-02-10", category: "Serviços Musicais", paid: true, createdAt: "2026-02-10T10:00:00Z" },
  { id: "tr2", projectId: "1", type: "expense", description: "Session de guitarrista", amount: 200, date: "2026-02-08", category: "Músicos e Session", paid: true, createdAt: "2026-02-08T10:00:00Z" },
];
