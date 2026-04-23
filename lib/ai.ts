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
  
  const apiKey = config.provider === "deepseek" 
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

export function getSystemPrompt(language: "zh" | "en" | "multilingual" | "technical" | "business" = "multilingual") {
  return SYSTEM_PROMPTS[language];
}
