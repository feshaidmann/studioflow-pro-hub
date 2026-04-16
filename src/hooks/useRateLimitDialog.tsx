import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface RateLimitInfo {
  limit_type: "daily" | "weekly";
  limit: number;
  used: number;
  resets_at: string;
  message: string;
}

export interface QuotaSnapshot {
  daily_limit: number;
  daily_used: number;
  weekly_limit: number;
  weekly_used: number;
  daily_resets_at: string;
}

interface RateLimitContextValue {
  info: RateLimitInfo | null;
  quota: QuotaSnapshot | null;
  open: (info: RateLimitInfo) => void;
  close: () => void;
  setQuota: (q: QuotaSnapshot) => void;
}

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

export function RateLimitDialogProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<RateLimitInfo | null>(null);
  const [quota, setQuotaState] = useState<QuotaSnapshot | null>(null);

  const open = useCallback((i: RateLimitInfo) => setInfo(i), []);
  const close = useCallback(() => setInfo(null), []);
  const setQuota = useCallback((q: QuotaSnapshot) => setQuotaState(q), []);

  return (
    <RateLimitContext.Provider value={{ info, quota, open, close, setQuota }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimitDialog() {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error("useRateLimitDialog must be used within RateLimitDialogProvider");
  return ctx;
}

/**
 * Try to extract a structured rate-limit payload from a Supabase Functions error.
 * Returns null if the error is NOT a rate_limit response.
 */
export async function extractRateLimitInfo(error: any): Promise<RateLimitInfo | null> {
  try {
    const ctx = error?.context;
    if (!ctx) return null;
    let body: any = null;
    if (typeof ctx.json === "function") {
      body = await ctx.json();
    } else if (typeof ctx.text === "function") {
      const txt = await ctx.text();
      try { body = JSON.parse(txt); } catch { return null; }
    }
    if (body?.error === "rate_limit" && body?.limit_type && body?.resets_at) {
      return body as RateLimitInfo;
    }
    return null;
  } catch {
    return null;
  }
}
