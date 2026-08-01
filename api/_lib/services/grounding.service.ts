import type { GroundedChunk, RawCardItem, RawChatResult, RawQuestionItem } from '../models/request.js';

/* The model is trusted to write good prose, never to invent a source: every returned item is
   dropped unless its chunkId matches one we actually sent AND its quote is real text from that
   chunk, and the page numbers in the final citation always come from our own chunk data, never
   a model-claimed page. */

export interface Citation {
  chunkId: string;
  pageStart: number;
  pageEnd: number;
  quote: string;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function groundedCitation(
  chunkId: string,
  quote: string,
  chunks: GroundedChunk[],
): Citation | null {
  const chunk = chunks.find((c) => c.id === chunkId);
  if (!chunk) return null;
  if (!normalize(chunk.text).includes(normalize(quote))) return null;
  return { chunkId: chunk.id, pageStart: chunk.pageStart, pageEnd: chunk.pageEnd, quote };
}

export function groundItems(
  items: RawQuestionItem[] | RawCardItem[],
  chunks: GroundedChunk[],
): Record<string, unknown>[] {
  return items.flatMap((item) => {
    const { chunkId, quote, ...rest } = item;
    const citation = groundedCitation(chunkId, quote, chunks);
    return citation ? [{ ...rest, citation }] : [];
  });
}

/* An answer whose every citation was invented is not a partially good answer, it is a fabrication
   with prose attached — so the content goes too, not just the citations. */
export function groundChat(
  chat: RawChatResult,
  chunks: GroundedChunk[],
): { content: string; citations: Citation[] } {
  const citations = chat.citations
    .map((c) => groundedCitation(c.chunkId, c.quote, chunks))
    .filter((c): c is Citation => c !== null);
  return { content: citations.length > 0 ? chat.content : '', citations };
}
