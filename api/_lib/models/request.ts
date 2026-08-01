import { z } from 'zod';

export interface GroundedChunk {
  id: string;
  text: string;
  /* Never shown to the model. Used only after the response comes back, to attach a real page
     number to whatever chunkId the model cites — the citation never trusts a model-claimed page. */
  pageStart: number;
  pageEnd: number;
}

export type GenerateKind = 'questions' | 'cards' | 'chat';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq' | 'trueFalse' | 'shortAnswer' | 'fillBlank';

export interface GenerateRequestBody {
  kind: GenerateKind;
  chunks: GroundedChunk[];
  count?: number;
  question?: string;
  /* questions only. Both optional: an absent value means no restriction, matching today's
     behaviour exactly for any caller that doesn't send them. */
  difficulty?: QuestionDifficulty;
  types?: QuestionType[];
}

/* Nullable rather than optional: Groq's strict mode requires every property to appear in the
   schema's `required` array, so the model returns an explicit null instead of omitting a key. */
export interface RawQuestionItem {
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  correctIndex: number | null;
  correctAnswer: string | null;
  explanation: string;
  topic: string | null;
  chunkId: string;
  quote: string;
}

export interface RawCardItem {
  front: string;
  back: string;
  topic: string | null;
  chunkId: string;
  quote: string;
}

export interface RawChatResult {
  content: string;
  citations: { chunkId: string; quote: string }[];
}

const MAX_COUNT = 50; // generous headroom above the defaults (8 questions, 12 cards)
const MAX_QUESTION_CHARS = 2000;
const MAX_CHUNKS = 300; // defensive array-length cap; MAX_CHARS in generate.ts already bounds total text

const chunkSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  pageStart: z.number().int().nonnegative(),
  pageEnd: z.number().int().nonnegative(),
});

const requestSchema = z.object({
  kind: z.enum(['questions', 'cards', 'chat']),
  chunks: z.array(chunkSchema).min(1).max(MAX_CHUNKS),
  count: z.number().int().positive().max(MAX_COUNT).optional(),
  question: z.string().max(MAX_QUESTION_CHARS).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  types: z.array(z.enum(['mcq', 'trueFalse', 'shortAnswer', 'fillBlank'])).min(1).optional(),
});

/* Rebuilt field-by-field rather than returned directly: zod's optional-field output type is not
   assignable to GenerateRequestBody under tsconfig.api.json's exactOptionalPropertyTypes, which
   rejects `key: undefined` as distinct from the key being absent. */
export function parseGenerateRequest(
  body: unknown,
): { ok: true; data: GenerateRequestBody } | { ok: false } {
  const result = requestSchema.safeParse(body);
  if (!result.success) return { ok: false };
  const d = result.data;
  return {
    ok: true,
    data: {
      kind: d.kind,
      chunks: d.chunks,
      ...(d.count !== undefined ? { count: d.count } : {}),
      ...(d.question !== undefined ? { question: d.question } : {}),
      ...(d.difficulty !== undefined ? { difficulty: d.difficulty } : {}),
      ...(d.types !== undefined ? { types: d.types } : {}),
    },
  };
}
