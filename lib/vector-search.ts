/**
 * Vector Search — Embedding Cache + Cosine Similarity Retrieval
 *
 * Caches document chunks + embeddings in Upstash Redis (if configured)
 * to avoid re-embedding on follow-up questions within the same session.
 * Falls back to in-memory cache when Redis is unavailable.
 *
 * Vector search is performed in JavaScript (brute-force cosine similarity).
 * For typical documents (10-40 chunks), this is sub-millisecond and
 * avoids the complexity of RediSearch index management.
 *
 * Keyword fallback: if embeddings are unavailable (SiliconFlow not configured),
 * falls back to simple keyword matching to retrieve relevant chunks.
 */

import { createHash } from "crypto";
import { logger } from "./logger";
import { getRedis } from "./redis";
import { chunkText, type TextChunk } from "./text-chunker";
import { generateEmbedding, generateEmbeddings } from "./embeddings";

export interface ChunkWithEmbedding extends TextChunk {
  embedding: number[];
}

const CACHE_TTL_SECONDS = 3600; // 1 hour
const TOP_K = 5; // Number of chunks to retrieve

// ── In-memory cache (fallback when Redis unavailable) ──
const memoryEmbedCache = new Map<string, { chunks: ChunkWithEmbedding[]; expiresAt: number }>();
const MAX_MEMORY_ENTRIES = 20;

function memoryGet(key: string): ChunkWithEmbedding[] | null {
  const entry = memoryEmbedCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryEmbedCache.delete(key);
    return null;
  }
  return entry.chunks;
}

function memorySet(key: string, chunks: ChunkWithEmbedding[]): void {
  if (memoryEmbedCache.size >= MAX_MEMORY_ENTRIES) {
    // Evict oldest
    const oldest = Array.from(memoryEmbedCache.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt,
    )[0];
    if (oldest) memoryEmbedCache.delete(oldest[0]);
  }
  memoryEmbedCache.set(key, { chunks, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
}

// ── Public API ──

/**
 * Get or create chunks + embeddings for a document.
 * Cached by content hash to avoid re-embedding on follow-up questions.
 *
 * Returns chunks with embeddings, or chunks without embeddings if
 * the embedding provider is unavailable (keyword fallback mode).
 */
export async function getOrCreateChunks(content: string): Promise<{
  chunks: ChunkWithEmbedding[];
  hasEmbeddings: boolean;
}> {
  const contentHash = createHash("sha256").update(content).digest("hex").slice(0, 32);
  const cacheKey = `chat:chunks:${contentHash}`;

  // 1. Try Redis cache
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ChunkWithEmbedding[];
        if (parsed.length > 0) {
          logger.info("[vector-search] Redis cache hit", { chunks: parsed.length, hasEmbeddings: Boolean(parsed[0]?.embedding) });
          return { chunks: parsed, hasEmbeddings: Boolean(parsed[0]?.embedding) };
        }
      }
    } catch (err) {
      logger.warn("[vector-search] Redis GET failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // 2. Try memory cache
  const memCached = memoryGet(cacheKey);
  if (memCached) {
    return { chunks: memCached, hasEmbeddings: Boolean(memCached[0]?.embedding) };
  }

  // 3. Cache miss — chunk + embed
  logger.info("[vector-search] Cache miss — chunking + embedding", { contentLength: content.length });
  const rawChunks = chunkText(content);

  if (rawChunks.length === 0) {
    return { chunks: [], hasEmbeddings: false };
  }

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(rawChunks.map((c) => c.text));

  const chunks: ChunkWithEmbedding[] = rawChunks.map((chunk, i) => ({
    text: chunk.text,
    index: chunk.index,
    embedding: embeddings[i] || [],
  }));

  const hasEmbeddings = chunks.some((c) => c.embedding.length > 0);

  // 4. Cache the result
  const cacheValue = JSON.stringify(chunks);

  if (redis) {
    redis
      .set(cacheKey, cacheValue, { ex: CACHE_TTL_SECONDS })
      .then(() => logger.info("[vector-search] Redis cache set", { chunks: chunks.length }))
      .catch((err: unknown) =>
        logger.warn("[vector-search] Redis SET failed", { error: err instanceof Error ? err.message : String(err) }),
      );
  }

  memorySet(cacheKey, chunks);

  return { chunks, hasEmbeddings };
}

/**
 * Embed a search query.
 */
export async function embedQuery(query: string): Promise<number[] | null> {
  return generateEmbedding(query);
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Simple keyword matching score as fallback when embeddings are unavailable.
 * Scores chunks by counting query term occurrences (case-insensitive).
 */
function keywordScore(chunkText: string, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;
  const lower = chunkText.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (!term) continue;
    const matches = lower.split(term).length - 1;
    score += matches;
  }
  return score;
}

/**
 * Search chunks for the most relevant to the query.
 * Uses cosine similarity if embeddings are available,
 * otherwise falls back to keyword matching.
 *
 * Returns top-K chunks sorted by relevance.
 */
export function searchChunks(
  chunks: ChunkWithEmbedding[],
  queryEmbedding: number[] | null,
  query: string,
  topK: number = TOP_K,
): { text: string; score: number; index: number }[] {
  if (chunks.length === 0) return [];

  // Semantic search via embeddings
  if (queryEmbedding && chunks[0]?.embedding?.length > 0) {
    return chunks
      .map((c) => ({
        text: c.text,
        index: c.index,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Keyword fallback
  const queryTerms = query
    .toLowerCase()
    .split(/[\s,.;:!?]+/)
    .filter((t) => t.length > 2);

  return chunks
    .map((c) => ({
      text: c.text,
      index: c.index,
      score: keywordScore(c.text, queryTerms),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
