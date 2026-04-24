import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PADDLE_PRODUCT_ID = process.env.PADDLE_PRODUCT_ID;
const PADDLE_VENDOR_ID = process.env.PADDLE_VENDOR_ID;

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

    if (!PADDLE_PRODUCT_ID || !PADDLE_VENDOR_ID) {
      return NextResponse.json({
        message: "Payment integration coming soon",
        plan,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

    // Create Paddle checkout URL using their hosted checkout
    const checkoutUrl = `https://checkout.paddle.com/subscription/checkout?product=${PADDLE_PRODUCT_ID}&vendor=${PADDLE_VENDOR_ID}&quantity=1&custom[clerkId]=${clerkId}&custom[plan]=${plan}&success=${encodeURIComponent(`${baseUrl}/dashboard?success=true`)}&step=completed`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
