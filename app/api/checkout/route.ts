import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { plan } = await req.json();

    // TODO: Integrate Stripe
    // For now, return a placeholder response
    // After Stripe configuration, implement:
    // 1. Create Stripe customer if not exists
    // 2. Create Checkout Session
    // 3. Return checkout URL

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { 
          error: "Stripe not configured",
          message: "Payment system coming soon",
        },
        { status: 503 }
      );
    }

    // Future Stripe implementation:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
    */

    return NextResponse.json({
      message: "Stripe integration pending",
      plan,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
