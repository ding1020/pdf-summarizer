import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple admin check: only the configured admin email can access
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error("[Admin] ADMIN_EMAIL not configured — blocking admin access");
      return NextResponse.json({ error: "Admin access is not configured." }, { status: 403 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user || user.email.trim() !== adminEmail.trim()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await prisma.paymentRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, subscriptionStatus: true },
        },
      },
    });

    return NextResponse.json({ payments: pending });
  } catch (error) {
    logger.error("[Admin] Fetch pending error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
