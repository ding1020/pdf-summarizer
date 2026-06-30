/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 *
 * Events handled:
 *   - checkout.session.completed → Activate Pro subscription
 *   - customer.subscription.updated → Sync renewal / plan change
 *   - customer.subscription.deleted → Downgrade to free
 *   - invoice.payment_failed → Mark as past_due + notify
 *
 * Security: Stripe signature verification via STRIPE_WEBHOOK_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { sendEmail, paymentSuccessEmail, paymentFailedEmail } from "@/lib/email";
import type Stripe from "stripe";

// ── Helpers ──

function parseEndDate(subscription: Stripe.Subscription): Date {
  // current_period_end is in seconds (Unix timestamp)
  return new Date((subscription as any).current_period_end * 1000);
}

function getBillingCycle(subscription: Stripe.Subscription): "monthly" | "yearly" | null {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === "month") return "monthly";
  if (interval === "year") return "yearly";
  return null;
}

async function activateProSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  planType: string,
) {
  const endDate = parseEndDate(subscription);
  const billingCycle = getBillingCycle(subscription);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: "pro",
      subscriptionId: subscription.id,
      billingCycle,
      subscriptionEndDate: endDate,
    },
  });

  // Fetch for email name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  });

  await recordAudit({
    userId,
    action: "subscription_activated",
    resource: "User",
    resourceId: userId,
    details: {
      provider: "stripe",
      subscriptionId: subscription.id,
      planType,
      billingCycle,
      endDate: endDate.toISOString(),
    },
  });

  logger.info("Stripe webhook: Pro activated", { userId, planType, subscriptionId: subscription.id });

  // Send welcome email
  if (user) {
    const name = user.firstName || user.email.split("@")[0] || "there";
    const endDateStr = endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    try {
      const template = paymentSuccessEmail(name, billingCycle || "monthly", endDateStr);
      await sendEmail({ to: user.email, ...template });
    } catch (err) {
      logger.warn("Stripe webhook: Failed to send welcome email", { error: String(err) });
    }
  }
}

// ── Handler ──

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("Stripe webhook: STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.warn("Stripe webhook: Invalid signature", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed → Activate Pro ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planType = session.metadata?.planType || "pro_monthly";

        if (!userId) {
          logger.warn("Stripe webhook: checkout.session.completed without userId");
          break;
        }

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await activateProSubscription(userId, subscription, planType);
        }
        break;
      }

      // ── Subscription updated (renewal / plan change) ──
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) break;

        // Find user by Stripe subscription ID
        const user = await prisma.user.findFirst({
          where: { subscriptionId: sub.id },
          select: { id: true },
        });

        if (!user) break;

        const endDate = parseEndDate(sub);
        const billingCycle = getBillingCycle(sub);

        if (sub.status === "active" || sub.status === "trialing") {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "pro",
              subscriptionEndDate: endDate,
              billingCycle,
            },
          });
          logger.info("Stripe webhook: Subscription renewed", {
            userId: user.id,
            subscriptionId: sub.id,
            endDate: endDate.toISOString(),
          });
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: "past_due" },
          });

          const u = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true, firstName: true },
          });
          if (u) {
            const name = u.firstName || u.email.split("@")[0] || "there";
            try {
              const template = paymentFailedEmail(name);
              await sendEmail({ to: u.email, ...template });
            } catch (err) {
              logger.warn("Stripe webhook: Failed to send payment-failed email", { error: String(err) });
            }
          }

          await recordAudit({
            userId: user.id,
            action: "subscription_past_due",
            resource: "User",
            resourceId: user.id,
            details: { provider: "stripe", subscriptionId: sub.id },
          });

          logger.info("Stripe webhook: Subscription past due", {
            userId: user.id,
            subscriptionId: sub.id,
          });
        }
        break;
      }

      // ── Subscription deleted/canceled → Downgrade ──
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { subscriptionId: sub.id },
          select: { id: true, email: true },
        });

        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: "free",
            subscriptionId: null,
            subscriptionEndDate: null,
            billingCycle: null,
          },
        });

        await recordAudit({
          userId: user.id,
          action: "subscription_canceled",
          resource: "User",
          resourceId: user.id,
          details: { provider: "stripe", subscriptionId: sub.id },
        });

        logger.info("Stripe webhook: Subscription canceled", {
          userId: user.id,
          subscriptionId: sub.id,
        });
        break;
      }

      // ── Invoice payment failed ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | undefined;
        if (!subId) break;

        const user = await prisma.user.findFirst({
          where: { subscriptionId: subId },
          select: { id: true, email: true, firstName: true },
        });

        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "past_due" },
        });

        const name = user.firstName || user.email.split("@")[0] || "there";
        try {
          const template = paymentFailedEmail(name);
          await sendEmail({ to: user.email, ...template });
        } catch (err) {
          logger.warn("Stripe webhook: Failed to send payment-failed email", { error: String(err) });
        }

        logger.info("Stripe webhook: Invoice payment failed", {
          userId: user.id,
          subscriptionId: subId,
        });
        break;
      }

      default:
        // Unhandled event — silently ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(
      "Stripe webhook: Processing error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
