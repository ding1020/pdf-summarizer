/**
 * Analytics event tracking wrapper.
 *
 * Uses Vercel Analytics track() for custom events (free, no API key needed).
 * Also pushes to dataLayer for GA4/GTM if configured.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("pdf_uploaded", { fileSize: 1024, locale: "en" });
 */

type EventProps = Record<string, string | number | boolean | undefined | null>;

/**
 * Track a custom analytics event.
 * Safe to call on both server and client — no-ops on server.
 */
export function trackEvent(name: string, props?: EventProps): void {
  // Client-side only
  if (typeof window === "undefined") return;

  // Vercel Analytics (dynamic import to avoid SSR issues)
  import("@vercel/analytics")
    .then(({ track }) => track(name, props))
    .catch(() => {});

  // GA4 / GTM dataLayer
  const w = window as typeof window & { dataLayer?: unknown[] };
  if (w.dataLayer) {
    w.dataLayer.push({ event: name, ...props });
  }
}

// ── Predefined event helpers ──

export function trackPdfUpload(fileSize: number, locale: string): void {
  trackEvent("pdf_upload_initiated", {
    fileSizeKB: Math.round(fileSize / 1024),
    locale,
  });
}

export function trackSummaryCompleted(
  provider: string,
  model: string,
  locale: string,
  isPro: boolean,
): void {
  trackEvent("summary_completed", { provider, model, locale, isPro });
}

export function trackPricingViewed(locale: string): void {
  trackEvent("pricing_page_viewed", { locale });
}

export function trackCheckoutClicked(planType: string, locale: string): void {
  trackEvent("checkout_clicked", { planType, locale });
}

export function trackNewsletterSignup(source: string, locale: string): void {
  trackEvent("newsletter_signup", { source, locale });
}

export function trackCtaClick(ctaName: string, locale: string): void {
  trackEvent("cta_click", { ctaName, locale });
}

// ── Chat with PDF events ──

export function trackChatQuestionAsked(locale: string, isPro: boolean): void {
  trackEvent("chat_question_asked", { locale, isPro });
}

export function trackChatAnswerCompleted(
  locale: string,
  isPro: boolean,
  provider: string,
  searchMode: string,
): void {
  trackEvent("chat_answer_completed", { locale, isPro, provider, searchMode });
}

export function trackChatPaywallShown(locale: string): void {
  trackEvent("chat_paywall_shown", { locale });
}
