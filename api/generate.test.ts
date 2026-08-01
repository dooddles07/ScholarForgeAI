import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type * as GroqService from './_lib/services/groq.service.js';

vi.mock('./_lib/services/quota.service.js', () => ({
  checkAndConsumeQuota: vi.fn(),
}));
vi.mock('./_lib/services/groq.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof GroqService>();
  return { ...actual, callGroq: vi.fn() };
});

import { checkAndConsumeQuota } from './_lib/services/quota.service.js';
import { callGroq } from './_lib/services/groq.service.js';
import handler from './generate.js';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.clearAllMocks();
});

const validChunk = { id: 'c1', text: 'Mitochondria produce ATP.', pageStart: 1, pageEnd: 1 };

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: {},
    body: { kind: 'questions', chunks: [validChunk] },
    ...overrides,
  } as VercelRequest;
}

function makeRes(): VercelResponse & { statusCode?: number; body?: unknown } {
  const res = {
    headersSent: false,
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      res.headersSent = true;
      return res;
    },
  };
  return res as unknown as VercelResponse & { statusCode?: number; body?: unknown };
}

describe('handler', () => {
  it('rejects non-POST requests', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'METHOD_NOT_ALLOWED' });
  });

  it('rejects a disallowed origin', async () => {
    process.env.ALLOWED_ORIGIN = 'https://scholarforge.app';
    const res = makeRes();
    await handler(makeReq({ headers: { origin: 'https://evil.example' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN' });
  });

  it('rejects a malformed body', async () => {
    const res = makeRes();
    await handler(makeReq({ body: { kind: 'essays', chunks: [] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'BAD_REQUEST' });
  });

  it('rejects a request over the character budget', async () => {
    const res = makeRes();
    const hugeChunk = { ...validChunk, text: 'x'.repeat(25_000) };
    await handler(makeReq({ body: { kind: 'questions', chunks: [hugeChunk] } }), res);
    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: 'TEXT_TOO_LARGE' });
  });

  it('maps a RATE_LIMITED quota result to 429', async () => {
    vi.mocked(checkAndConsumeQuota).mockResolvedValue({
      ok: false,
      reason: 'RATE_LIMITED',
      remaining: 0,
    } as never);
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'RATE_LIMITED' });
  });

  it('returns INTERNAL_ERROR when quota/parsing code throws unexpectedly', async () => {
    vi.mocked(checkAndConsumeQuota).mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'INTERNAL_ERROR' });
  });

  it('does not double-send when headers were already sent before the throw', async () => {
    vi.mocked(checkAndConsumeQuota).mockResolvedValue({ ok: true, reason: 'OK' } as never);
    vi.mocked(callGroq).mockRejectedValue(new Error('boom after headers sent'));
    process.env.GROQ_API_KEY = 'test-key';
    const res = makeRes();
    await handler(makeReq(), res);
    // callGroq throwing is handled by the inner try/catch (PROVIDER_ERROR), not the outer one.
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'PROVIDER_ERROR' });
  });
});
