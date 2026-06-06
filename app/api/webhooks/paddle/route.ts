import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Verify Paddle webhook signature using HMAC-SHA256
async function verifyPaddleWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  try {
    const secret = webhookSecret || process.env.PADDLE_WEBHOOK_SECRET || "";
    if (!secret || !signature) return false;
    
    // Paddle signature format: t=timestamp,v1=signature
    const parts = signature.split(",");
    const timestampPart = parts.find(p => p.startsWith("t="));
    const signaturePart = parts.find(p => p.startsWith("v1="));
    
    if (!timestampPart || !signaturePart) return false;
    
    const timestamp = timestampPart.slice(2);
    const expectedSignature = signaturePart.slice(3);
    
    // Create the signed payload (timestamp.body)
    const signedPayload = `${timestamp}.${payload}`;
    
    // Calculate HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    
    // Convert to hex string
    const signatureArray = new Uint8Array(signatureBuffer);
    const calculatedSignature = Array.from(signatureArray)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Timing-safe comparison
    if (calculatedSignature.length !== expectedSignature.length) return false;
    
    let result = 0;
    for (let i = 0; i < calculatedSignature.length; i++) {
      result |= calculatedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

// Find user by clerkId from custom_data, fallback to email
async function findUserByEvent(event: { custom_data?: { clerkId?: string; dbUserId?: string } | null; customer?: { email?: string } | null }) {
  // Priority 1: Look up by clerkId from checkout custom_data
  const clerkId = event.custom_data?.clerkId;
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) return user;
  }

  // Priority 2: Look up by dbUserId from checkout custom_data
  const dbUserId = event.custom_data?.dbUserId;
  if (dbUserId) {
    const user = await prisma.user.findUnique({ where: { id: dbUserId } });
    if (user) return user;
  }

  // Priority 3: Look up by customer email (Paddle customer email)
  const email = event.customer?.email;
  if (email) {
    return prisma.user.findUnique({ where: { email } });
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("paddle-signature") || "";
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || "";

    // Always verify webhook signature (production or test mode)
    if (!webhookSecret) {
      logger.error("Paddle webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const isValid = await verifyPaddleWebhook(payload, signature, webhookSecret);
    if (!isValid) {
      logger.error("Invalid Paddle webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Additional check: if we're in development/test without a real secret, log warning
    if (process.env.NODE_ENV !== "production" && webhookSecret.startsWith("test_")) {
      logger.warn("Paddle webhook running in test mode with test secret");
    }

    const event = JSON.parse(payload);
    const eventType = event.event_type || event.alert_name;
    const data = event.data || event;
    logger.info("Paddle webhook event", { eventType, eventId: data?.id });

    // Find user by clerkId from custom_data, fallback to email
    const user = await findUserByEvent(data);

    switch (eventType) {
      case "subscription.created":
      case "subscription.activated": {
        logger.info("New subscription created", { subscriptionId: data.id });
        
        const planId = data.items?.[0]?.product_id;
        const status = data.status;
        const currentBillingPeriod = data.current_billing_period;
        
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (user) {
          await prisma.$transaction(async (tx) => {
            const freshUser = await tx.user.findUnique({ where: { id: user!.id } });
            if (!freshUser) {
              logger.warn("User disappeared mid-transaction", { userId: user!.id });
              return;
            }
            await tx.user.update({
              where: { id: freshUser.id },
              data: {
                subscriptionStatus: status === "active" ? "pro" : "free",
                paddleSubscriptionId: data.id,
                paddlePlanId: planId,
                billingCycle: data.billing_cycle,
                subscriptionEndDate,
              },
            });
          });
          logger.info("User subscription updated", { userId: user.id });
        } else {
          logger.warn("No user found for subscription event", { subscriptionId: data.id });
        }
        break;
      }

      case "subscription.updated": {
        logger.info("Subscription updated", { subscriptionId: data.id });
        
        const status = data.status;
        const currentBillingPeriod = data.current_billing_period;
        
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (user) {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: user!.id },
              data: {
                subscriptionStatus: status === "active" ? "pro" : "free",
                billingCycle: data.billing_cycle,
                subscriptionEndDate,
              },
            });
          });
          logger.info("User subscription updated", { userId: user.id });
        } else {
          logger.warn("No user found for subscription update", { subscriptionId: data.id });
        }
        break;
      }

      case "subscription.canceled":
      case "subscription.past_due":
      case "subscription.paused": {
        logger.info("Subscription cancelled/paused", { subscriptionId: data.id, eventType });
        
        if (user) {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: user!.id },
              data: {
                subscriptionStatus: "free",
              },
            });
          });
          logger.info("User subscription set to free", { userId: user.id });
        } else {
          logger.warn("No user found for subscription cancel", { subscriptionId: data.id });
        }
        break;
      }

      case "subscription.resumed": {
        logger.info("Subscription resumed", { subscriptionId: data.id });
        
        const currentBillingPeriod = data.current_billing_period;
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (user) {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: user!.id },
              data: {
                subscriptionStatus: "pro",
                subscriptionEndDate,
              },
            });
          });
          logger.info("User subscription restored to pro", { userId: user.id });
        } else {
          logger.warn("No user found for subscription resume", { subscriptionId: data.id });
        }
        break;
      }

      case "transaction.completed":
      case "transaction.paid": {
        logger.info("Transaction completed", { transactionId: data.id });
        break;
      }

      case "transaction.failed":
      case "transaction.past_due": {
        logger.warn("Transaction failed", { transactionId: data.id, eventType });
        break;
      }

      default:
        logger.info("Unhandled Paddle event", { eventType });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Paddle webhook error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
