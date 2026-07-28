/**
 * Text Chunker for RAG (Retrieval-Augmented Generation)
 *
 * Splits extracted PDF text into overlapping chunks suitable for embedding.
 * Respects paragraph boundaries where possible to maintain semantic coherence.
 *
 * Strategy:
 *   1. Split by double newlines (paragraphs)
 *   2. Accumulate paragraphs until chunk size reached
 *   3. Carry overlap from previous chunk for context continuity
 *   4. Handle oversized paragraphs by splitting on sentence boundaries
 */

export interface TextChunk {
  text: string;
  index: number;
}

const DEFAULT_CHUNK_SIZE = 1200; // ~300 tokens
const DEFAULT_OVERLAP = 200;
const MAX_CHUNKS = 40; // Safety cap — protects Redis/memory budget

/**
 * Split text into overlapping chunks.
 * Returns at most MAX_CHUNKS chunks to protect resource limits.
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP,
): TextChunk[] {
  const cleanText = text.replace(/\r\n/g, "\n").trim();
  if (!cleanText) return [];

  const paragraphs = cleanText.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph exceeds chunk size, flush current chunk
    if (current.length + trimmed.length + 2 > chunkSize && current.length > 0) {
      chunks.push(current);

      // Keep overlap: take last `overlap` chars from current chunk
      const overlapText = current.slice(-overlap);
      current = overlapText + "\n\n" + trimmed;
    } else if (trimmed.length > chunkSize) {
      // Single paragraph exceeds chunk size — split by sentences
      if (current.length > 0) {
        chunks.push(current);
        current = current.slice(-overlap) + "\n\n";
      }

      const sentences = trimmed.match(/[^.!?。！？]+[.!?。！？]+/g) || [trimmed];
      let sentenceAccum = "";

      for (const sentence of sentences) {
        if (sentenceAccum.length + sentence.length > chunkSize && sentenceAccum.length > 0) {
          chunks.push(sentenceAccum);
          sentenceAccum = sentenceAccum.slice(-overlap) + sentence;
        } else {
          sentenceAccum += sentence;
        }
      }
      if (sentenceAccum.trim()) {
        current = (current ? current + "\n\n" : "") + sentenceAccum;
      }
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }
  }

  // Flush remaining
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Safety cap
  const limited = chunks.slice(0, MAX_CHUNKS);

  return limited.map((text, index) => ({ text, index }));
}
