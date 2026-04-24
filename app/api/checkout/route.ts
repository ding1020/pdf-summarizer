import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import lemonSqueezy from "@lemonsqueezy/lemonsqueezy";

const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const VARIANT_ID = process.env.LEMON_SQUEEZY_VARIANT_ID;

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

    if (!VARIANT_ID) {
      return NextResponse.json({
        message: "Payment integration coming soon",
        plan,
      });
    }

    // Configure Lemon Squeezy
    lemonSqueezy.apiKey = API_KEY || "";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

    // Create checkout session
    const checkout = await lemonSqueezy.createCheckout(STORE_ID!, VARIANT_ID!, {
      checkoutData: {
        email: undefined, // Will be collected at checkout
        custom: {
          clerkId: clerkId,
          plan: plan,
        },
      },
      productOptions: {
        redirectUrl: `${baseUrl}/dashboard?success=true`,
        receiptButtonText: "Go to Dashboard",
        receiptThankYouNote: "Thank you for your purchase!",
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
      },
    });

    if (checkout.error) {
      console.error("Lemon Squeezy error:", checkout.error);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkout.data?.data.attributes.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
