import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAllowedOrigin, clientIp, hashIp, isPlausibleApiKey } from './_lib/security.js';
import { checkAndConsumeQuota } from './_lib/quota.js';
import {
  callGemini,
  GeminiError,
  type GenerateRequestBody,
  type GroundedChunk,
  type RawCardItem,
  type RawChatResult,
  type RawQuestionItem,
} from './_lib/gemini.js';

/* Vercel's Node.js runtime, using its own req/res handler shape rather than the Web-standard
   Request/Response signature: the latter crashed on invocation in production
   (X-Vercel-Error: FUNCTION_INVOCATION_FAILED) even though it type-checked and built cleanly.
   This is the long-documented, guaranteed-supported way to write a Node Function on Vercel. */
export const config = { maxDuration: 60 };

/* Roughly 100k tokens of safety margin under Gemini's 1M-token context window, per
   ADR-0006/RATE-LIMITING-AND-ABUSE.md's request-size limit. */
const MAX_CHARS = 400_000;

interface RequestPayload extends GenerateRequestBody {
  apiKey?: string | null;
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

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  if (!isAllowedOrigin(header(req.headers.origin))) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const body = req.body as RequestPayload;
  if (!body || !body.kind || !Array.isArray(body.chunks) || body.chunks.length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST' });
    return;
  }

  if (totalChars(body.chunks) > MAX_CHARS) {
    res.status(413).json({ error: 'TEXT_TOO_LARGE' });
    return;
  }

  const usingOwnKey = Boolean(body.apiKey);

  if (usingOwnKey && !isPlausibleApiKey(body.apiKey!)) {
    res.status(400).json({ error: 'INVALID_API_KEY' });
    return;
  }

  let apiKey = body.apiKey ?? undefined;

  if (!usingOwnKey) {
    const ipHash = await hashIp(clientIp(header(req.headers['x-forwarded-for'])));
    const quota = await checkAndConsumeQuota(ipHash);
    if (!quota.ok) {
      res.status(quota.reason === 'QUOTA_EXCEEDED' ? 429 : 503).json({ error: quota.reason });
      return;
    }
    apiKey = process.env.GEMINI_API_KEY;
  }

  if (!apiKey) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    return;
  }

  try {
    const result = await callGemini(body, apiKey);

    if (body.kind === 'chat') {
      const chat = result as RawChatResult;
      const citations = chat.citations
        .map((c) => groundedCitation(c.chunkId, c.quote, body.chunks))
        .filter((c): c is NonNullable<typeof c> => c !== null);
      res.status(200).json({ content: citations.length > 0 ? chat.content : '', citations });
      return;
    }

    const items = (result as RawQuestionItem[] | RawCardItem[]).flatMap((item) => {
      const { chunkId, quote, ...rest } = item;
      const citation = groundedCitation(chunkId, quote, body.chunks);
      return citation ? [{ ...rest, citation }] : [];
    });

    res.status(200).json({ items });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    res.status(status >= 500 ? 502 : status).json({ error: 'PROVIDER_ERROR' });
  }
}
