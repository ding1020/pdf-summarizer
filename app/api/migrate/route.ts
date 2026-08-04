import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'free'`);
    results.push("planTier: added or already exists");
  } catch (err) {
    results.push(`planTier: ERROR - ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usageOverage" INTEGER NOT NULL DEFAULT 0`);
    results.push("usageOverage: added or already exists");
  } catch (err) {
    results.push(`usageOverage: ERROR - ${err instanceof Error ? err.message : String(err)}`);
  }

  logger.info("Migration completed", { results });

  return NextResponse.json({ success: true, results });
}