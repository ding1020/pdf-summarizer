/**
 * DELETE /api/v1/keys/[keyId] — revoke an API key
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;

  const key = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { userId: true, revokedAt: true },
  });

  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (key.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (key.revokedAt) {
    return NextResponse.json({ error: "API key already revoked" }, { status: 400 });
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  logger.info("[API Keys] Revoked", { userId, keyId });

  return NextResponse.json({ success: true });
}
