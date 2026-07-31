import type { TextChunk } from '@/domain/types';

/*
 * Picks chunks spread evenly across a document, up to a character budget.
 *
 * Generating questions or cards has no query to rank against, so BM25 does not apply. Taking the
 * first N chunks would draw every question from the opening pages, which is worse than useless for
 * a textbook. Walking at an even stride keeps coverage of the whole document within the budget the
 * provider's per-minute token cap allows.
 */
export function selectSpread(chunks: TextChunk[], maxChars: number): TextChunk[] {
  if (chunks.length === 0 || maxChars <= 0) return [];

  const total = chunks.reduce((sum, c) => sum + c.text.length, 0);
  if (total <= maxChars) return chunks;

  const averageChars = total / chunks.length;
  const affordable = Math.max(1, Math.floor(maxChars / averageChars));
  const stride = chunks.length / affordable;

  const selected: TextChunk[] = [];
  let used = 0;

  for (let i = 0; i < affordable; i += 1) {
    const chunk = chunks[Math.floor(i * stride)];
    if (!chunk) continue;
    if (used + chunk.text.length > maxChars) break;
    selected.push(chunk);
    used += chunk.text.length;
  }

  /* A single chunk longer than the whole budget still has to go somewhere, or generation would
     fail outright on a document made of very large chunks. */
  if (selected.length === 0 && chunks[0]) return [chunks[0]];

  return selected;
}
