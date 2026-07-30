import type { TextChunk } from '@/domain/types';

export interface BM25Match {
  chunk: TextChunk;
  score: number;
}

const K1 = 1.5;
const B = 0.75;
/* A chunk whose heading matches a query term ranks higher regardless of body-text overlap,
   per ADR-0006's structural-boosting plan. */
const HEADING_MATCH_BOOST = 1.5;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/*
 * Client-side BM25 over document chunks, per ADR-0006: no embeddings, no API call, runs in
 * milliseconds. Used for tier-2 retrieval when a document is too large to send whole.
 */
export function bm25Rank(chunks: TextChunk[], query: string, topK = 5): BM25Match[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0 || chunks.length === 0) return [];

  const docs = chunks.map((chunk) => tokenize(chunk.text));
  const docLengths = docs.map((doc) => doc.length);
  const avgLength = docLengths.reduce((sum, len) => sum + len, 0) / docs.length;

  const documentCount = docs.length;
  const idf = new Map<string, number>();
  for (const term of queryTerms) {
    const matchingDocs = docs.filter((doc) => doc.includes(term)).length;
    idf.set(term, Math.log((documentCount - matchingDocs + 0.5) / (matchingDocs + 0.5) + 1));
  }

  const matches: BM25Match[] = chunks.map((chunk, i) => {
    const doc = docs[i] ?? [];
    const length = docLengths[i] ?? 0;
    const headingText = chunk.headingPath.join(' ').toLowerCase();

    let score = 0;
    for (const term of queryTerms) {
      const termFrequency = doc.filter((t) => t === term).length;
      if (termFrequency === 0) continue;

      const numerator = termFrequency * (K1 + 1);
      const denominator = termFrequency + K1 * (1 - B + B * (length / (avgLength || 1)));
      score += (idf.get(term) ?? 0) * (numerator / denominator);
    }

    if (score > 0 && queryTerms.some((term) => headingText.includes(term))) {
      score *= HEADING_MATCH_BOOST;
    }

    return { chunk, score };
  });

  return matches
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
