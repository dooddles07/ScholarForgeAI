import type { Card, Citation, Question, StoredDocument, TextChunk } from '@/domain/types';
import { bm25Rank } from '@/domain/retrieval/bm25';
import { mockQuestions } from './mock/questions';
import { mockCards } from './mock/cards';
import { MOCK_DOC_ID } from './mock/document';
import { generateCardsFromChunks, generateQuestionsFromChunks } from './mock/generate';

/*
 * The single seam between the app and generation. In dev it serves fixtures, so a contributor
 * never needs credentials. In a real build it calls the Vercel proxy at /api/generate. No
 * component above this file knows the difference.
 */

export interface GenerateOptions {
  /* The user's own key, when they have supplied one. Never logged, never persisted by us. */
  apiKey?: string | null;
  signal?: AbortSignal;
}

export const IS_MOCK_MODE = import.meta.env.DEV;

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

export class ProxyError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ProxyError';
  }
}

interface ProxyChunk {
  id: string;
  text: string;
  pageStart: number;
  pageEnd: number;
}

function toProxyChunks(chunks: TextChunk[]): ProxyChunk[] {
  return chunks.map((c) => ({ id: c.id, text: c.text, pageStart: c.pageStart, pageEnd: c.pageEnd }));
}

async function callProxy(
  body: Record<string, unknown>,
  options: GenerateOptions,
): Promise<Record<string, unknown>> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, apiKey: options.apiKey ?? undefined }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ProxyError(typeof data.error === 'string' ? data.error : 'PROVIDER_ERROR');
  return data;
}

interface ProxyCitation {
  chunkId: string;
  pageStart: number;
  pageEnd: number;
  quote: string;
}

function toCitation(documentId: string, c: ProxyCitation): Citation {
  return { documentId, chunkId: c.chunkId, pageStart: c.pageStart, pageEnd: c.pageEnd, quote: c.quote };
}

interface ProxyQuestionItem {
  type: Question['type'];
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  topic?: string;
  citation: ProxyCitation;
}

function toQuestion(documentId: string, item: ProxyQuestionItem): Question {
  return {
    id: crypto.randomUUID(),
    type: item.type,
    prompt: item.prompt,
    ...(item.options ? { options: item.options } : {}),
    ...(item.correctIndex !== undefined ? { correctIndex: item.correctIndex } : {}),
    ...(item.correctAnswer ? { correctAnswer: item.correctAnswer } : {}),
    explanation: item.explanation,
    citation: toCitation(documentId, item.citation),
    difficulty: 'medium',
    topic: item.topic ?? null,
    flaggedByUser: false,
  };
}

interface ProxyCardItem {
  front: string;
  back: string;
  topic?: string;
  citation: ProxyCitation;
}

function toCard(documentId: string, deckId: string, item: ProxyCardItem): Card {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    deckId,
    type: 'basic',
    front: item.front,
    back: item.back,
    citation: toCitation(documentId, item.citation),
    topic: item.topic ?? null,
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: null,
    isLeech: false,
    isSuspended: false,
    editedByUser: false,
    createdAt: now,
  };
}

export async function generateQuestions(
  doc: StoredDocument,
  count: number,
  options: GenerateOptions = {},
): Promise<Question[]> {
  if (doc.id === MOCK_DOC_ID) {
    await wait(THINKING_MS, options.signal);
    return mockQuestions.slice(0, count);
  }

  if (IS_MOCK_MODE) {
    await wait(THINKING_MS, options.signal);
    const generated = generateQuestionsFromChunks(doc.id, doc.chunks, count);
    if (generated.length === 0) throw new Error('No usable passages');
    return generated;
  }

  const data = await callProxy(
    { kind: 'questions', chunks: toProxyChunks(doc.chunks), count },
    options,
  );
  return (data.items as ProxyQuestionItem[]).map((item) => toQuestion(doc.id, item));
}

export async function generateCards(
  doc: StoredDocument,
  deckId: string,
  count: number,
  options: GenerateOptions = {},
): Promise<Card[]> {
  if (doc.id === MOCK_DOC_ID) {
    await wait(THINKING_MS, options.signal);
    return mockCards.slice(0, count).map((card) => ({ ...card, deckId }));
  }

  if (IS_MOCK_MODE) {
    await wait(THINKING_MS, options.signal);
    return generateCardsFromChunks(doc.id, deckId, doc.chunks, count);
  }

  const data = await callProxy({ kind: 'cards', chunks: toProxyChunks(doc.chunks), count }, options);
  return (data.items as ProxyCardItem[]).map((item) => toCard(doc.id, deckId, item));
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
  if (!IS_MOCK_MODE) {
    const data = await callProxy(
      { kind: 'chat', chunks: toProxyChunks(doc.chunks), question },
      options,
    );
    return { content: data.content as string, citations: data.citations as ChatReply['citations'] };
  }

  await wait(THINKING_MS, options.signal);

  const scored = bm25Rank(doc.chunks, question, 2);

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
