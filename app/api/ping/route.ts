import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    pong: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    env: process.env.NODE_ENV,
    now: Date.now(),
    ts: new Date().toISOString(),
  });
}
