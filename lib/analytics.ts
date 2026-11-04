export const ANALYTICS_EVENTS = [
  "word_mode_click",
  "context_mode_click",
  "review_started",
  "review_completed",
  "vocabulary_import_success",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

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
