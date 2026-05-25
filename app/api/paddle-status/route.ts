import { NextResponse } from "next/server";

export async function GET() {
  const hasSecretKey = !!process.env.PADDLE_SECRET_KEY && 
    !process.env.PADDLE_SECRET_KEY.includes("your_") &&
    !process.env.PADDLE_SECRET_KEY.includes("xxxx");
  
  const hasPriceId = !!process.env.PADDLE_PRICE_ID && 
    !process.env.PADDLE_PRICE_ID.includes("your_") &&
    !process.env.PADDLE_PRICE_ID.includes("xxxx");
  
  const hasWebhookSecret = !!process.env.PADDLE_WEBHOOK_SECRET && 
    !process.env.PADDLE_WEBHOOK_SECRET.includes("your_") &&
    !process.env.PADDLE_WEBHOOK_SECRET.includes("xxxx");

  const configured = hasSecretKey && hasPriceId && hasWebhookSecret;
  
  // Detect environment
  const environment = process.env.PADDLE_ENVIRONMENT || 
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");
  
  const isSandbox = environment === "sandbox";

  return NextResponse.json({
    configured,
    hasSecretKey,
    hasPriceId,
    hasWebhookSecret,
    environment,
    isSandbox,
    message: configured 
      ? `Paddle is configured! (${environment} mode)`
      : "Paddle configuration is incomplete",
    nextSteps: configured ? [] : [
      "1. Go to https://sandbox.paddle.com",
      "2. Get PADDLE_SECRET_KEY from: Dashboard → Developer Tools → Authentication",
      "3. Create a product and get PADDLE_PRICE_ID from: Catalog → Products",
      "4. Create webhook and get PADDLE_WEBHOOK_SECRET from: Notifications → Webhooks",
      "5. Copy your keys to .env.local",
    ],
    urls: {
      sandbox: "https://sandbox.paddle.com",
      production: "https://vendors.paddle.com",
      docs: "https://developer.paddle.com",
    },
  });
}
