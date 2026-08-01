import type {
  GenerateRequestBody,
  GroundedChunk,
  QuestionDifficulty,
  QuestionType,
  RawCardItem,
  RawChatResult,
  RawQuestionItem,
} from '../models/request.js';

/* Only the gpt-oss models support strict json_schema on Groq — llama-3.3-70b, llama-3.1-8b,
   qwen3.6 and compound all reject the request outright, verified against the live API. Structured
   output is not optional here: the grounding rule depends on every item carrying a chunk id. */
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

/* The model only ever sees chunk id + text, never a page number: page numbers in the final
   citation always come from our own chunk data, never from the model's own claim. */
function passagesBlock(chunks: GroundedChunk[]): string {
  return chunks.map((c) => `[chunk ${c.id}]\n${c.text}`).join('\n\n');
}

const GROUNDING_RULE =
  'Use only the passages given below. Every item you produce must cite the exact chunk id ' +
  'it came from, copied from the [chunk ...] marker, and a short quote from that chunk. ' +
  'Never invent a fact, a number, or a chunk id that is not present below. ' +
  'Set any field that does not apply to null rather than omitting it.';

const ALL_QUESTION_TYPES: QuestionType[] = ['mcq', 'trueFalse', 'shortAnswer', 'fillBlank'];

/* Groq's strict mode rejects a schema unless every object sets additionalProperties:false and
   lists every one of its properties in `required`. Optional fields are expressed as nullable
   unions instead — both rules verified against the live API. */
function objectSchema(properties: Record<string, unknown>) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

function questionSchema(count: number, types: QuestionType[] = ALL_QUESTION_TYPES) {
  return objectSchema({
    items: {
      type: 'array',
      maxItems: count,
      items: objectSchema({
        type: { type: 'string', enum: types.length > 0 ? types : ALL_QUESTION_TYPES },
        prompt: { type: 'string' },
        options: { type: ['array', 'null'], items: { type: 'string' } },
        correctIndex: { type: ['integer', 'null'] },
        correctAnswer: { type: ['string', 'null'] },
        explanation: { type: 'string' },
        topic: { type: ['string', 'null'] },
        chunkId: { type: 'string' },
        quote: { type: 'string' },
      }),
    },
  });
}

function cardSchema(count: number) {
  return objectSchema({
    items: {
      type: 'array',
      maxItems: count,
      items: objectSchema({
        front: { type: 'string' },
        back: { type: 'string' },
        topic: { type: ['string', 'null'] },
        chunkId: { type: 'string' },
        quote: { type: 'string' },
      }),
    },
  });
}

const chatSchema = objectSchema({
  content: { type: 'string' },
  citations: {
    type: 'array',
    maxItems: 2,
    items: objectSchema({
      chunkId: { type: 'string' },
      quote: { type: 'string' },
    }),
  },
});

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

export function promptFor(body: GenerateRequestBody): { prompt: string; schema: object } {
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

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function callGroq(
  body: GenerateRequestBody,
  apiKey: string,
): Promise<RawQuestionItem[] | RawCardItem[] | RawChatResult> {
  const { prompt, schema } = promptFor(body);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: body.kind, strict: true, schema },
      },
    }),
  });

  if (!response.ok) {
    throw new ProviderError(`Groq responded ${response.status}`, response.status);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new ProviderError('No content in Groq response', 502);

  const parsed = JSON.parse(text);

  if (body.kind === 'chat') return parsed as RawChatResult;
  return parsed.items as RawQuestionItem[] | RawCardItem[];
}
