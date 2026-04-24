import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const PRICES = {
  pro: {
    usd: process.env.STRIPE_PRO_PRICE_USD || "",
    eur: process.env.STRIPE_PRO_PRICE_EUR || "",
    jpy: process.env.STRIPE_PRO_PRICE_JPY || "",
    cny: process.env.STRIPE_PRO_PRICE_CNY || "",
    krw: process.env.STRIPE_PRO_PRICE_KRW || "",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { plan } = await req.json();

    if (plan !== "pro") {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Get currency from Accept-Language header or default to USD
    const acceptLanguage = req.headers.get("accept-language") || "";
    let currency = "usd";
    let priceId = PRICES.pro.usd;

    if (acceptLanguage.includes("zh")) {
      currency = "cny";
      priceId = PRICES.pro.cny;
    } else if (acceptLanguage.includes("ja")) {
      currency = "jpy";
      priceId = PRICES.pro.jpy;
    } else if (acceptLanguage.includes("ko")) {
      currency = "krw";
      priceId = PRICES.pro.krw;
    } else if (acceptLanguage.includes("de") || acceptLanguage.includes("fr") || acceptLanguage.includes("es")) {
      currency = "eur";
      priceId = PRICES.pro.eur;
    }

    // If price ID is not configured, return a message
    if (!priceId) {
      return NextResponse.json({
        message: "Payment integration coming soon",
        currency,
        plan,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        clerkId,
        plan,
      },
      subscription_data: {
        metadata: {
          clerkId,
          plan,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
