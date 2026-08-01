import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateRequestBody } from '../models/request.js';
import { callGroq, promptFor } from './groq.service.js';

const chunk = { id: 'c1', text: 'Mitochondria produce ATP.', pageStart: 1, pageEnd: 1 };

function baseBody(overrides: Partial<GenerateRequestBody> = {}): GenerateRequestBody {
  return { kind: 'questions', chunks: [chunk], ...overrides };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('promptFor', () => {
  it('defaults questions to a count of 8 and every question type', () => {
    const { prompt, schema } = promptFor(baseBody());
    expect(prompt).toContain('Write 8 study questions');
    expect(prompt).toContain('multiple choice, true/false, short answer, fill-in-the-blank');
    const s = schema as { properties: { items: { maxItems: number; items: { properties: { type: { enum: string[] } } } } } };
    expect(s.properties.items.maxItems).toBe(8);
    expect(s.properties.items.items.properties.type.enum).toEqual([
      'mcq',
      'trueFalse',
      'shortAnswer',
      'fillBlank',
    ]);
  });

  it('reflects an explicit count and types for questions', () => {
    const { prompt, schema } = promptFor(baseBody({ count: 3, types: ['mcq'] }));
    expect(prompt).toContain('Write 3 study questions');
    const s = schema as { properties: { items: { maxItems: number; items: { properties: { type: { enum: string[] } } } } } };
    expect(s.properties.items.maxItems).toBe(3);
    expect(s.properties.items.items.properties.type.enum).toEqual(['mcq']);
  });

  it('includes the difficulty clause only when difficulty is set', () => {
    const withDifficulty = promptFor(baseBody({ difficulty: 'hard' })).prompt;
    expect(withDifficulty).toContain('Application level');
    const without = promptFor(baseBody()).prompt;
    expect(without).not.toContain('Application level');
  });

  it('maps every difficulty to its own instruction', () => {
    expect(promptFor(baseBody({ difficulty: 'easy' })).prompt).toContain('Recall level');
    expect(promptFor(baseBody({ difficulty: 'medium' })).prompt).toContain('Understanding level');
    expect(promptFor(baseBody({ difficulty: 'hard' })).prompt).toContain('Application level');
  });

  it('defaults cards to a count of 12', () => {
    const { prompt, schema } = promptFor(baseBody({ kind: 'cards' }));
    expect(prompt).toContain('Write 12 flashcards');
    const s = schema as { properties: { items: { maxItems: number } } };
    expect(s.properties.items.maxItems).toBe(12);
  });

  it('reflects an explicit count for cards', () => {
    const { prompt } = promptFor(baseBody({ kind: 'cards', count: 5 }));
    expect(prompt).toContain('Write 5 flashcards');
  });

  it('interpolates the question for chat', () => {
    const { prompt } = promptFor(baseBody({ kind: 'chat', question: 'What produces ATP?' }));
    expect(prompt).toContain('Question: What produces ATP?');
  });

  it('falls back to an empty string when chat has no question', () => {
    const { prompt } = promptFor(baseBody({ kind: 'chat' }));
    expect(prompt).toContain('Question: \n\n');
  });
});

describe('callGroq', () => {
  it('throws a ProviderError carrying the upstream status on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(callGroq(baseBody(), 'key')).rejects.toMatchObject({
      status: 429,
      message: 'Groq responded 429',
    });
  });

  it('throws a 502 ProviderError when the response has no string content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: {} }] }),
      }),
    );
    await expect(callGroq(baseBody(), 'key')).rejects.toMatchObject({ status: 502 });
  });

  it('returns the parsed object directly for chat', async () => {
    const payload = { content: 'answer', citations: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
      }),
    );
    const result = await callGroq(baseBody({ kind: 'chat', question: 'q' }), 'key');
    expect(result).toEqual(payload);
  });

  it('returns parsed.items for questions and cards', async () => {
    const items = [{ prompt: 'p' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ items }) } }] }),
      }),
    );
    const result = await callGroq(baseBody(), 'key');
    expect(result).toEqual(items);
  });
});
