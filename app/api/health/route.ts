import { NextResponse } from "next/server";

// Zero-dependency health check — confirms Vercel App is alive
export async function GET() {
  return NextResponse.json({ status: "ok", time: Date.now() });
}
