import type { Card, Citation, Question, TextChunk } from '@/domain/types';

/*
 * Mock generation for documents the fixtures do not cover. Questions are built from real
 * sentences in the user's own file and cite the real page, so the citation mechanic behaves
 * exactly as it will with a live model. The questions are simpler, not fabricated.
 */

const STOPWORDS = new Set([
  'because',
  'between',
  'through',
  'therefore',
  'however',
  'although',
  'whether',
  'usually',
  'without',
  'against',
  'another',
  'thereby',
]);

function sentencesOf(chunk: TextChunk): string[] {
  return chunk.text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 260);
}

interface Candidate {
  sentence: string;
  chunk: TextChunk;
}

function candidates(chunks: TextChunk[]): Candidate[] {
  const out: Candidate[] = [];
  for (const chunk of chunks) {
    for (const sentence of sentencesOf(chunk)) out.push({ sentence, chunk });
  }
  return out;
}

function citationFor(documentId: string, chunk: TextChunk, quote: string): Citation {
  return {
    documentId,
    chunkId: chunk.id,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    quote,
  };
}

/* The most specific word in a sentence is usually the one worth testing. */
function keyTerm(sentence: string): string | null {
  const words = sentence.match(/\b[A-Za-z][A-Za-z-]{6,}\b/g) ?? [];
  const usable = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  if (usable.length === 0) return null;
  return usable.reduce((longest, w) => (w.length > longest.length ? w : longest));
}

function topicOf(chunk: TextChunk): string | null {
  return chunk.headingPath.at(-1) ?? null;
}

function fillBlank(id: string, documentId: string, c: Candidate): Question | null {
  const term = keyTerm(c.sentence);
  if (!term) return null;
  return {
    id,
    type: 'fillBlank',
    prompt: c.sentence.replace(term, '______'),
    correctAnswer: term,
    acceptableAnswers: [term.toLowerCase()],
    explanation: `This sentence appears on page ${c.chunk.pageStart} of your document.`,
    citation: citationFor(documentId, c.chunk, c.sentence),
    difficulty: 'medium',
    topic: topicOf(c.chunk),
    flaggedByUser: false,
  };
}

function trueFalse(id: string, documentId: string, c: Candidate, makeFalse: boolean): Question {
  const numbers = c.sentence.match(/\b\d+\b/g);
  let prompt = c.sentence;
  let isFalse = false;

  if (makeFalse && numbers?.[0]) {
    const original = numbers[0];
    const altered = String(Number(original) + 2);
    prompt = c.sentence.replace(original, altered);
    isFalse = true;
  }

  return {
    id,
    type: 'trueFalse',
    prompt,
    correctAnswer: isFalse ? 'False' : 'True',
    explanation: isFalse
      ? `Your document says: "${c.sentence}"`
      : `This is stated on page ${c.chunk.pageStart}.`,
    citation: citationFor(documentId, c.chunk, c.sentence),
    difficulty: 'easy',
    topic: topicOf(c.chunk),
    flaggedByUser: false,
  };
}

export function generateQuestionsFromChunks(
  documentId: string,
  chunks: TextChunk[],
  count: number,
): Question[] {
  const pool = candidates(chunks);
  const questions: Question[] = [];

  for (let i = 0; i < pool.length && questions.length < count; i += 1) {
    const c = pool[i];
    if (!c) continue;
    const id = `q-gen-${i}`;
    const question = i % 2 === 0 ? fillBlank(id, documentId, c) : trueFalse(id, documentId, c, i % 4 === 1);
    if (question) questions.push(question);
  }

  return questions;
}

export function generateCardsFromChunks(
  documentId: string,
  deckId: string,
  chunks: TextChunk[],
  count: number,
): Card[] {
  const pool = candidates(chunks).slice(0, count);
  const now = Date.now();

  return pool.map((c, i) => {
    const term = keyTerm(c.sentence) ?? topicOf(c.chunk) ?? 'this';
    return {
      id: `card-gen-${i}`,
      deckId,
      type: 'basic',
      front: `What does your document say about ${term}?`,
      back: c.sentence,
      citation: citationFor(documentId, c.chunk, c.sentence),
      topic: topicOf(c.chunk),
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
  });
}
