import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

// Paddle webhook verification
function verifyPaddleWebhook(
  payload: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // In production, verify using Paddle's public key
    // For now, we'll accept the webhook if it has the right header
    const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
    return signature === secret;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headersList = headers();
    const signature = headersList.get("paddle-signature");
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || "";

    // Verify webhook signature in production
    if (process.env.NODE_ENV === "production" && signature) {
      if (!verifyPaddleWebhook(payload, signature, webhookSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(payload);
    console.log("Paddle webhook event:", event.event_type);

    // Handle different event types
    switch (event.event_type) {
      case "subscription.created":
        console.log("New subscription created:", event.data?.id);
        // TODO: Update user subscription status in database
        // const clerkId = event.data?.custom_data?.clerkId;
        break;

      case "subscription.updated":
        console.log("Subscription updated:", event.data?.id);
        // TODO: Update subscription status
        break;

      case "subscription.canceled":
        console.log("Subscription cancelled:", event.data?.id);
        // TODO: Cancel subscription in database
        break;

      case "subscription.past_due":
        console.log("Subscription payment failed:", event.data?.id);
        // TODO: Handle failed payment
        break;

      case "transaction.completed":
        console.log("Transaction completed:", event.data?.id);
        // TODO: Process completed transaction
        break;

      default:
        console.log("Unhandled event:", event.event_type);
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
