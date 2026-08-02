/**
 * A/B Testing Framework
 */

export interface Experiment {
  id: string; name: string;
  variants: Record<string, number>;
  startedAt: Date;
}

const EXPERIMENTS: Record<string, Experiment> = {
  "pricing_cta_2026_07": {
    id: "pricing_cta_2026_07", name: "Pricing CTA Button Text",
    variants: { "upgrade_now": 50, "get_pro": 50 },
    startedAt: new Date("2026-07-29"),
  },
};

export function getVariant(experimentId: string, userId?: string): string | null {
  const exp = EXPERIMENTS[experimentId];
  if (!exp) return null;
  const variants = Object.entries(exp.variants);
  if (!userId) {
    const rand = Math.random() * 100; let cumulative = 0;
    for (const [name, weight] of variants) { cumulative += weight; if (rand <= cumulative) return name; }
    return variants[variants.length - 1][0];
  }
  const hash = hashString(userId + experimentId);
  const rand = (hash % 100) + 1; let cumulative = 0;
  for (const [name, weight] of variants) { cumulative += weight; if (rand <= cumulative) return name; }
  return variants[variants.length - 1][0];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
  return Math.abs(hash);
}

export function trackExperimentEvent(experimentId: string, variant: string, event: "impression" | "conversion", metadata?: Record<string, unknown>): void {
  console.log("[AB_TEST]", { experimentId, variant, event, metadata, timestamp: new Date().toISOString() });
}
