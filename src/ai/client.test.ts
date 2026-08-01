import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredDocument } from '@/domain/types';
import { generationErrorMessage } from '@/lib/generation-error';
import { quota } from '@/copy/errors';

vi.stubEnv('VITE_MOCK_AI', 'true');
const { answerQuestion, generateCards, generateQuestions, ProxyError } = await import('./client');

/* Sentences long enough for the mock generator, which ignores anything under 60 characters
   because a short fragment makes a poor question. */
const doc: StoredDocument = {
  id: 'doc-1',
  chunks: [
    {
      id: 'c1',
      text: 'Mitochondria produce most of the ATP that a eukaryotic cell uses, therefore they are often described as its powerhouses. They contain their own circular DNA, which is separate from the DNA held in the nucleus of the cell.',
      pageStart: 1,
      pageEnd: 1,
      headingPath: ['Cell biology'],
    },
    {
      id: 'c2',
      text: 'Ribosomes assemble proteins by reading messenger RNA and joining amino acids in the order that the sequence specifies. This process is called translation, although the term is sometimes used more loosely elsewhere.',
      pageStart: 2,
      pageEnd: 2,
      headingPath: ['Protein synthesis'],
    },
  ],
} as StoredDocument;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_MOCK_AI', 'true');
});

/* The mock path deliberately waits, so every call has to be advanced past it. The promise is
   returned before the timers run, so the caller's handler is attached before any rejection —
   awaiting the advance first would surface every expected failure as an unhandled rejection. */
function run<T>(call: () => Promise<T>): Promise<T> {
  const promise = call();
  void vi.advanceTimersByTimeAsync(1000);
  return promise;
}

describe('mock mode failure injection', () => {
  it('serves fixtures when no failure is configured', async () => {
    const questions = await run(() => generateQuestions(doc, 2));
    expect(questions.length).toBeGreaterThan(0);
  });

  it.each(['QUOTA_EXCEEDED', 'SERVICE_DISABLED', 'PROVIDER_ERROR'])(
    'throws a ProxyError carrying %s',
    async (code) => {
      vi.stubEnv('VITE_MOCK_FAILURE', code);
      await expect(run(() => generateQuestions(doc, 2))).rejects.toThrow(ProxyError);
      await expect(run(() => generateCards(doc, 'deck-1', 2))).rejects.toMatchObject({ code });
      await expect(run(() => answerQuestion(doc, 'what is ATP?'))).rejects.toMatchObject({ code });
    },
  );

  /* A quota code has to survive the trip to the UI as a quota message, not the generic one —
     that mapping is the whole point of injecting the failure. */
  it('produces the quota message rather than the generic one', async () => {
    vi.stubEnv('VITE_MOCK_FAILURE', 'QUOTA_EXCEEDED');
    const error = await run(() => generateQuestions(doc, 2)).catch((e: unknown) => e);
    expect(generationErrorMessage(error)).toContain(quota.heading);
  });

  /* Everything failing the citation check returns 200 with nothing in it, which is a different
     UI path from an error. */
  it('returns empty results for UNGROUNDED instead of throwing', async () => {
    vi.stubEnv('VITE_MOCK_FAILURE', 'UNGROUNDED');
    expect(await run(() => generateQuestions(doc, 2))).toEqual([]);
    expect(await run(() => generateCards(doc, 'deck-1', 2))).toEqual([]);
    expect(await run(() => answerQuestion(doc, 'what is ATP?'))).toEqual({
      content: '',
      citations: [],
    });
  });

  it('rejects a misspelled code rather than failing in some unexplained way', async () => {
    vi.stubEnv('VITE_MOCK_FAILURE', 'QOUTA_EXCEEDED');
    await expect(run(() => generateQuestions(doc, 2))).rejects.toThrow(/Unknown VITE_MOCK_FAILURE/);
  });
});

describe('real proxy mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('invokes onQuotaRemaining when the proxy response carries the field', async () => {
    vi.stubEnv('VITE_MOCK_AI', 'false');
    vi.resetModules();
    const { generateQuestions: realGenerateQuestions } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], quotaRemaining: 5 }),
      }),
    );
    const onQuotaRemaining = vi.fn();
    await realGenerateQuestions(doc, 2, {}, { onQuotaRemaining });
    expect(onQuotaRemaining).toHaveBeenCalledWith(5);
    vi.resetModules();
  });

  it('does not invoke onQuotaRemaining when the field is absent', async () => {
    vi.stubEnv('VITE_MOCK_AI', 'false');
    vi.resetModules();
    const { generateQuestions: realGenerateQuestions } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }),
    );
    const onQuotaRemaining = vi.fn();
    await realGenerateQuestions(doc, 2, {}, { onQuotaRemaining });
    expect(onQuotaRemaining).not.toHaveBeenCalled();
    vi.resetModules();
  });
});
