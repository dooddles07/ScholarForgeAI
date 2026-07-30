import type { TextChunk } from '@/domain/types';

export interface PageText {
  page: number;
  text: string;
}

const TARGET_CHARS = 3000;

/*
 * Chunks never span a page boundary silently: pageStart and pageEnd are carried through so every
 * citation can name a real page. A chunk that lost its page number is unusable to us.
 */
export function chunkPages(pages: PageText[], targetChars = TARGET_CHARS): TextChunk[] {
  const chunks: TextChunk[] = [];
  let buffer = '';
  let pageStart = 0;
  let pageEnd = 0;

  const flush = () => {
    const text = buffer.trim();
    if (text.length === 0) return;
    chunks.push({
      id: `chunk-${chunks.length}-p${pageStart}`,
      text,
      pageStart,
      pageEnd,
      headingPath: [],
      charCount: text.length,
    });
    buffer = '';
  };

  for (const { page, text } of pages) {
    const trimmed = text.trim();
    if (trimmed.length === 0) continue;

    if (buffer.length === 0) pageStart = page;
    buffer += (buffer.length > 0 ? '\n\n' : '') + trimmed;
    pageEnd = page;

    if (buffer.length >= targetChars) flush();
  }

  flush();
  return chunks;
}

/* Rough but stable. Used only to pick a retrieval tier, never shown to a user. */
export function estimateTokens(chunks: TextChunk[]): number {
  const chars = chunks.reduce((sum, c) => sum + c.charCount, 0);
  return Math.round(chars / 4);
}
