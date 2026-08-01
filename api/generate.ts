import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAllowedOrigin, clientIp, hashIp } from './_lib/http/security.js';
import { checkAndConsumeQuota } from './_lib/services/quota.service.js';
import { groundChat, groundItems } from './_lib/services/grounding.service.js';
import { callGroq, ProviderError } from './_lib/services/groq.service.js';
import { parseGenerateRequest } from './_lib/models/request.js';
import type {
  GroundedChunk,
  RawCardItem,
  RawChatResult,
  RawQuestionItem,
} from './_lib/models/request.js';

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

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await handleGenerate(req, res);
  } catch (error) {
    // Unexpected throw from validation/quota/parsing code, not the Groq call (that has its own
    // try/catch below) -- kept as a distinct code from SERVICE_UNAVAILABLE so error-rate
    // monitoring can tell "a dependency is down" apart from "we shipped a bug".
    console.error(
      JSON.stringify({
        event: 'request_error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    if (!res.headersSent) res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

async function handleGenerate(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  if (!isAllowedOrigin(header(req.headers.origin))) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const parsed = parseGenerateRequest(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: 'BAD_REQUEST' });
    return;
  }
  const body = parsed.data;

  if (totalChars(body.chunks) > MAX_CHARS) {
    res.status(413).json({ error: 'TEXT_TOO_LARGE' });
    return;
  }

  const ipHash = await hashIp(clientIp(header(req.headers['x-forwarded-for'])));
  const quota = await checkAndConsumeQuota(ipHash);
  if (!quota.ok) {
    const status = quota.reason === 'QUOTA_EXCEEDED' || quota.reason === 'RATE_LIMITED' ? 429 : 503;
    res.status(status).json({ error: quota.reason });
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
      res.status(200).json({
        ...groundChat(result as RawChatResult, body.chunks),
        quotaRemaining: quota.remaining,
      });
      return;
    }

    res.status(200).json({
      items: groundItems(result as RawQuestionItem[] | RawCardItem[], body.chunks),
      quotaRemaining: quota.remaining,
    });
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 502;
    res.status(status >= 500 ? 502 : status).json({ error: 'PROVIDER_ERROR' });
  }
}
