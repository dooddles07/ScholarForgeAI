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

export interface RawQuestionItem {
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  topic?: string;
  chunkId: string;
  quote: string;
}

export interface RawCardItem {
  front: string;
  back: string;
  topic?: string;
  chunkId: string;
  quote: string;
}

export interface RawChatResult {
  content: string;
  citations: { chunkId: string; quote: string }[];
}

/* A rolling alias, not a pinned version: gemini-2.5-flash was retired for new API keys without
   notice mid-project, which is exactly the failure this avoids going forward.
   Lite, not the full Flash alias: the free tier's daily-request cap on regular Flash models
   measured as low as 20 requests/day across the whole project during testing, while the Lite
   tier measured 500/day for the same account. Structured JSON generation from a short passage
   doesn't need the larger model's extra reasoning depth. */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest';

/* The model only ever sees chunk id + text, never a page number: page numbers in the final
   citation always come from our own chunk data, never from the model's own claim. */
function passagesBlock(chunks: GroundedChunk[]): string {
  return chunks.map((c) => `[chunk ${c.id}]\n${c.text}`).join('\n\n');
}

const GROUNDING_RULE =
  'Use only the passages given below. Every item you produce must cite the exact chunk id ' +
  'it came from, copied from the [chunk ...] marker, and a short quote from that chunk. ' +
  'Never invent a fact, a number, or a chunk id that is not present below.';

const ALL_QUESTION_TYPES: QuestionType[] = ['mcq', 'trueFalse', 'shortAnswer', 'fillBlank'];

function questionSchema(count: number, types: QuestionType[] = ALL_QUESTION_TYPES) {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        maxItems: count,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: types.length > 0 ? types : ALL_QUESTION_TYPES },
            prompt: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correctIndex: { type: 'integer' },
            correctAnswer: { type: 'string' },
            explanation: { type: 'string' },
            topic: { type: 'string' },
            chunkId: { type: 'string' },
            quote: { type: 'string' },
          },
          required: ['type', 'prompt', 'explanation', 'chunkId', 'quote'],
        },
      },
    },
    required: ['items'],
  };
}

function cardSchema(count: number) {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        maxItems: count,
        items: {
          type: 'object',
          properties: {
            front: { type: 'string' },
            back: { type: 'string' },
            topic: { type: 'string' },
            chunkId: { type: 'string' },
            quote: { type: 'string' },
          },
          required: ['front', 'back', 'chunkId', 'quote'],
        },
      },
    },
    required: ['items'],
  };
}

const chatSchema = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    citations: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          chunkId: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['chunkId', 'quote'],
      },
    },
  },
  required: ['content', 'citations'],
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'multiple choice',
  trueFalse: 'true/false',
  shortAnswer: 'short answer',
  fillBlank: 'fill-in-the-blank',
};

const DIFFICULTY_INSTRUCTIONS: Record<QuestionDifficulty, string> = {
  easy: 'Recall level: the student should be able to answer from remembering a stated fact.',
  medium: 'Understanding level: the student should have to explain the idea, not just recall it.',
  hard: 'Application level: the student should have to use the concept in a new situation, not just recall or explain it.',
};

function promptFor(body: GenerateRequestBody): { prompt: string; schema: object } {
  const passages = passagesBlock(body.chunks);

  if (body.kind === 'questions') {
    const count = body.count ?? 8;
    const types = body.types && body.types.length > 0 ? body.types : ALL_QUESTION_TYPES;
    const typeList = types.map((t) => TYPE_LABELS[t]).join(', ');
    const difficultyClause = body.difficulty ? ` ${DIFFICULTY_INSTRUCTIONS[body.difficulty]}` : '';
    return {
      prompt:
        `${GROUNDING_RULE}\n\nWrite ${count} study questions from these passages, a mix of ` +
        `${typeList}. Each explanation should be one sentence a student can learn from.` +
        `${difficultyClause}\n\n${passages}`,
      schema: questionSchema(count, types),
    };
  }

  if (body.kind === 'cards') {
    const count = body.count ?? 12;
    return {
      prompt:
        `${GROUNDING_RULE}\n\nWrite ${count} flashcards from these passages. Each front is a ` +
        `question or prompt, each back is the answer in one or two sentences.\n\n${passages}`,
      schema: cardSchema(count),
    };
  }

  return {
    prompt:
      `${GROUNDING_RULE}\n\nAnswer this question using only the passages below. If the ` +
      `passages do not cover it, set content to an empty string and citations to an empty ` +
      `array rather than guessing.\n\nQuestion: ${body.question ?? ''}\n\n${passages}`,
    schema: chatSchema,
  };
}

export class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function callGemini(
  body: GenerateRequestBody,
  apiKey: string,
): Promise<RawQuestionItem[] | RawCardItem[] | RawChatResult> {
  const { prompt, schema } = promptFor(body);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      }),
    },
  );

  if (!response.ok) {
    throw new GeminiError(`Gemini responded ${response.status}`, response.status);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new GeminiError('No text in Gemini response', 502);

  const parsed = JSON.parse(text);

  if (body.kind === 'chat') return parsed as RawChatResult;
  return parsed.items as RawQuestionItem[] | RawCardItem[];
}
