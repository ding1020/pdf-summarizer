import { prisma } from "./db";
import { logger } from "./logger";

export interface SaveUsageParams {
  userId?: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  userType: "guest" | "free" | "trial" | "pro";
  route: "web" | "stream" | "api";
  status?: "success" | "error";
  ip?: string;
}

/** 将 AI 调用用量记录持久化到 UsageLog 表（fire-and-forget） */
export async function saveUsageLog(params: SaveUsageParams): Promise<void> {
  // Skip cache hits (no actual cost) — but still log errors with 0 tokens
  if (params.model === "cache") return;
  if (params.status !== "error" && params.totalTokens <= 0) return;

  try {
    await prisma.usageLog.create({
      data: {
        userId: params.userId ?? null,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        costUSD: params.costUSD,
        userType: params.userType,
        route: params.route,
        status: params.status ?? "success",
        ip: params.ip ?? null,
      },
    });
    logger.debug("Usage log saved", {
      provider: params.provider,
      tokens: params.totalTokens,
      cost: params.costUSD.toFixed(6),
    });
  } catch (err: unknown) {
    logger.warn("Failed to save usage log", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** 获取用户的订阅类型（用于 userType 字段） */
export async function getUserType(userId: string | null): Promise<"guest" | "free" | "trial" | "pro"> {
  if (!userId) return "guest";
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    if (!user) return "guest";
    switch (user.subscriptionStatus) {
      case "pro":
        return "pro";
      case "pro_trial":
        return "trial";
      default:
        return "free";
    }
  } catch {
    return "free";
  }
}
