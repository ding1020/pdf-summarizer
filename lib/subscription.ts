/**
 * Subscription status helpers
 *
 * Centralized logic for checking Pro/Trial access across the app.
 * Using this helper instead of inline string comparisons ensures
 * all features (free trial, pro) work consistently everywhere.
 */

export const PRO_STATUSES = ["pro", "pro_trial"] as const;

export type ProStatus = typeof PRO_STATUSES[number];

/** Returns true if the user has active Pro access (paid OR trial) */
export function isProStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return PRO_STATUSES.includes(status as ProStatus);
}

/** Returns human-readable label for display */
export function subscriptionLabel(status: string | null | undefined): string {
  switch (status) {
    case "pro":
      return "Pro";
    case "pro_trial":
      return "Pro Trial";
    case "past_due":
      return "Past Due";
    case "canceled":
      return "Canceled";
    default:
      return "Free";
  }
}

/** Returns a badge variant name for UI */
export function subscriptionBadgeVariant(status: string | null | undefined): string {
  switch (status) {
    case "pro":
      return "pro";
    case "pro_trial":
      return "trial";
    case "past_due":
      return "warning";
    case "canceled":
      return "danger";
    default:
      return "free";
  }
}

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 3;
