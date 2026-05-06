import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem("sf_session_id");
    if (!s) {
      s = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("sf_session_id", s);
    }
    return s;
  } catch {
    return "";
  }
}

/**
 * Persiste evento de funil no banco (analytics_events) e replica no PostHog quando configurado.
 * Fire-and-forget: nunca lança erros para o chamador.
 */
export async function trackAppEvent(
  eventName: string,
  props?: Record<string, unknown> & { project_id?: string | null },
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { project_id = null, ...rest } = props ?? {};
    await supabase.from("analytics_events").insert([{
      user_id: userId,
      event_name: eventName,
      project_id: project_id ?? null,
      properties: rest as never,
      session_id: getSessionId(),
    }] as never);
    if (initialized) posthog.capture(eventName, props);
  } catch (err) {
    console.warn("[analytics] trackAppEvent failed", eventName, err);
  }
}


const POSTHOG_KEY = "phc_placeholder_replace_with_your_key";
const POSTHOG_HOST = "https://app.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY || POSTHOG_KEY.includes("placeholder")) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    autocapture: true,
    persistence: "localStorage",
  });
  initialized = true;
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, props);
}

export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, props);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
