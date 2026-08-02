/**
 * Business alert thresholds and notification rules
 * Monitors critical business metrics and triggers alerts
 */

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq";
  threshold: number;
  severity: "warning" | "critical";
  cooldownMinutes: number;
}

export const ALERT_RULES: AlertRule[] = [
  {
    id: "error_rate_high",
    name: "API Error Rate High",
    metric: "api.error_rate",
    condition: "gt",
    threshold: 0.05, // 5%
    severity: "critical",
    cooldownMinutes: 15,
  },
  {
    id: "conversion_low",
    name: "Conversion Rate Drop",
    metric: "business.conversion_rate",
    condition: "lt",
    threshold: 0.02, // 2%
    severity: "warning",
    cooldownMinutes: 60,
  },
  {
    id: "churn_high",
    name: "Churn Rate Spike",
    metric: "business.churn_rate",
    condition: "gt",
    threshold: 0.10, // 10%
    severity: "critical",
    cooldownMinutes: 60,
  },
  {
    id: "ai_cost_high",
    name: "AI Cost Over Budget",
    metric: "cost.ai_daily",
    condition: "gt",
    threshold: 50, // $50/day
    severity: "warning",
    cooldownMinutes: 30,
  },
  {
    id: "signup_drop",
    name: "Sign-up Rate Drop",
    metric: "business.signups_daily",
    condition: "lt",
    threshold: 5, // < 5 signups/day
    severity: "warning",
    cooldownMinutes: 120,
  },
  {
    id: "payment_failure",
    name: "Payment Failure Rate High",
    metric: "payment.failure_rate",
    condition: "gt",
    threshold: 0.15, // 15%
    severity: "critical",
    cooldownMinutes: 10,
  },
];

/**
 * Check if an alert should fire
 */
export function checkAlert(rule: AlertRule, value: number): boolean {
  switch (rule.condition) {
    case "gt": return value > rule.threshold;
    case "lt": return value < rule.threshold;
    case "eq": return value === rule.threshold;
    default: return false;
  }
}

/**
 * Format alert message for notifications
 */
export function formatAlertMessage(rule: AlertRule, value: number): string {
  const emoji = rule.severity === "critical" ? "🚨" : "⚠️";
  return `${emoji} ${rule.name}: ${rule.metric} = ${value.toFixed(2)} (threshold: ${rule.threshold})`;
}
