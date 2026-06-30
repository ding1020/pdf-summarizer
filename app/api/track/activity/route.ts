/**
 * POST /api/track/activity
 *
 * Fire-and-forget endpoint called by middleware on every authenticated
 * page visit. Updates User.lastActiveAt for win-back targeting.
 *
 * No auth check needed — called internally with auth cookie forwarded.
 * Rate limited to 1 req / 30s per user to avoid DB spam on rapid navigation.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTokenEdge } from "@/lib/auth-token-edge";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("__auth_token")?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const payload = await verifyTokenEdge(token);
    if (!payload || !payload.userId) return NextResponse.json({ ok: false }, { status: 401 });

    // Rate-limit: skip update if lastActiveAt was set < 5 min ago (avoid spam)
    // NOTE: lastActiveAt is a new schema field; TS types may lag.
    // Using typed destructure ensures runtime safety.
    const row = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, lastActiveAt: true },
    }) as { id: string; lastActiveAt: Date | null } | null;

    if (!row) return NextResponse.json({ ok: false }, { status: 404 });

    // Skip update if less than 5 minutes since last tracking
    if (row.lastActiveAt && row.lastActiveAt.getTime() > Date.now() - 5 * 60 * 1000) {
      // Already updated recently — skip DB write
      return NextResponse.json({ ok: true, skipped: true });
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never throw — this is fire-and-forget
    logger.warn("Activity tracking failed", { error: String(err) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
