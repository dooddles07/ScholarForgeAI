import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAllowedOrigin, clientIp, hashIp } from './_lib/security.js';
import { checkAndConsumeQuota } from './_lib/quota.js';
import {
  callGroq,
  ProviderError,
  type GenerateRequestBody,
  type GroundedChunk,
  type RawCardItem,
  type RawChatResult,
  type RawQuestionItem,
} from './_lib/groq.js';

/* Vercel's Node.js runtime, using its own req/res handler shape rather than the Web-standard
   Request/Response signature: the latter crashed on invocation in production
   (X-Vercel-Error: FUNCTION_INVOCATION_FAILED) even though it type-checked and built cleanly.
   This is the long-documented, guaranteed-supported way to write a Node Function on Vercel. */
export const config = { maxDuration: 60 };

/* Groq's free tier caps at 8,000 tokens per minute, which is the binding constraint here — not the
   model's 131k context window. Roughly 24k characters of passage text leaves room for the prompt
   and the completion inside that budget. The client selects which chunks to send. */
const MAX_CHARS = 24_000;

function totalChars(chunks: GroundedChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.text.length, 0);
}

/* The model is trusted to write good prose, never to invent a source: every returned item is
   dropped unless its chunkId matches one we actually sent, and the page numbers in the final
   citation always come from our own chunk data, never a model-claimed page. */
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

  const body = req.body as GenerateRequestBody;
  if (!body || !body.kind || !Array.isArray(body.chunks) || body.chunks.length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST' });
    return;
  }

  if (totalChars(body.chunks) > MAX_CHARS) {
    res.status(413).json({ error: 'TEXT_TOO_LARGE' });
    return;
  }

  const ipHash = await hashIp(clientIp(header(req.headers['x-forwarded-for'])));
  const quota = await checkAndConsumeQuota(ipHash);
  if (!quota.ok) {
    res.status(quota.reason === 'QUOTA_EXCEEDED' ? 429 : 503).json({ error: quota.reason });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    return;
  }

  try {
    const result = await callGroq(body, apiKey);

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
    const status = error instanceof ProviderError ? error.status : 502;
    res.status(status >= 500 ? 502 : status).json({ error: 'PROVIDER_ERROR' });
  }
}
