import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AnalysisResult } from "@/lib/audioAnalysis";
import type { Project, MixTrack, Professional, Transaction, ProjectType } from "@/data/mockData";
import { trackAppEvent } from "@/lib/analytics";

/* ── Default tracks created for every new project ── */
const defaultTracks: Omit<MixTrack, "id">[] = [
  { name: "Kick", highPassHz: 30, eqNotes: "", compGrDb: 0, sidechainTrigger: "—", gainDbfs: 0, done: false, trackSource: "", musicianId: "", musicianFee: 0, feePaid: false },
  { name: "Bass", highPassHz: 40, eqNotes: "", compGrDb: 0, sidechainTrigger: "Kick", gainDbfs: 0, done: false, trackSource: "", musicianId: "", musicianFee: 0, feePaid: false },
  { name: "Vocals", highPassHz: 80, eqNotes: "", compGrDb: 0, sidechainTrigger: "—", gainDbfs: 0, done: false, trackSource: "", musicianId: "", musicianFee: 0, feePaid: false },
  { name: "Pads", highPassHz: 200, eqNotes: "", compGrDb: 0, sidechainTrigger: "—", gainDbfs: 0, done: false, trackSource: "", musicianId: "", musicianFee: 0, feePaid: false },
  { name: "Master Bus", highPassHz: 20, eqNotes: "", compGrDb: 0, sidechainTrigger: "—", gainDbfs: 0, done: false, trackSource: "", musicianId: "", musicianFee: 0, feePaid: false },
];

function createDefaultTracks(): MixTrack[] {
  return defaultTracks.map((t, i) => ({ ...t, id: `t${Date.now()}-${i}` }));
}

function trackToDbRow(userId: string, projectId: string, track: MixTrack, position: number) {
  return {
    id: track.id,
    project_id: projectId,
    user_id: userId,
    name: track.name,
    high_pass_hz: track.highPassHz,
    eq_notes: track.eqNotes,
    comp_gr_db: track.compGrDb,
    sidechain_trigger: track.sidechainTrigger,
    gain_dbfs: track.gainDbfs,
    done: track.done,
    track_source: track.trackSource,
    musician_id: track.musicianId,
    musician_fee: track.musicianFee,
    fee_paid: track.feePaid,
    position,
  };
}

export function dbRowToTrack(row: any): MixTrack {
  return {
    id: row.id,
    name: row.name,
    highPassHz: row.high_pass_hz,
    eqNotes: row.eq_notes,
    compGrDb: Number(row.comp_gr_db),
    sidechainTrigger: row.sidechain_trigger,
    gainDbfs: Number(row.gain_dbfs),
    done: row.done,
    trackSource: row.track_source,
    musicianId: row.musician_id,
    musicianFee: Number(row.musician_fee),
    feePaid: row.fee_paid,
  };
}

/* ── Stage → percent mapping ── */
export const STAGE_PERCENT: Record<string, number> = {
  inicio: 10, gravacao: 50, mix: 80, master: 90, upload: 98, lancado: 100, rough: 10,
};

/* ── Context types ── */
export interface MasterResult {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
  analyzedAt: string;
  fileName: string;
}

export interface ProjectFinancials {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  margin: number | null;
}

// Fields that need debouncing (text/numeric inputs)
const DEBOUNCED_FIELDS: (keyof MixTrack)[] = ["name", "eqNotes", "highPassHz", "gainDbfs", "compGrDb", "musicianFee"];

export interface GlobalProfessional {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  bio: string;
}

interface ProjectContextType {
  projects: Project[];
  tracks: Record<string, MixTrack[]>;
  professionals: Record<string, Professional[]>;
  masterResults: Record<string, MasterResult>;
  transactions: Transaction[];
  loading: boolean;

  addProject: (data: { name: string; artist: string; bpm: number; key: string; stage: Project["stage"]; projectType?: ProjectType; trackCount?: number | null; totalContractValue?: number | null; amountPaid?: number | null; estimatedMonths?: number | null; uploadDate?: string; templateTracks?: string[] | null; genre?: string | null; audienceSizeAtStart?: string | null; artistState?: string | null }) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  getMixPercent: (projectId: string) => number;
  getProjectFinancials: (projectId: string) => ProjectFinancials;

  addTrack: (projectId: string) => void;
  updateTrack: (projectId: string, trackId: string, field: keyof MixTrack, value: any) => void;
  removeTrack: (projectId: string, trackId: string) => void;

  addProfessional: (projectId: string, prof: Omit<Professional, "id">) => Promise<void>;
  removeProfessional: (projectId: string, profId: string) => Promise<void>;
  addProfessionalToGlobal: (data: { name: string; specialty: string; email: string; phone: string; bio: string; allowGlobalListing?: boolean }) => Promise<GlobalProfessional | null>;

  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => Promise<boolean>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  saveMasterResult: (projectId: string, result: AnalysisResult, fileName: string) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

/* ── DB-row mappers (exported for testing) ── */
export function dbRowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    artist: row.artist,
    bpm: row.bpm,
    key: row.key,
    mixPercent: row.mix_percent,
    masterDone: row.master_done,
    uploadDate: row.upload_date,
    revenueEstimate: row.revenue_estimate,
    stage: row.stage as Project["stage"],
    lufs: row.lufs,
    streamingReady: row.streaming_ready,
    projectType: row.project_type as ProjectType,
    trackCount: row.track_count,
    totalContractValue: row.total_contract_value,
    amountPaid: row.amount_paid,
    estimatedMonths: row.estimated_months,
    completed: row.completed ?? false,
    notes: row.notes ?? "",
    genre: row.genre ?? null,
    subgenre: row.subgenre ?? null,
    artistState: row.artist_state ?? null,
    audienceSizeAtStart: row.audience_size_at_start ?? null,
    productionStartDate: row.production_start_date ?? null,
    distributor: row.distributor ?? null,
  };
}

export function dbRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    description: row.description,
    amount: row.amount,
    date: row.date,
    category: row.category,
    customCategory: row.custom_category ?? "",
    paid: row.paid ?? false,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

/* ── Pure computation helpers (exported for testing) ── */

export function computeProjectFinancials(
  transactions: Transaction[],
  projectId: string,
): ProjectFinancials {
  const projTx = transactions.filter((t) => t.projectId === projectId && t.paid);
  const totalIncome  = projTx.filter((t) => t.type === "income" ).reduce((s, t) => s + t.amount, 0);
  const totalExpense = projTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : null;
  return { totalIncome, totalExpense, profit, margin };
}

export function computeMixPercent(
  project: Pick<Project, "stage" | "completed"> | undefined,
): number {
  if (!project) return 0;
  if (project.completed) return 100;
  return STAGE_PERCENT[project.stage] ?? 10;
}

/* ── Provider ── */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Record<string, MixTrack[]>>({});
  const [professionals, setProfessionals] = useState<Record<string, Professional[]>>({});
  const [masterResults, setMasterResults] = useState<Record<string, MasterResult>>({});

  // Debounce timers: key = `${projectId}:${trackId}:${field}`
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── Fetch data when user changes ── */
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setTransactions([]);
      setTracks({});
      setProfessionals({});
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      const [projRes, txRes, tracksRes, membersRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("mix_tracks").select("*").order("position", { ascending: true }),
        supabase.from("project_members").select("*").order("created_at", { ascending: true }),
      ]);

      if (projRes.data) {
        const mapped = projRes.data.map(dbRowToProject);
        setProjects(mapped);

        // Group fetched tracks by project_id
        const tracksByProject: Record<string, MixTrack[]> = {};
        if (tracksRes.data) {
          tracksRes.data.forEach((row) => {
            if (!tracksByProject[row.project_id]) tracksByProject[row.project_id] = [];
            tracksByProject[row.project_id].push(dbRowToTrack(row));
          });
        }

        // For projects without any tracks in the DB, create & persist defaults
        const missingProjects = mapped.filter((p) => !tracksByProject[p.id]);
        for (const p of missingProjects) {
          const defaults = createDefaultTracks();
          tracksByProject[p.id] = defaults;
          const rows = defaults.map((t, i) => trackToDbRow(user.id, p.id, t, i));
          await supabase.from("mix_tracks").insert(rows);
        }

        setTracks(tracksByProject);
      }

      // Group fetched project_members by project_id
      if (membersRes.data) {
        const membersByProject: Record<string, Professional[]> = {};
        membersRes.data.forEach((row) => {
          if (!membersByProject[row.project_id]) membersByProject[row.project_id] = [];
          membersByProject[row.project_id].push({
            id: row.id,
            name: row.name,
            role: row.role,
            instrument: row.instrument,
            email: row.email,
            phone: row.phone,
            fee: Number(row.fee),
            notes: row.notes,
            invitationId: row.invitation_id ?? undefined,
          });
        });
        setProfessionals(membersByProject);
      }

      if (txRes.data) setTransactions(txRes.data.map(dbRowToTransaction));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  /* ── Progress derived from stage ── */

  const getMixPercent = useCallback(
    (projectId: string) => computeMixPercent(projects.find((p) => p.id === projectId)),
    [projects],
  );

  /* ── Projects (Supabase) ── */
  const addProject = useCallback(
    async (data: { name: string; artist: string; bpm: number; key: string; stage: Project["stage"]; projectType?: ProjectType; trackCount?: number | null; totalContractValue?: number | null; amountPaid?: number | null; estimatedMonths?: number | null; uploadDate?: string; templateTracks?: string[] | null; genre?: string | null; audienceSizeAtStart?: string | null; artistState?: string | null }): Promise<Project | null> => {
      if (!user) {
        console.error("addProject: user not authenticated");
        return null;
      }
      const { data: row, error } = await supabase.from("projects").insert({
        user_id: user.id,
        name: data.name,
        artist: data.artist,
        bpm: data.bpm,
        key: data.key,
        stage: data.stage,
        project_type: data.projectType ?? "single",
        track_count: data.trackCount ?? null,
        total_contract_value: data.totalContractValue ?? null,
        amount_paid: data.amountPaid ?? null,
        estimated_months: data.estimatedMonths ?? null,
        upload_date: data.uploadDate ?? "",
        genre: data.genre ?? null,
        audience_size_at_start: data.audienceSizeAtStart ?? null,
        artist_state: data.artistState ?? null,
        production_start_date: new Date().toISOString(),
      }).select().single();
      if (error || !row) {
        console.error("addProject DB error:", error);
        return null;
      }
      const newProj = dbRowToProject(row);

      // Use template tracks if provided, otherwise defaults
      let initialTracks: MixTrack[];
      if (data.templateTracks && data.templateTracks.length > 0) {
        initialTracks = data.templateTracks.map((name, i) => ({
          id: `t${Date.now()}-${i}`,
          name,
          highPassHz: 80,
          eqNotes: "",
          compGrDb: 0,
          sidechainTrigger: "—",
          gainDbfs: 0,
          done: false,
          trackSource: "" as const,
          musicianId: "",
          musicianFee: 0,
          feePaid: false,
        }));
      } else {
        initialTracks = createDefaultTracks();
      }
      const trackRows = initialTracks.map((t, i) => trackToDbRow(user.id, newProj.id, t, i));
      await supabase.from("mix_tracks").insert(trackRows);

      setProjects((prev) => [newProj, ...prev]);
      setTracks((prev) => ({ ...prev, [newProj.id]: initialTracks }));
      trackAppEvent("project_created", {
        project_id: newProj.id,
        project_type: newProj.projectType,
        stage: newProj.stage,
        genre: data.genre ?? null,
        track_count: initialTracks.length,
      });
      return newProj;
    },
    [user],
  );

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    const dbData: Record<string, any> = {};
    if (data.name !== undefined) dbData.name = data.name;
    if (data.artist !== undefined) dbData.artist = data.artist;
    if (data.bpm !== undefined) dbData.bpm = data.bpm;
    if (data.key !== undefined) dbData.key = data.key;
    if (data.stage !== undefined) dbData.stage = data.stage;
    if (data.masterDone !== undefined) dbData.master_done = data.masterDone;
    if (data.lufs !== undefined) dbData.lufs = data.lufs;
    if (data.streamingReady !== undefined) dbData.streaming_ready = data.streamingReady;
    if (data.uploadDate !== undefined) dbData.upload_date = data.uploadDate;
    if (data.projectType !== undefined) dbData.project_type = data.projectType;
    if (data.trackCount !== undefined) dbData.track_count = data.trackCount;
    if (data.totalContractValue !== undefined) dbData.total_contract_value = data.totalContractValue;
    if (data.amountPaid !== undefined) dbData.amount_paid = data.amountPaid;
    if (data.estimatedMonths !== undefined) dbData.estimated_months = data.estimatedMonths;
    if (data.completed !== undefined) dbData.completed = data.completed;
    if (data.notes !== undefined) dbData.notes = data.notes;
    if (data.genre !== undefined) dbData.genre = data.genre;
    if (data.subgenre !== undefined) dbData.subgenre = data.subgenre;
    if (data.audienceSizeAtStart !== undefined) dbData.audience_size_at_start = data.audienceSizeAtStart;
    if (data.distributor !== undefined) dbData.distributor = data.distributor;
    if (data.artistState !== undefined) dbData.artist_state = data.artistState;

    await supabase.from("projects").update(dbData).eq("id", id);

    // Push notification on stage change
    const prevProject = projects.find((p) => p.id === id);
    if (data.stage !== undefined && user) {
      if (prevProject && prevProject.stage !== data.stage) {
        const stageLabels: Record<string, string> = {
          rough: "Rascunho", gravacao: "Gravação", mix: "Mix", master: "Master", upload: "Upload", lancado: "Lançado",
        };
        const label = stageLabels[data.stage] ?? data.stage;
        supabase.functions.invoke("send-push-notification", {
          body: { user_id: user.id, title: "📁 Status atualizado", body: `${prevProject.name} avançou para ${label}`, url: `/projects/${id}` },
        });
        trackAppEvent("project_stage_changed", {
          project_id: id,
          from_stage: prevProject.stage,
          to_stage: data.stage,
        });
        if (data.stage === "lancado") {
          trackAppEvent("project_completed", { project_id: id, via: "stage" });
        }
      }
    }
    if (data.completed === true && prevProject && !prevProject.completed) {
      trackAppEvent("project_completed", { project_id: id, via: "flag" });
    }

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, [user, projects]);

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTracks((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setProfessionals((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setMasterResults((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setTransactions((prev) => prev.filter((t) => t.projectId !== id));
  }, []);

  /* ── Tracks (Supabase + local state) ── */
  const addTrack = useCallback((projectId: string) => {
    if (!user) return;
    const newTrack: MixTrack = {
      id: `t${Date.now()}`,
      name: "New Track",
      highPassHz: 80,
      eqNotes: "",
      compGrDb: 0,
      sidechainTrigger: "—",
      gainDbfs: 0,
      done: false,
      trackSource: "",
      musicianId: "",
      musicianFee: 0,
      feePaid: false,
    };
    setTracks((prev) => {
      const existing = prev[projectId] || [];
      const position = existing.length;
      supabase.from("mix_tracks").insert(trackToDbRow(user.id, projectId, newTrack, position))
        .then(({ error }) => { if (error) console.error("addTrack DB error:", error); });
      return { ...prev, [projectId]: [...existing, newTrack] };
    });
  }, [user]);

  const updateTrack = useCallback((projectId: string, trackId: string, field: keyof MixTrack, value: any) => {
    // Update local state immediately
    setTracks((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map((t) => t.id === trackId ? { ...t, [field]: value } : t),
    }));

    // Determine DB column name
    const fieldToColumn: Partial<Record<keyof MixTrack, string>> = {
      name: "name",
      highPassHz: "high_pass_hz",
      eqNotes: "eq_notes",
      compGrDb: "comp_gr_db",
      sidechainTrigger: "sidechain_trigger",
      gainDbfs: "gain_dbfs",
      done: "done",
      trackSource: "track_source",
      musicianId: "musician_id",
      musicianFee: "musician_fee",
      feePaid: "fee_paid",
    };
    const column = fieldToColumn[field];
    if (!column) return;

    const doSave = () => {
      supabase.from("mix_tracks").update({ [column]: value }).eq("id", trackId)
        .then(({ error }) => { if (error) console.error("updateTrack DB error:", error); });
    };

    if (DEBOUNCED_FIELDS.includes(field)) {
      const key = `${projectId}:${trackId}:${field}`;
      clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(doSave, 800);
    } else {
      doSave();
    }
  }, []);

  const removeTrack = useCallback((projectId: string, trackId: string) => {
    supabase.from("mix_tracks").delete().eq("id", trackId)
      .then(({ error }) => { if (error) console.error("removeTrack DB error:", error); });
    setTracks((prev) => ({ ...prev, [projectId]: (prev[projectId] || []).filter((t) => t.id !== trackId) }));
  }, []);

  /* ── Professionals (persisted in project_members) ── */
  const addProfessional = useCallback(async (projectId: string, prof: Omit<Professional, "id">) => {
    if (!user) return;
    const { data: row, error } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: user.id,
      name: prof.name,
      role: prof.role,
      instrument: prof.instrument,
      email: prof.email,
      phone: prof.phone,
      fee: prof.fee,
      notes: prof.notes,
      invitation_id: prof.invitationId ?? null,
      permissions_scope: prof.permissionsScope ?? "leitor",
    }).select("id").single();
    if (error || !row) return;
    const newProf: Professional = { ...prof, id: row.id };
    setProfessionals((prev) => ({ ...prev, [projectId]: [...(prev[projectId] || []), newProf] }));
  }, [user]);

  const removeProfessional = useCallback(async (projectId: string, profId: string) => {
    await supabase.from("project_members").delete().eq("id", profId);
    setProfessionals((prev) => ({ ...prev, [projectId]: (prev[projectId] || []).filter((p) => p.id !== profId) }));
  }, []);

  const addProfessionalToGlobal = useCallback(async (data: { name: string; specialty: string; email: string; phone: string; bio: string; allowGlobalListing?: boolean }): Promise<GlobalProfessional | null> => {
    if (!user) return null;
    const { data: row, error } = await supabase.from("professionals").insert({
      user_id: user.id,
      name: data.name,
      specialty: data.specialty,
      email: data.email,
      phone: data.phone,
      bio: data.bio,
      active: true,
      allow_global_listing: data.allowGlobalListing ?? false,
    }).select("id, name, specialty, email, phone, bio").single();
    if (error || !row) return null;
    return row as GlobalProfessional;
  }, [user]);

  /* ── Master results (local state) ── */
  const saveMasterResult = useCallback(
    (projectId: string, result: AnalysisResult, fileName: string) => {
      const isStreamingReady = result.lufs <= -14 && result.truePeak <= -1 && result.dynamicRange >= 7;
      setMasterResults((prev) => ({
        ...prev,
        [projectId]: { lufs: result.lufs, truePeak: result.truePeak, dynamicRange: result.dynamicRange, analyzedAt: new Date().toISOString(), fileName },
      }));
      updateProject(projectId, { lufs: result.lufs, masterDone: isStreamingReady, streamingReady: isStreamingReady });
    },
    [updateProject],
  );

  /* ── Transactions (Supabase) ── */
  const addTransaction = useCallback(async (tx: Omit<Transaction, "id" | "createdAt">): Promise<boolean> => {
    if (!user) return false;
    const { data: row, error } = await supabase.from("transactions").insert({
      user_id: user.id,
      project_id: tx.projectId || null,
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category: tx.category,
      custom_category: tx.customCategory ?? "",
      paid: tx.paid ?? false,
      notes: tx.notes ?? "",
    }).select().maybeSingle();
    if (error) {
      console.error("addTransaction error:", error);
      return false;
    }
    if (row) setTransactions((prev) => [dbRowToTransaction(row), ...prev]);
    return true;
  }, [user]);

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    const dbData: Record<string, any> = {};
    if (data.description !== undefined) dbData.description = data.description;
    if (data.amount !== undefined) dbData.amount = data.amount;
    if (data.date !== undefined) dbData.date = data.date;
    if (data.category !== undefined) dbData.category = data.category;
    if (data.customCategory !== undefined) dbData.custom_category = data.customCategory;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.projectId !== undefined) dbData.project_id = data.projectId || null;
    if (data.paid !== undefined) dbData.paid = data.paid;
    if (data.notes !== undefined) dbData.notes = data.notes;
    await supabase.from("transactions").update(dbData).eq("id", id);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getProjectFinancials = useCallback(
    (projectId: string): ProjectFinancials => computeProjectFinancials(transactions, projectId),
    [transactions],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects, tracks, professionals, masterResults, transactions, loading,
        addProject, updateProject, deleteProject,
        getMixPercent, getProjectFinancials,
        addTrack, updateTrack, removeTrack,
        addProfessional, removeProfessional, addProfessionalToGlobal,
        addTransaction, updateTransaction, deleteTransaction,
        saveMasterResult,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider");
  return ctx;
}
