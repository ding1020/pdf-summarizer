import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const clerkId = await getAuthUserId();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const identifier = getClientIdentifier(clerkId, clientIp);
    const rateLimitResult = await rateLimitAsync(identifier, RATE_LIMITS.free);
    
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          filename: true,
          fileSize: true,
          pageCount: true,
          status: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.document.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json(
      {
        success: true,
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: { ...getRateLimitHeaders(rateLimitResult) } }
    );
  } catch (error) {
    logger.error("Get documents error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
