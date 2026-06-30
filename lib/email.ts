/**
 * Email Service — Resend integration
 *
 * Sends transactional emails: welcome, payment success, payment failed, cancellation.
 * Gracefully degrades if RESEND_API_KEY is not configured (logs warning, skips send).
 *
 * Environment variables:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *   EMAIL_FROM="PDFSum <noreply@pdfsum.com>"
 */

import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "PDFSum <noreply@pdfsum.com>";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    logger.warn("Resend not configured — skipping email", { to: opts.to });
    return;
  }
  try {
    const result = await resend.emails.send({ from: FROM, ...opts });
    logger.info("Email sent", { to: opts.to, subject: opts.subject, id: result.data?.id });
  } catch (err) {
    logger.error(
      "Email send failed",
      err instanceof Error ? err : new Error(String(err)),
      { to: opts.to, subject: opts.subject },
    );
  }
}

// ── Templates ──

export function paymentSuccessEmail(
  name: string,
  plan: "monthly" | "yearly",
  endDate: string,
): { subject: string; html: string } {
  const planName = plan === "yearly" ? "Pro Yearly" : "Pro Monthly";
  return {
    subject: `🎉 Your ${planName} plan is now active!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#2563eb">Welcome to Pro, ${name}!</h1>
        <p>Your <strong>${planName}</strong> subscription is now active.</p>
        <p><strong>Next renewal:</strong> ${endDate}</p>
        <p>You now have:</p>
        <ul>
          <li>✅ Unlimited PDF summaries</li>
          <li>✅ Advanced AI quality</li>
          <li>✅ Priority support</li>
          <li>✅ Export to Word/PDF</li>
        </ul>
        <p>
          <a href="https://www.pdfsum.com/dashboard" style="color:#2563eb">Go to Dashboard →</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · Need help? Reply to this email or contact ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function paymentFailedEmail(
  name: string,
): { subject: string; html: string } {
  return {
    subject: "⚠️ Payment failed — Update your payment method",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#dc2626">Payment Failed, ${name}</h1>
        <p>Your most recent payment for <strong>PDFSum Pro</strong> was unsuccessful.</p>
        <p>To keep your unlimited access, please update your payment method:</p>
        <p>
          <a href="https://www.pdfsum.com/dashboard/subscription" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Update Payment Method
          </a>
        </p>
        <p style="margin-top:20px;color:#6b7280">
          If you don't update within 7 days, your account will be downgraded to Free.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · Need help? ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function verifyEmailEmail(
  name: string,
  verifyUrl: string,
): { subject: string; html: string } {
  return {
    subject: "Verify your PDFSum account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#2563eb">Verify Your Email</h1>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for PDFSum! Please verify your email address by clicking the button below.</p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Verify Email
          </a>
        </p>
        <p style="color:#6b7280">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function trialWelcomeEmail(
  name: string,
  trialEndDate: string,
): { subject: string; html: string } {
  return {
    subject: "🎉 Welcome to PDFSum — Your 3-Day Pro Trial Starts Now!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#7c3aed">Welcome to Pro Trial, ${name}!</h1>
        <p>Your <strong>3-day Pro trial</strong> is now active. You have full access to all Pro features:</p>
        <ul>
          <li>✅ Unlimited PDF summaries</li>
          <li>✅ Advanced AI quality</li>
          <li>✅ Priority support</li>
          <li>✅ Export to Word/PDF</li>
        </ul>
        <p><strong>Trial ends:</strong> ${trialEndDate}</p>
        <p style="margin:24px 0">
          <a href="https://www.pdfsum.com/dashboard" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">
            Start Summarizing Now →
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          After the trial, you'll be downgraded to the Free plan (5 summaries/day). Upgrade anytime to keep unlimited access.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function adminPaymentFailureAlert(details: {
  userName: string;
  userEmail: string;
  planLabel: string;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: `⚠️ Payment Failed: ${details.userEmail} — ${details.planLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#dc2626">⚠️ Payment Failure Alert</h1>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;width:140px">User</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.userName} (${details.userEmail})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Plan</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.planLabel}</td></tr>
          <tr><td style="padding:8px;font-weight:600">Reason</td><td style="padding:8px">${details.reason}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">
          The user has been marked as "past_due" and notified. If payment is not updated within 7 days, they will be downgraded to Free.
        </p>
        <p>
          <a href="https://www.pdfsum.com/admin" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
            View in Admin Panel →
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum Admin · Auto-generated alert
        </p>
      </div>
    `,
  };
}

export function trialExpiringEmail(
  name: string,
  daysLeft: number,
): { subject: string; html: string } {
  return {
    subject: `⏰ Your PDFSum Pro trial ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#7c3aed">Your Trial is Almost Over, ${name}</h1>
        <p>Your <strong>3-day Pro trial</strong> ends in <strong>${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong>.</p>
        <p>After that, you'll be on the Free plan with 5 summaries per day. Don't lose unlimited access:</p>
        <p style="margin:24px 0">
          <a href="https://www.pdfsum.com/pricing" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Upgrade to Pro Now →
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          Pro Monthly: $7.99 · Pro Yearly: $69 (28% off)
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function winBackEmail(
  name: string,
): { subject: string; html: string } {
  return {
    subject: "We miss you! Come back to PDFSum Pro",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#2563eb">We Miss You, ${name}!</h1>
        <p>It's been a while since you used PDFSum Pro. We've been working hard to make it even better:</p>
        <ul>
          <li>🚀 Faster AI summarization</li>
          <li>🌍 7-language support</li>
          <li>📄 Export to Word & PDF</li>
          <li>🔒 Enterprise-grade security</li>
        </ul>
        <p style="margin:24px 0">
          <a href="https://www.pdfsum.com/pricing" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Reactivate Pro →
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          Your document history is safe and waiting for you.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL} · <a href="https://www.pdfsum.com/dashboard" style="color:#6b7280">Dashboard</a>
        </p>
      </div>
    `,
  };
}

export function passwordResetEmail(
  name: string,
  resetUrl: string,
): { subject: string; html: string } {
  return {
    subject: "Reset your PDFSum password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#2563eb">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your PDFSum password. Click the button below to set a new password:</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

export function subscriptionCanceledEmail(
  name: string,
): { subject: string; html: string } {
  return {
    subject: "Your Pro subscription has been canceled",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#4b5563">Subscription Canceled, ${name}</h1>
        <p>Your <strong>PDFSum Pro</strong> subscription has been canceled.</p>
        <p>You've been downgraded to the Free plan (5 summaries/day). Your document history is preserved.</p>
        <p>
          <a href="https://www.pdfsum.com/pricing" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Resubscribe to Pro
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · ${SUPPORT_EMAIL}
        </p>
      </div>
    `,
  };
}

// ── Admin notification templates ──

export function adminPaymentAlertEmail(details: {
  userName: string;
  userEmail: string;
  plan: string;
  amount: string;
  channel: string;
  txnRef: string;
  paymentId: string;
}): { subject: string; html: string } {
  const planName = details.plan === "pro_yearly" ? "Pro Yearly" : "Pro Monthly";
  const channelName = details.channel === "alipay" ? "Alipay" : "WeChat Pay";
  return {
    subject: `🔔 [Action Required] New ${planName} payment from ${details.userName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#ea580c">New Payment Request</h1>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;width:140px">User</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.userName} (${details.userEmail})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Plan</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${planName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Amount</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.amount}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Channel</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${channelName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Txn Ref</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.txnRef}</td></tr>
          <tr><td style="padding:8px;font-weight:600">Payment ID</td><td style="padding:8px">${details.paymentId}</td></tr>
        </table>
        <p>
          <a href="https://www.pdfsum.com/admin" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Review in Admin Panel →
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum Admin · Auto-generated notification
        </p>
      </div>
    `,
  };
}
