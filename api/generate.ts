import { isAllowedOrigin, clientIp, hashIp } from './_lib/security';
import { checkAndConsumeQuota } from './_lib/quota';
import {
  callGemini,
  GeminiError,
  type GenerateRequestBody,
  type GroundedChunk,
  type RawCardItem,
  type RawChatResult,
  type RawQuestionItem,
} from './_lib/gemini';

export const config = { runtime: 'edge' };

/* Roughly 100k tokens of safety margin under Gemini's 1M-token context window, per
   ADR-0006/RATE-LIMITING-AND-ABUSE.md's request-size limit. */
const MAX_CHARS = 400_000;

interface RequestPayload extends GenerateRequestBody {
  apiKey?: string | null;
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function totalChars(chunks: GroundedChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.text.length, 0);
}

/* The model is trusted to write good prose, never to invent a source: every returned item is
   dropped unless its chunkId matches one we actually sent, and the page numbers in the final
   citation always come from our own chunk data, never the model's own claim. */
function groundedCitation(chunkId: string, quote: string, chunks: GroundedChunk[]) {
  const chunk = chunks.find((c) => c.id === chunkId);
  if (!chunk) return null;
  return { chunkId: chunk.id, pageStart: chunk.pageStart, pageEnd: chunk.pageEnd, quote };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(request)) return json({ error: 'FORBIDDEN' }, 403);

  let body: RequestPayload;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  if (!body.kind || !Array.isArray(body.chunks) || body.chunks.length === 0) {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  if (totalChars(body.chunks) > MAX_CHARS) {
    return json({ error: 'TEXT_TOO_LARGE' }, 413);
  }

  const usingOwnKey = Boolean(body.apiKey);
  let apiKey = body.apiKey ?? undefined;

  if (!usingOwnKey) {
    const ipHash = await hashIp(clientIp(request));
    const quota = await checkAndConsumeQuota(ipHash);
    if (!quota.ok) return json({ error: quota.reason }, quota.reason === 'QUOTA_EXCEEDED' ? 429 : 503);
    apiKey = process.env.GEMINI_API_KEY;
  }

  if (!apiKey) return json({ error: 'SERVICE_UNAVAILABLE' }, 503);

  try {
    const result = await callGemini(body, apiKey);

    if (body.kind === 'chat') {
      const chat = result as RawChatResult;
      const citations = chat.citations
        .map((c) => groundedCitation(c.chunkId, c.quote, body.chunks))
        .filter((c): c is NonNullable<typeof c> => c !== null);
      return json({ content: citations.length > 0 ? chat.content : '', citations }, 200);
    }

    const items = (result as RawQuestionItem[] | RawCardItem[]).flatMap((item) => {
      const { chunkId, quote, ...rest } = item;
      const citation = groundedCitation(chunkId, quote, body.chunks);
      return citation ? [{ ...rest, citation }] : [];
    });

    return json({ items }, 200);
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return json({ error: 'PROVIDER_ERROR' }, status >= 500 ? 502 : status);
  }
}
