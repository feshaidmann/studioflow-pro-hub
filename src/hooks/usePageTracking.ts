import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "sf_session_id";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function usePageTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const enteredAt = useRef<number>(Date.now());
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    const sessionId = getSessionId();

    // Flush previous page duration
    if (prevPath.current && prevPath.current !== location.pathname) {
      const durationSec = Math.round((now - enteredAt.current) / 1000);
      if (durationSec > 0 && durationSec < 3600) {
        supabase
          .from("page_views" as any)
          .insert({
            user_id: user.id,
            page_path: prevPath.current,
            session_id: sessionId,
            duration_seconds: durationSec,
          } as any)
          .then(() => {});
      }
    }

    prevPath.current = location.pathname;
    enteredAt.current = now;

    // On unmount / tab close, flush current page
    const handleUnload = () => {
      const dur = Math.round((Date.now() - enteredAt.current) / 1000);
      if (dur > 0 && dur < 3600 && prevPath.current) {
        const body = JSON.stringify({
          user_id: user.id,
          page_path: prevPath.current,
          session_id: sessionId,
          duration_seconds: dur,
        });
        // Best-effort beacon - no need to handle response
        try {
          navigator.sendBeacon && navigator.sendBeacon(
            `${(import.meta as any).env.VITE_SUPABASE_URL}/rest/v1/page_views`,
            new Blob([body], { type: "application/json" })
          );
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [location.pathname, user]);
}
