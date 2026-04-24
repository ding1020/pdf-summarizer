import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import lemonSqueezy from "@lemonsqueezy/lemonsqueezy";
import crypto from "crypto";

// Verify Lemon Squeezy webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(payload).digest("hex"));
  const expected = Buffer.from(signature);
  return crypto.timingSafeEqual(digest, expected);
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headersList = headers();
    const signature = headersList.get("x-signature");
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

    // Verify webhook signature
    if (webhookSecret && signature) {
      if (!verifySignature(payload, signature, webhookSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(payload);
    console.log("Lemon Squeezy webhook event:", event.meta?.event_name);

    // Handle subscription events
    switch (event.meta?.event_name) {
      case "subscription_created":
        console.log("New subscription created:", event.data?.id);
        // TODO: Update user subscription status in database
        break;

      case "subscription_updated":
        console.log("Subscription updated:", event.data?.id);
        // TODO: Update subscription status
        break;

      case "subscription_cancelled":
        console.log("Subscription cancelled:", event.data?.id);
        // TODO: Cancel subscription in database
        break;

      case "subscription_expired":
        console.log("Subscription expired:", event.data?.id);
        // TODO: Update subscription status
        break;

      case "order_created":
        console.log("New order created:", event.data?.id);
        // TODO: Process order
        break;

      default:
        console.log("Unhandled event:", event.meta?.event_name);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
