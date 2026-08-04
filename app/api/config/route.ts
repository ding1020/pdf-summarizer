import { NextResponse } from "next/server";
import { isPaymentEnabled } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    paymentEnabled: isPaymentEnabled,
    priceIds: {
      monthly: process.env.NEXT_PUBLIC_CREEM_PRICE_MONTHLY || null,
      yearly: process.env.NEXT_PUBLIC_CREEM_PRICE_YEARLY || null,
      proPlusMonthly: process.env.NEXT_PUBLIC_CREEM_PRICE_PRO_PLUS_MONTHLY || null,
      proPlusYearly: process.env.NEXT_PUBLIC_CREEM_PRICE_PRO_PLUS_YEARLY || null,
    },
  });
}