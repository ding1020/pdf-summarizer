/**
 * Chat RAG — Retrieval-Augmented Generation for "Chat with PDF"
 *
 * Pipeline:
 *   1. Get or create chunks + embeddings for the document (cached)
 *   2. Embed the user's question
 *   3. Retrieve top-K relevant chunks via cosine similarity
 *   4. Build a prompt with retrieved context + chat history
 *   5. Stream the LLM response via SSE (same provider fallback chain as summaries)
 *
 * The LLM system prompt instructs the model to answer ONLY based on the
 * provided context, with a clear fallback when the answer is not found.
 */

import { getProviderFallbackChain, getAIProvider, type AIProvider } from "./ai";
import { logger } from "./logger";
import { getOrCreateChunks, embedQuery, searchChunks } from "./vector-search";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRAGOptions {
  content: string;
  question: string;
  history?: ChatMessage[];
  language?: string;
  preferredProvider?: AIProvider;
  timeoutMs?: number;
}

export interface ChatRAGResult {
  readableStream: ReadableStream<Uint8Array>;
  provider: AIProvider;
  model: string;
  contextUsed: number;
  searchMode: "semantic" | "keyword";
}

// ── System Prompt ──

function getChatSystemPrompt(language: string): string {
  const basePrompt = `You are an AI assistant helping a user understand their PDF document.
Answer questions based ONLY on the provided context from the document.

Rules:
1. If the answer is in the context, provide a clear, helpful response.
2. If the answer is NOT in the context, say: "This information is not found in the document." Don't make things up.
3. Quote relevant passages when helpful.
4. Be concise but thorough. Use Markdown formatting.
5. Respond in the same language the user uses in their question.`;

  // Language-specific instruction
  const langInstructions: Record<string, string> = {
    zh: "用中文回答用户的问题。",
    ja: "ユーザーと同じ言語（日本語）で回答してください。",
    ko: "사용자의 질문과 동일한 언어로 답변하세요.",
    es: "Responde en el mismo idioma que el usuario.",
    fr: "Réponds dans la même langue que l'utilisateur.",
    de: "Antworte in derselben Sprache wie der Benutzer.",
  };

  return langInstructions[language]
    ? `${basePrompt}\n\n${langInstructions[language]}`
    : basePrompt;
}

// ── Main RAG Function ──

export async function chatWithPDFStream(options: ChatRAGOptions): Promise<ChatRAGResult> {
  const {
    content,
    question,
    history = [],
    language = "en",
    preferredProvider = "deepseek",
    timeoutMs = 45_000,
  } = options;

  // 1. Get or create chunks + embeddings
  const { chunks, hasEmbeddings } = await getOrCreateChunks(content);

  if (chunks.length === 0) {
    throw new Error("No text content available for chat. The PDF may be empty or unreadable.");
  }

  // 2. Embed the question
  const queryEmbedding = await embedQuery(question);

  // 3. Search for relevant chunks
  const relevantChunks = searchChunks(chunks, queryEmbedding, question);
  const searchMode: "semantic" | "keyword" = hasEmbeddings && queryEmbedding ? "semantic" : "keyword";

  // 4. Build context text
  const contextText = relevantChunks
    .map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`)
    .join("\n\n");

  logger.info("[chat-rag] RAG context assembled", {
    totalChunks: chunks.length,
    retrievedChunks: relevantChunks.length,
    searchMode,
    topScore: relevantChunks[0]?.score?.toFixed(4),
  });

  // 5. Build LLM messages
  const systemPrompt = getChatSystemPrompt(language);

  // Sanitize question to reduce prompt injection risk
  const sanitizedQuestion = question
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .substring(0, 1000);

  const userMessage = `Based on the following excerpts from the document, answer the user's question.

--- DOCUMENT CONTEXT ---
${contextText}
--- END CONTEXT ---

User question: ${sanitizedQuestion}`;

  // Build message array: system + history (last 4 turns) + current question
  const recentHistory = history.slice(-4); // Keep last 4 messages for context
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // 6. Get provider fallback chain
  const fallbackChain = getProviderFallbackChain(preferredProvider);

  if (fallbackChain.length === 0) {
    throw new Error("No AI provider configured. Set at least DEEPSEEK_API_KEY in environment variables.");
  }

  const errors: string[] = [];

  // 7. Try each provider with streaming
  for (const { provider, model } of fallbackChain) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const client = getAIProvider(provider);

      const stream = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: 0.3, // Lower temperature for factual answers
          max_tokens: 2048,
          stream: true,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

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
                streamController.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunkContent })}\n\n`),
                );
              }
            }
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

      logger.info("[chat-rag] Chat stream started", {
        provider,
        model,
        contextChunks: relevantChunks.length,
        searchMode,
      });

      return {
        readableStream,
        provider,
        model,
        contextUsed: relevantChunks.length,
        searchMode,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${errMsg}`);
      logger.warn(`[chat-rag] Provider ${provider} failed, trying next`, { error: errMsg });
    }
  }

  throw new Error(`All AI providers failed for chat: ${errors.join("; ")}`);
}
