/**
 * GET /api/v1/keys — list all API keys for the authenticated user
 * POST /api/v1/keys — create a new API key
 * DELETE /api/v1/keys/[hash] — revoke an API key (handled by [hash]/route.ts)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, getClientIdentifier } from "@/lib/rate-limit";
import { randomBytes, createHash } from "crypto";

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** List all API keys for the current user */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const identifier = getClientIdentifier(userId);
  const rateResult = await rateLimitAsync(identifier, { windowMs: 60_000, maxRequests: 30 });
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

/** Create a new API key */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting — prevent key spam
  const identifier = getClientIdentifier(userId);
  const rateResult = await rateLimitAsync(identifier, { windowMs: 300_000, maxRequests: 5 });
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Limit to 5 active API keys per user
  const count = await prisma.apiKey.count({
    where: { userId, revokedAt: null },
  });
  if (count >= 5) {
    return NextResponse.json(
      { error: "Maximum 5 API keys per user. Revoke an existing key first." },
      { status: 429 }
    );
  }

  const rawKey = `pdfsum_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 15);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name: body.name || `API Key ${count + 1}`,
      keyHash,
      keyPrefix,
    },
  });

  logger.info("[API Keys] Created", { userId, keyId: apiKey.id });

  // ⚠️ Return the raw key ONCE — it cannot be recovered later
  return NextResponse.json({
    key: rawKey,
    id: apiKey.id,
    name: apiKey.name,
    prefix: keyPrefix,
    createdAt: apiKey.createdAt,
    warning: "Store this key securely. It will not be shown again.",
  });
}
