import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // Demo mode: use demo user
    let clerkId: string | null = null;
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = auth();
      if (userId) clerkId = userId;
    } catch (e) {
      // Demo mode
    }

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const identifier = getClientIdentifier(clerkId || "demo", clientIp);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.free);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...getRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

    // Get user from database (demo mode uses fixed demo user)
    const targetClerkId = clerkId || "demo";
    const user = await prisma.user.findUnique({
      where: { clerkId: targetClerkId },
    });

    // Get all documents for the user
    const documents = user
      ? await prisma.document.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            fileSize: true,
            pageCount: true,
            status: true,
            summary: true,
            createdAt: true,
          },
        })
      : [];

    return NextResponse.json(
      { success: true, documents, demoMode: !clerkId },
      { headers: { ...getRateLimitHeaders(rateLimitResult) } }
    );
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { success: true, documents: [], demoMode: true },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
