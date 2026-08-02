import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const { id, action, adminReply } = await req.json();
    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
    const data: Record<string, unknown> = {};
    switch (action) {
      case "approve": data.status = "approved"; break;
      case "reject": data.status = "rejected"; break;
      case "feature": data.featured = true; break;
      case "unfeature": data.featured = false; break;
      case "reply": if (adminReply !== undefined) data.adminReply = adminReply; break;
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const review = await prisma.review.update({ where: { id }, data });
    return NextResponse.json({ review });
  } catch { return NextResponse.json({ error: "Failed to update review" }, { status: 500 }); }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [reviews, total, pendingCount] = await Promise.all([
      prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: "pending" } }),
    ]);
    return NextResponse.json({ reviews, total, pendingCount, limit, offset });
  } catch { return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 }); }
}
