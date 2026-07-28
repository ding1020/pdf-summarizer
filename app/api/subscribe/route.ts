/**
 * POST /api/subscribe
 *
 * Captures email for newsletter / lead capture.
 * Stores in Subscriber table, sends welcome email via Resend.
 * Rate limited: 5 per minute per IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // ── Rate limit ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateResult = await rateLimitAsync(`subscribe:${ip}`, {
    windowMs: 60_000,
    maxRequests: 5,
  });
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try later." },
      { status: 429 },
    );
  }

  // ── Parse body ──
  let body: { email?: string; source?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const source = body.source || "homepage";
  const locale = body.locale || "en";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (email.length > 254) {
    return NextResponse.json(
      { error: "Email address is too long." },
      { status: 400 },
    );
  }

  // ── Upsert subscriber ──
  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      logger.info("Newsletter: duplicate email (already subscribed)", { email });
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "You're already subscribed!",
      });
    }

    await prisma.subscriber.create({
      data: { email, source, locale },
    });

    logger.info("Newsletter: new subscriber", { email, source, locale });

    // ── Send welcome email (non-blocking, fail-safe) ──
    const welcomeHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#2563eb">Welcome to PDFSum! 👋</h1>
        <p>Thanks for subscribing. You'll be the first to know about:</p>
        <ul>
          <li>🚀 New features and AI improvements</li>
          <li>💡 Tips for getting the most out of PDF summaries</li>
          <li>🎁 Exclusive deals and discounts</li>
        </ul>
        <p style="margin:24px 0">
          <a href="https://www.pdfsum.com/${locale}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Try PDFSum Now →
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          You can unsubscribe anytime by clicking the link in any email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:12px">
          PDFSum · support@pdfsum.com
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject: "👋 Welcome to PDFSum — AI-Powered PDF Summaries",
        html: welcomeHtml,
      });
    } catch (emailErr) {
      logger.warn("Newsletter welcome email failed (subscriber still saved)", {
        email,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(
      "Newsletter subscribe failed",
      error instanceof Error ? error : new Error(String(error)),
      { email },
    );
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
