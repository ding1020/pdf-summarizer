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
  ip?: string;
}

/** 将 AI 调用用量记录持久化到 UsageLog 表（fire-and-forget） */
export function saveUsageLog(params: SaveUsageParams): void {
  // 跳过 cache hits（无实际消费）
  if (params.model === "cache" || params.totalTokens <= 0) return;

  prisma.usageLog
    .create({
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
        ip: params.ip ?? null,
      },
    })
    .then(() => {
      logger.debug("Usage log saved", {
        provider: params.provider,
        tokens: params.totalTokens,
        cost: params.costUSD.toFixed(6),
      });
    })
    .catch((err: unknown) => {
      logger.warn("Failed to save usage log", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
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
