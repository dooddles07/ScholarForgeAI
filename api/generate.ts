import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAllowedOrigin, clientIp, hashIp } from './_lib/http/security.js';
import { logEvent } from './_lib/http/log.js';
import { checkAndConsumeQuota, incrementErrorCounter } from './_lib/services/quota.service.js';
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
  const start = Date.now();
  try {
    await handleGenerate(req, res, start);
  } catch (error) {
    // Unexpected throw from validation/quota/parsing code, not the Groq call (that has its own
    // try/catch below) -- kept as a distinct code from SERVICE_UNAVAILABLE so error-rate
    // monitoring can tell "a dependency is down" apart from "we shipped a bug".
    console.error(
      JSON.stringify({
        event: 'request_error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        ms: Date.now() - start,
      }),
    );
    await incrementErrorCounter('INTERNAL_ERROR');
    if (!res.headersSent) res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

async function handleGenerate(
  req: VercelRequest,
  res: VercelResponse,
  start: number,
): Promise<void> {
  if (req.method !== 'POST') {
    logEvent('request_rejected', { code: 'METHOD_NOT_ALLOWED', ms: Date.now() - start });
    await incrementErrorCounter('METHOD_NOT_ALLOWED');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const ipHash = await hashIp(clientIp(header(req.headers['x-forwarded-for'])));

  if (!isAllowedOrigin(header(req.headers.origin))) {
    logEvent('request_rejected', { code: 'FORBIDDEN', ipHash, ms: Date.now() - start });
    await incrementErrorCounter('FORBIDDEN');
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const parsed = parseGenerateRequest(req.body);
  if (!parsed.ok) {
    logEvent('request_rejected', { code: 'BAD_REQUEST', ipHash, ms: Date.now() - start });
    await incrementErrorCounter('BAD_REQUEST');
    res.status(400).json({ error: 'BAD_REQUEST' });
    return;
  }
  const body = parsed.data;

  if (totalChars(body.chunks) > MAX_CHARS) {
    logEvent('request_rejected', {
      code: 'TEXT_TOO_LARGE',
      ipHash,
      kind: body.kind,
      ms: Date.now() - start,
    });
    await incrementErrorCounter('TEXT_TOO_LARGE');
    res.status(413).json({ error: 'TEXT_TOO_LARGE' });
    return;
  }

  // Checked before quota is consumed: a misconfigured deploy (missing key) shouldn't burn a
  // user's daily allowance on a request that was never going to reach Groq.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logEvent('request_rejected', {
      code: 'SERVICE_UNAVAILABLE',
      ipHash,
      kind: body.kind,
      ms: Date.now() - start,
    });
    await incrementErrorCounter('SERVICE_UNAVAILABLE');
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    return;
  }

  const quota = await checkAndConsumeQuota(ipHash);
  if (!quota.ok) {
    const status = quota.reason === 'QUOTA_EXCEEDED' || quota.reason === 'RATE_LIMITED' ? 429 : 503;
    logEvent('request_rejected', {
      code: quota.reason,
      ipHash,
      kind: body.kind,
      ms: Date.now() - start,
    });
    await incrementErrorCounter(quota.reason);
    res.status(status).json({ error: quota.reason });
    return;
  }

  let result: RawQuestionItem[] | RawCardItem[] | RawChatResult;
  try {
    result = await callGroq(body, apiKey);
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 502;
    const mappedStatus = status >= 500 ? 502 : status;
    logEvent('request_failed', {
      code: 'PROVIDER_ERROR',
      status: mappedStatus,
      ipHash,
      kind: body.kind,
      ms: Date.now() - start,
    });
    await incrementErrorCounter('PROVIDER_ERROR');
    res.status(mappedStatus).json({ error: 'PROVIDER_ERROR' });
    return;
  }

  // Grounding is intentionally outside the try/catch above: a throw here is our own bug, not a
  // Groq failure, so it should fall through to the outer catch-all (INTERNAL_ERROR) rather than
  // be mislabeled PROVIDER_ERROR -- the two mean different things for error-rate monitoring.
  if (body.kind === 'chat') {
    const grounded = groundChat(result as RawChatResult, body.chunks);
    logEvent('request_succeeded', {
      kind: body.kind,
      ipHash,
      status: 200,
      quotaRemaining: quota.remaining,
      ms: Date.now() - start,
    });
    res.status(200).json({ ...grounded, quotaRemaining: quota.remaining });
    return;
  }

  const items = groundItems(result as RawQuestionItem[] | RawCardItem[], body.chunks);
  logEvent('request_succeeded', {
    kind: body.kind,
    ipHash,
    status: 200,
    quotaRemaining: quota.remaining,
    ms: Date.now() - start,
  });
  res.status(200).json({ items, quotaRemaining: quota.remaining });
}
