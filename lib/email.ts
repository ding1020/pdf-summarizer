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
          PDFSum · Need help? Reply to this email or contact ding10201020@hotmail.com
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
          PDFSum · Need help? ding10201020@hotmail.com
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
          PDFSum · ding10201020@hotmail.com
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
          PDFSum · ding10201020@hotmail.com
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
          PDFSum · ding10201020@hotmail.com
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
