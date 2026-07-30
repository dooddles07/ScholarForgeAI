import type { Card, Question, StoredDocument } from '@/domain/types';
import { mockQuestions } from './mock/questions';
import { mockCards } from './mock/cards';
import { MOCK_DOC_ID } from './mock/document';
import { generateCardsFromChunks, generateQuestionsFromChunks } from './mock/generate';

/*
 * The single seam between the app and generation. Today it serves fixtures. Pointing it at the
 * Cloudflare proxy is a change to this file and nothing else: no component knows the difference.
 */

export interface GenerateOptions {
  /* The user's own key, when they have supplied one. Never logged, never persisted by us. */
  apiKey?: string | null;
  signal?: AbortSignal;
}

export const IS_MOCK_MODE = true;

/* Enough delay that progress states are real rather than theatre, short enough not to annoy. */
const THINKING_MS = 900;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    });
  });
}

export async function generateQuestions(
  doc: StoredDocument,
  count: number,
  options: GenerateOptions = {},
): Promise<Question[]> {
  await wait(THINKING_MS, options.signal);

  if (doc.id === MOCK_DOC_ID) return mockQuestions.slice(0, count);

  const generated = generateQuestionsFromChunks(doc.id, doc.chunks, count);
  if (generated.length === 0) throw new Error('No usable passages');
  return generated;
}

export async function generateCards(
  doc: StoredDocument,
  deckId: string,
  count: number,
  options: GenerateOptions = {},
): Promise<Card[]> {
  await wait(THINKING_MS, options.signal);

  if (doc.id === MOCK_DOC_ID) {
    return mockCards.slice(0, count).map((card) => ({ ...card, deckId }));
  }
  return generateCardsFromChunks(doc.id, deckId, doc.chunks, count);
}

export interface ChatReply {
  content: string;
  citations: { pageStart: number; pageEnd: number; chunkId: string; quote: string }[];
}

/*
 * Answers only from the document. When nothing matches, it says so instead of reaching for
 * general knowledge, which is the behaviour the real prompt is written to enforce.
 */
export async function answerQuestion(
  doc: StoredDocument,
  question: string,
  options: GenerateOptions = {},
): Promise<ChatReply> {
  await wait(THINKING_MS, options.signal);

  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const scored = doc.chunks
    .map((chunk) => {
      const text = chunk.text.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
      return { chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (scored.length === 0) {
    return { content: '', citations: [] };
  }

  const parts = scored.map(({ chunk }) => {
    const sentence = chunk.text.split(/(?<=[.!?])\s+/)[0] ?? chunk.text.slice(0, 200);
    return { sentence, chunk };
  });

  const content = parts
    .map(({ sentence, chunk }) => `${sentence} [p. ${chunk.pageStart}]`)
    .join(' ');

  return {
    content,
    citations: parts.map(({ sentence, chunk }) => ({
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      chunkId: chunk.id,
      quote: sentence,
    })),
  };
}
