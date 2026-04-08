import posthog from "posthog-js";

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
