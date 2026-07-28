/**
 * Embedding Generation via SiliconFlow (OpenAI-compatible API)
 *
 * Uses BAAI/bge-m3: a multilingual embedding model (100+ languages, 1024 dims).
 * Free on SiliconFlow's free tier — no additional API key needed beyond
 * the existing SILICONFLOW_API_KEY.
 *
 * Fallback: if SiliconFlow is unavailable, returns null and the caller
 * can fall back to keyword-based chunk selection.
 */

import OpenAI from "openai";
import { logger } from "./logger";

const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_DIM = 1024;
const MAX_BATCH_SIZE = 16; // SiliconFlow batch limit

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (_client) return _client;

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    logger.warn("[embeddings] SILICONFLOW_API_KEY not configured — chat feature will use keyword fallback");
    return null;
  }

  _client = new OpenAI({
    apiKey,
    baseURL: "https://api.siliconflow.cn/v1",
    timeout: 30_000,
  });
  return _client;
}

/**
 * Generate embedding for a single text.
 * Returns a Float64Array (1024 dims) or null on failure.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // bge-m3 max ~8192 tokens
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    logger.error("[embeddings] Single embedding failed", err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batches.
 * Returns array aligned with input order. Null entries on individual failures.
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const client = getClient();
  if (!client) return texts.map(() => null);

  const results: (number[] | null)[] = new Array(texts.length).fill(null);

  // Process in batches
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    // Truncate each text to stay within token limits
    const truncated = batch.map((t) => t.slice(0, 8000));

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncated,
      });

      // Sort by index to ensure alignment
      const sorted = response.data.sort((a, b) => a.index - b.index);
      for (let j = 0; j < sorted.length; j++) {
        results[i + j] = sorted[j].embedding;
      }
    } catch (err) {
      logger.error(`[embeddings] Batch ${i / MAX_BATCH_SIZE} failed`, err instanceof Error ? err : new Error(String(err)));

      // Fallback: try one-by-one for the failed batch
      for (let j = 0; j < batch.length; j++) {
        try {
          const single = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: truncated[j],
          });
          results[i + j] = single.data[0]?.embedding ?? null;
        } catch {
          results[i + j] = null;
        }
      }
    }
  }

  return results;
}

export { EMBEDDING_DIM, EMBEDDING_MODEL };
