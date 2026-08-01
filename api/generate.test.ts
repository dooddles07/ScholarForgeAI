import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type * as GroqService from './_lib/services/groq.service.js';
import type * as GroundingService from './_lib/services/grounding.service.js';

vi.mock('./_lib/services/quota.service.js', () => ({
  checkAndConsumeQuota: vi.fn(),
  incrementErrorCounter: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./_lib/services/groq.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof GroqService>();
  return { ...actual, callGroq: vi.fn() };
});
vi.mock('./_lib/services/grounding.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof GroundingService>();
  return { ...actual, groundItems: vi.fn(actual.groundItems), groundChat: vi.fn(actual.groundChat) };
});

import { checkAndConsumeQuota, incrementErrorCounter } from './_lib/services/quota.service.js';
import { callGroq } from './_lib/services/groq.service.js';
import { groundItems } from './_lib/services/grounding.service.js';
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

  it('includes quotaRemaining in a successful items response', async () => {
    vi.mocked(checkAndConsumeQuota).mockResolvedValue({
      ok: true,
      reason: 'OK',
      remaining: 12,
    } as never);
    vi.mocked(callGroq).mockResolvedValue([]);
    process.env.GROQ_API_KEY = 'test-key';
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { quotaRemaining: number }).quotaRemaining).toBe(12);
  });

  it('includes quotaRemaining in a successful chat response', async () => {
    vi.mocked(checkAndConsumeQuota).mockResolvedValue({
      ok: true,
      reason: 'OK',
      remaining: 7,
    } as never);
    vi.mocked(callGroq).mockResolvedValue({ content: '', citations: [] });
    process.env.GROQ_API_KEY = 'test-key';
    const res = makeRes();
    await handler(makeReq({ body: { kind: 'chat', chunks: [validChunk], question: 'q' } }), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { quotaRemaining: number }).quotaRemaining).toBe(7);
  });

  describe('structured logging', () => {
    it('logs a rejection with the code and ipHash, never the raw IP', async () => {
      vi.mocked(checkAndConsumeQuota).mockResolvedValue({
        ok: true,
        reason: 'OK',
        remaining: 5,
      } as never);
      delete process.env.GROQ_API_KEY;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': '203.0.113.5' } }), res);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const logged = logSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(logged);
      expect(parsed.event).toBe('request_rejected');
      expect(parsed.code).toBe('SERVICE_UNAVAILABLE'); // no GROQ_API_KEY set in the test env
      expect(typeof parsed.ipHash).toBe('string');
      expect(logged).not.toContain('203.0.113.5');
      logSpy.mockRestore();
    });

    it('logs success without leaking chunk text or the raw IP', async () => {
      vi.mocked(checkAndConsumeQuota).mockResolvedValue({
        ok: true,
        reason: 'OK',
        remaining: 12,
      } as never);
      vi.mocked(callGroq).mockResolvedValue([]);
      process.env.GROQ_API_KEY = 'test-key';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': '203.0.113.5' } }), res);
      const logged = logSpy.mock.calls.map((call) => call[0] as string).join('\n');
      expect(logged).toContain('request_succeeded');
      expect(logged).not.toContain('203.0.113.5');
      expect(logged).not.toContain(validChunk.text);
      logSpy.mockRestore();
    });

    it('does not log request_succeeded when grounding throws after a successful Groq call', async () => {
      vi.mocked(checkAndConsumeQuota).mockResolvedValue({
        ok: true,
        reason: 'OK',
        remaining: 12,
      } as never);
      vi.mocked(callGroq).mockResolvedValue([]);
      vi.mocked(groundItems).mockImplementationOnce(() => {
        throw new Error('grounding blew up');
      });
      process.env.GROQ_API_KEY = 'test-key';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const res = makeRes();
      await handler(makeReq(), res);
      const logged = logSpy.mock.calls.map((call) => call[0] as string).join('\n');
      expect(logged).not.toContain('request_succeeded');
      expect(logged).toContain('request_failed');
      expect(res.statusCode).toBe(502);
      expect(res.body).toEqual({ error: 'PROVIDER_ERROR' });
      logSpy.mockRestore();
    });

    it('logs INTERNAL_ERROR via console.error with the elapsed time, not the raw IP', async () => {
      vi.mocked(checkAndConsumeQuota).mockRejectedValue(new Error('boom'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': '203.0.113.5' } }), res);
      const logged = errorSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(logged);
      expect(parsed.code).toBe('INTERNAL_ERROR');
      expect(typeof parsed.ms).toBe('number');
      expect(logged).not.toContain('203.0.113.5');
      errorSpy.mockRestore();
    });
  });

  describe('error-code counters', () => {
    it('increments the matching error counter on rejection', async () => {
      const res = makeRes();
      await handler(makeReq({ method: 'GET' }), res);
      expect(incrementErrorCounter).toHaveBeenCalledWith('METHOD_NOT_ALLOWED');
    });

    it('increments the matching error counter for a quota rejection', async () => {
      vi.mocked(checkAndConsumeQuota).mockResolvedValue({
        ok: false,
        reason: 'RATE_LIMITED',
        remaining: 0,
      } as never);
      const res = makeRes();
      await handler(makeReq(), res);
      expect(incrementErrorCounter).toHaveBeenCalledWith('RATE_LIMITED');
    });
  });
});
