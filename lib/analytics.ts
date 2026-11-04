export const ANALYTICS_EVENTS = [
  "word_mode_click",
  "context_mode_click",
  "review_started",
  "review_completed",
  "vocabulary_import_success",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export const ANALYTICS_OPT_OUT_KEY = "umami.disabled";

declare global {
  interface Window {
    umami?: {
      track: (event: AnalyticsEvent) => void;
    };
  }
}

export function trackEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(event);
  } catch {
    // Analytics must never interrupt importing, reviewing, or local persistence.
  }
}

export function readAnalyticsOptOut() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAnalyticsOptOut(disabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (disabled) window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
  } catch {
    // Local privacy preferences must not interrupt the app either.
  }
}
