import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    pong: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    env: process.env.NODE_ENV,
    now: Date.now(),
  });
}
