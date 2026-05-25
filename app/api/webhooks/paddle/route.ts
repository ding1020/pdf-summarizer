import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

// Find user by email
async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("paddle-signature") || "";
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || "";

    // Always verify webhook signature (production or test mode)
    if (!webhookSecret) {
      console.error("Paddle webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const isValid = await verifyPaddleWebhook(payload, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid Paddle webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Additional check: if we're in development/test without a real secret, log warning
    if (process.env.NODE_ENV !== "production" && webhookSecret.startsWith("test_")) {
      console.warn("Paddle webhook running in test mode with test secret");
    }

    const event = JSON.parse(payload);
    console.log("Paddle webhook event:", event.event_type, event.data?.id);

    const eventType = event.event_type || event.alert_name;
    const data = event.data || event;
    const customerEmail = data.customer?.email || data.custom_data?.email;

    switch (eventType) {
      case "subscription.created":
      case "subscription.activated": {
        console.log("New subscription created:", data.id);
        
        const planId = data.items?.[0]?.product_id;
        const status = data.status;
        const currentBillingPeriod = data.current_billing_period;
        
        // Calculate subscription end date
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (customerEmail) {
          const user = await findUserByEmail(customerEmail);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: status === "active" ? "pro" : "free",
                paddleSubscriptionId: data.id,
                paddlePlanId: planId,
                billingCycle: data.billing_cycle,
                subscriptionEndDate,
              },
            });
            console.log("User subscription updated:", user.id);
          }
        }
        break;
      }

      case "subscription.updated": {
        console.log("Subscription updated:", data.id);
        
        const status = data.status;
        const currentBillingPeriod = data.current_billing_period;
        
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (customerEmail) {
          const user = await findUserByEmail(customerEmail);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: status === "active" ? "pro" : "free",
                billingCycle: data.billing_cycle,
                subscriptionEndDate,
              },
            });
          }
        }
        break;
      }

      case "subscription.canceled":
      case "subscription.past_due":
      case "subscription.paused": {
        console.log("Subscription cancelled/paused:", data.id);
        
        if (customerEmail) {
          const user = await findUserByEmail(customerEmail);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "free",
              },
            });
          }
        }
        break;
      }

      case "subscription.resumed": {
        console.log("Subscription resumed:", data.id);
        
        const currentBillingPeriod = data.current_billing_period;
        let subscriptionEndDate: Date | null = null;
        if (currentBillingPeriod?.ends_at) {
          subscriptionEndDate = new Date(currentBillingPeriod.ends_at);
        }
        
        if (customerEmail) {
          const user = await findUserByEmail(customerEmail);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "pro",
                subscriptionEndDate,
              },
            });
          }
        }
        break;
      }

      case "transaction.completed":
      case "transaction.paid": {
        console.log("Transaction completed:", data.id);
        break;
      }

      case "transaction.failed":
      case "transaction.past_due": {
        console.log("Transaction failed:", data.id);
        break;
      }

      default:
        console.log("Unhandled Paddle event:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
