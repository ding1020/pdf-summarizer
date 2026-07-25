/**
 * POST /api/webhooks/creem
 *
 * Handles all Creem webhook events:
 * - subscription.paid    → auto-upgrade user to Pro
 * - subscription.canceled → downgrade to free
 * - subscription.past_due → mark past due
 * - checkout.completed   → handle one-time purchases
 *
 * Signature verification via HMAC-SHA256 of request body
 * using CREEM_WEBHOOK_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync } from "@/lib/rate-limit";
import { verifySignature, EVENT_HANDLERS } from "@/lib/creem-webhook";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("CREEM_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  // ── Rate limiting: 30 req/min per IP ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateResult = await rateLimitAsync(`webhook:${ip}`, {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateResult.success) {
    logger.warn("Webhook rate limit exceeded", { ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify signature
  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature") || "";

  if (!verifySignature(rawBody, webhookSecret, signature)) {
    logger.warn("Invalid webhook signature", { hasSignature: !!signature });
    Sentry.captureMessage("Creem webhook: invalid signature", "warning");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let payload: { eventType?: string; id?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.eventType;
  const eventId = payload.id;

  if (!eventId) {
    logger.warn("Webhook received without event ID", { eventType });
    return NextResponse.json(
      { error: "Missing event ID" },
      { status: 400 },
    );
  }

  logger.info(`📥 Webhook received`, { eventId, eventType });

  // ── Idempotency ──
  try {
    await prisma.processedWebhook.create({
      data: { id: eventId, eventType: eventType || "unknown" },
    });
  } catch (dbErr: unknown) {
    const code = (dbErr as { code?: string })?.code;
    if (code === "P2002") {
      logger.info("Duplicate webhook skipped (idempotent)", {
        eventId,
        eventType,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }
    logger.warn("Failed to claim webhook idempotency slot, proceeding anyway", {
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }

  // Find handler
  const handler = EVENT_HANDLERS[eventType || ""];
  if (!handler) {
    logger.info(`Unhandled event type: ${eventType}`, { eventId });
    return NextResponse.json({ received: true });
  }

  // Process
  try {
    await handler(payload);
  } catch (error) {
    // On failure, delete idempotency record so Creem can retry
    try {
      await prisma.processedWebhook.delete({ where: { id: eventId } });
    } catch (_) {
      // Best effort cleanup
    }
    logger.error(
      `Webhook handler failed for ${eventType}`,
      error instanceof Error ? error : new Error(String(error)),
      { eventId },
    );
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, processed: true });
}
