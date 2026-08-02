import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "approved";
    const featured = searchParams.get("featured");
    const locale = searchParams.get("locale");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const where: Record<string, unknown> = { status };
    if (featured !== null) where.featured = featured === "true";
    if (locale) where.locale = locale;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.review.count({ where }),
    ]);
    return NextResponse.json({ reviews, total, limit, offset });
  } catch { return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 reviews per IP per minute
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimitAsync(`review:${ip}`, { windowMs: 60_000, maxRequests: 5 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = await req.json();
    const { rating, title, content, userName, userEmail, locale } = body;
    if (!rating || rating < 1 || rating > 5 || !content) {
      return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
    }
    const review = await prisma.review.create({
      data: { userName: userName || "Anonymous", userEmail: userEmail || null, rating, title: title || null, content, locale: locale || "en", status: "pending" },
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed to create review" }, { status: 500 }); }
}
