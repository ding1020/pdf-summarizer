import OpenAI from "openai";

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
  groq: "Groq (Llama3.3, 免费)",
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
  // Chinese chars ≈ 1.5 tokens each, English ≈ 0.25 tokens per char
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
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
