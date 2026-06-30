import OpenAI from "openai";
import { prisma } from "./db";
import { logger } from "./logger";
import { FREE_DAILY_LIMIT, TRIAL_TOTAL_LIMIT, MAX_CONTENT_LENGTH } from "./constants";
import { computeCacheKey, getCachedSummary, setCachedSummary } from "./cache";

export type AIProvider = "deepseek" | "groq" | "siliconflow";

interface AIConfig {
  provider: AIProvider;
  model: string;
  baseURL?: string;
}

const providerConfigs: Record<string, AIConfig> = {
  deepseek: {
    provider: "deepseek",
    model: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
  },
  groq: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
  },
  siliconflow: {
    provider: "siliconflow",
    model: "Qwen/Qwen2.5-7B-Instruct",
    baseURL: "https://api.siliconflow.cn/v1",
  },
};

export function getAIProvider(provider: AIProvider) {
  const config = providerConfigs[provider];

  const apiKey =
    config.provider === "deepseek"
      ? process.env.DEEPSEEK_API_KEY
      : config.provider === "groq"
        ? process.env.GROQ_API_KEY
        : process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error(`API key not configured for ${config.provider}`);
  }

  return new OpenAI({
    apiKey,
    baseURL: config.baseURL,
  });
}

/** 集中式模型名解析 — 单一来源，所有路由统一使用 */
export function getModelForProvider(provider: AIProvider | string): string {
  const config = providerConfigs[provider as AIProvider];
  if (config) return config.model;
  // Fallback: recognize legacy provider strings
  return providerConfigs.deepseek.model;
}

export function getAllProviders(): AIConfig[] {
  return Object.values(providerConfigs);
}

export const PROVIDER_NAMES = {
  deepseek: "DeepSeek (中文优化)",
  groq: "Groq (Llama3.3)",
  siliconflow: "SiliconFlow (免费额度)",
};

export const SYSTEM_PROMPTS = {
  zh: `你是一个专业的文档摘要助手。请为用户提供文档的简洁摘要。

要求：
1. 简要概述（2-3句话）
2. 列出3-5个关键要点
3. 使用Markdown格式
4. 简洁但信息丰富
5. 使用与文档相同的语言`,

  en: `You are a professional document summarizer. Create clear and concise summaries for users.

Requirements:
1. Brief overview (2-3 sentences)
2. List 3-5 key points
3. Use Markdown formatting
4. Concise but informative
5. Use the same language as the document`,

  multilingual: `You are a professional document summarizer. Create clear and concise summaries for users worldwide.

Requirements:
1. Brief overview (2-3 sentences)
2. List 3-5 key points
3. Use Markdown formatting
4. Concise but informative
5. Detect the document language and respond in that language`,

  technical: `You are a technical documentation summarizer. Create detailed yet accessible summaries.

Requirements:
1. Executive summary (2-3 sentences)
2. Main topics and their explanations
3. Key technical details highlighted
4. Use Markdown formatting with code blocks if needed
5. Maintain technical accuracy`,

  business: `You are a business document summarizer. Focus on actionable insights.

Requirements:
1. Executive summary (2 sentences)
2. Key findings and implications
3. Actionable recommendations
4. Risk assessment if applicable
5. Use Markdown formatting`,
};

export function getSystemPrompt(
  language: "zh" | "en" | "ja" | "ko" | "es" | "fr" | "de" | "multilingual" | "technical" | "business" = "multilingual",
): string {
  // Map locale-language codes to their dedicated prompts, falling back to multilingual
  if (language in SYSTEM_PROMPTS) {
    return SYSTEM_PROMPTS[language as keyof typeof SYSTEM_PROMPTS];
  }
  return SYSTEM_PROMPTS.multilingual;
}

// ── Token & Cost Tracking ──

/** Estimated cost per 1M tokens (USD) for each provider */
const PROVIDER_COST_PER_1M: Record<AIProvider, { input: number; output: number }> = {
  deepseek: { input: 0.14, output: 0.28 },
  groq: { input: 0.0, output: 0.0 },       // Groq has free tier
  siliconflow: { input: 0.0, output: 0.0 }, // SiliconFlow has free tier
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  provider: AIProvider;
  model: string;
}

/** Rough token estimation: ~4 chars ≈ 1 token for English/Chinese */
export function estimateTokens(text: string): number {
  // Skip whitespace-only input
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Chinese chars ≈ 1.5 tokens each, English ≈ 0.25 tokens per char
  const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = trimmed.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
}

export function calculateCost(
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = PROVIDER_COST_PER_1M[provider];
  if (!rates) return 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export function createUsageRecord(
  provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUSD: calculateCost(provider, inputTokens, outputTokens),
    provider,
    model,
  };
}

// ── Shared Summarize Service (used by all 3 routes: summarize, stream, v1) ──

export interface SummarizeOptions {
  content: string;
  language?: string;
  preferredProvider?: AIProvider;
  maxTokens?: number;
  maxContentLength?: number;
}

export interface SummarizeResult {
  summary: string;
  provider: AIProvider;
  model: string;
  usage: TokenUsage;
}

/** Ordered fallback chain, starting from preferred provider */
export function getProviderFallbackChain(
  preferred?: AIProvider | string,
): { provider: AIProvider; model: string }[] {
  const full: { provider: AIProvider; model: string }[] = [
    { provider: "deepseek", model: getModelForProvider("deepseek") },
    { provider: "groq", model: getModelForProvider("groq") },
    { provider: "siliconflow", model: getModelForProvider("siliconflow") },
  ];
  if (!preferred) return full;
  const idx = full.findIndex((p) => p.provider === preferred);
  if (idx < 0) return full;
  return [...full.slice(idx), ...full.slice(0, idx)];
}

/**
 * Summarize text with automatic provider fallback (deepseek → groq → siliconflow).
 * Shared by web UI, streaming, and developer API routes.
 * Uses content-hash cache to avoid duplicate AI calls.
 */
export async function summarizeWithFallback(
  options: SummarizeOptions,
): Promise<SummarizeResult> {
  const {
    content,
    language = "multilingual",
    preferredProvider = "deepseek",
    maxTokens = 2000,
    maxContentLength = 15000,
  } = options;

  const truncated =
    content.length > maxContentLength
      ? content.substring(0, maxContentLength) + "\n\n[Content truncated...]"
      : content;

  // ── Cache check (content-hash based) ──
  const cacheKey = computeCacheKey({
    content: truncated,
    language,
  });

  try {
    const cached = await getCachedSummary(cacheKey);
    if (cached) {
      logger.info("Summarize cache hit — skipping AI call", {
        keyPrefix: cacheKey.slice(0, 20),
        contentLength: truncated.length,
      });
      // Return cached result with correct provider attribution
      return {
        summary: cached,
        provider: "deepseek" as AIProvider, // cache hits are attributed to primary provider for display
        model: "cache",
        usage: createUsageRecord("deepseek" as AIProvider, "cache", 0, 0),
      };
    }
  } catch (cacheErr) {
    // Cache miss or error — proceed to AI call
    logger.debug("Cache miss, proceeding to AI", {
      error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
    });
  }

  const fallbackChain = getProviderFallbackChain(preferredProvider);
  const errors: string[] = [];
  const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || "30000", 10);

  for (const { provider, model } of fallbackChain) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const client = getAIProvider(provider);
      const inputTokens = estimateTokens(truncated);

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language as keyof typeof SYSTEM_PROMPTS),
          },
          {
            role: "user",
            content: `Please summarize the following document:\n\n${truncated}`,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      },
      { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const outputText = completion.choices[0]?.message?.content || "";
      const usage = createUsageRecord(provider, model, inputTokens, estimateTokens(outputText));

      // ── Cache the result ──
      setCachedSummary(cacheKey, outputText);

      logger.info("Summarize completed", {
        provider,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUSD: usage.costUSD.toFixed(6),
      });

      return { summary: outputText, provider, model, usage };
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${errMsg}`);
      logger.warn(`Provider fallback: ${provider} failed`, { error: errMsg });
    }
  }

  throw new Error(`All AI providers failed: ${errors.join("; ")}`);
}

// ── Streaming Fallback (shared by stream route) ──

export interface StreamResult {
  readableStream: ReadableStream<Uint8Array>;
  provider: AIProvider;
  model: string;
  usage: TokenUsage;
}

/**
 * Summarize with streaming SSE output and automatic provider fallback.
 * Returns a ReadableStream that emits SSE `data:` events.
 * Shared by the /api/summarize/stream route.
 */
export async function summarizeStreamWithFallback(
  options: SummarizeOptions & { signal?: AbortSignal; timeoutMs?: number },
): Promise<StreamResult> {
  const {
    content,
    language = "multilingual",
    preferredProvider = "deepseek",
    maxTokens = 2000,
    maxContentLength = MAX_CONTENT_LENGTH,
    signal: externalSignal,
    timeoutMs = 30_000,
  } = options;

  const truncated =
    content.length > maxContentLength
      ? content.substring(0, maxContentLength) + "\n\n[Content truncated...]"
      : content;

  const fallbackChain = getProviderFallbackChain(preferredProvider);
  const errors: string[] = [];

  for (const { provider, model } of fallbackChain) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Link external signal if provided
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const client = getAIProvider(provider);
      const inputTokens = estimateTokens(truncated);

      const stream = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: "system",
              content: getSystemPrompt(language as keyof typeof SYSTEM_PROMPTS),
            },
            {
              role: "user",
              content: `Please summarize the following document:\n\n${truncated}`,
            },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          stream: true,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      let outputText = "";
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream<Uint8Array>({
        async start(streamController) {
          try {
            for await (const chunk of stream) {
              if (controller.signal.aborted) {
                streamController.close();
                return;
              }
              const chunkContent = chunk.choices[0]?.delta?.content || "";
              if (chunkContent) {
                outputText += chunkContent;
                streamController.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunkContent })}\n\n`),
                );
              }
            }
            // Include usage info in final event
            const outputTokens = estimateTokens(outputText);
            streamController.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  _usage: {
                    provider,
                    model,
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                  },
                })}\n\n`,
              ),
            );
            streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
            streamController.close();
          } catch (err) {
            if (controller.signal.aborted) {
              streamController.close();
            } else {
              streamController.error(err);
            }
          }
        },
      });

      // NOTE: outputTokens= -1 is a sentinel meaning "deferred to SSE stream".
      // Real usage (input + output) is reported inside the stream's _usage SSE event
      // because outputTokens are only known after the stream completes.
      // Consumers should read usage from the final SSE _usage payload, not from here.
      const bestEffortUsage = createUsageRecord(provider, model, inputTokens, -1);

      return { readableStream, provider, model, usage: bestEffortUsage };
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${errMsg}`);
      logger.warn(`Stream provider ${provider} failed, trying next`, { error: errMsg });
    }
  }

  throw new Error(`All AI providers failed for streaming: ${errors.join("; ")}`);
}

// ── Usage Limit (atomic, bypass-proof) ──

/**
 * Check & increment daily usage limit using the atomic `usageCount` field.
 * Unlike the document-counting approach, this CANNOT be bypassed by
 * deleting documents — the counter is monotonically increasing.
 *
 * Auto-resets at midnight UTC.
 */
export async function checkAndIncrementDailyUsage(
  userId: string,
  dailyLimit: number = FREE_DAILY_LIMIT,
): Promise<{ allowed: boolean; count: number }> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Optimistic concurrency control — compatible with Supabase PgBouncer transaction mode.
  // Serializable isolation is NOT supported under PgBouncer's transaction pooling.
  //
  // Instead: read current state, then atomically update with a WHERE guard.
  // If concurrent requests race, only one succeeds and the other gets a clean count.
  // Max 3 retries to resolve contention.
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        usageCount: true,
        usageResetAt: true,
        subscriptionStatus: true,
        trialUsageTotal: true,
      },
    });

    if (!user) return { allowed: false, count: 0 };

    // ── Paid Pro: unlimited ──
    if (user.subscriptionStatus === "pro") return { allowed: true, count: -1 };

    // ── Trial: total 20 summaries across entire trial period ──
    if (user.subscriptionStatus === "pro_trial") {
      const trialCount = user.trialUsageTotal ?? 0;
      if (trialCount >= TRIAL_TOTAL_LIMIT) {
        return { allowed: false, count: trialCount };
      }
      // Atomic increment — optimistic concurrency with guard
      const trialUpdated = await prisma.user.updateMany({
        where: { id: userId, trialUsageTotal: trialCount },
        data: { trialUsageTotal: { increment: 1 } },
      });
      if (trialUpdated.count > 0) {
        return { allowed: true, count: trialCount + 1 };
      }
      // Race lost — retry in the outer loop
      continue;
    }

    const needsReset = user.usageResetAt.getTime() < startOfToday.getTime();

    if (needsReset) {
      // Reset with guard: only reset if usageResetAt is still stale
      const reset = await prisma.user.updateMany({
        where: { id: userId, usageResetAt: user.usageResetAt },
        data: { usageCount: 1, usageResetAt: now },
      });
      if (reset.count > 0) return { allowed: true, count: 1 };
      // Reset failed due to race — retry
      continue;
    }

    if (user.usageCount >= dailyLimit) {
      return { allowed: false, count: user.usageCount };
    }

    // Atomic increment with guard: only succeed if count hasn't changed
    const updated = await prisma.user.updateMany({
      where: { id: userId, usageCount: user.usageCount },
      data: { usageCount: { increment: 1 } },
    });

    if (updated.count > 0) {
      return { allowed: true, count: user.usageCount + 1 };
    }
    // Update failed — another request won the race, retry
  }

  // After 3 retries, do a final read to return current state
  const finalUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { usageCount: true, usageResetAt: true },
  });
  if (!finalUser) return { allowed: false, count: 0 };
  const finalNeedsReset = finalUser.usageResetAt.getTime() < startOfToday.getTime();
  if (finalNeedsReset) return { allowed: true, count: 0 };
  return { allowed: finalUser.usageCount < dailyLimit, count: finalUser.usageCount };
}
