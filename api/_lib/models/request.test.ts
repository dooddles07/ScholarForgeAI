import { describe, expect, it } from 'vitest';
import { parseGenerateRequest } from './request.js';

const chunk = { id: 'c1', text: 'Mitochondria produce ATP.', pageStart: 1, pageEnd: 1 };

function ok(overrides: Record<string, unknown> = {}) {
  return { kind: 'questions', chunks: [chunk], ...overrides };
}

describe('parseGenerateRequest', () => {
  it('accepts a minimal valid questions body', () => {
    const result = parseGenerateRequest(ok());
    expect(result.ok).toBe(true);
  });

  it('accepts a valid cards body', () => {
    expect(parseGenerateRequest(ok({ kind: 'cards', count: 12 })).ok).toBe(true);
  });

  it('accepts a valid chat body', () => {
    expect(parseGenerateRequest(ok({ kind: 'chat', question: 'What produces ATP?' })).ok).toBe(
      true,
    );
  });

  it('rejects a missing or bogus kind', () => {
    expect(parseGenerateRequest(ok({ kind: undefined })).ok).toBe(false);
    expect(parseGenerateRequest(ok({ kind: 'essays' })).ok).toBe(false);
  });

  it('rejects an empty chunks array', () => {
    expect(parseGenerateRequest(ok({ chunks: [] })).ok).toBe(false);
  });

  it('rejects a chunk missing required fields or with wrong types', () => {
    expect(parseGenerateRequest(ok({ chunks: [{ id: 'c1' }] })).ok).toBe(false);
    expect(
      parseGenerateRequest(ok({ chunks: [{ ...chunk, pageStart: 'one' }] })).ok,
    ).toBe(false);
  });

  it('rejects an out-of-range count', () => {
    expect(parseGenerateRequest(ok({ count: 0 })).ok).toBe(false);
    expect(parseGenerateRequest(ok({ count: -1 })).ok).toBe(false);
    expect(parseGenerateRequest(ok({ count: 51 })).ok).toBe(false);
    expect(parseGenerateRequest(ok({ count: 1.5 })).ok).toBe(false);
  });

  it('rejects a bogus difficulty', () => {
    expect(parseGenerateRequest(ok({ difficulty: 'impossible' })).ok).toBe(false);
  });

  it('rejects a types array containing an invalid enum value', () => {
    expect(parseGenerateRequest(ok({ types: ['mcq', 'essay'] })).ok).toBe(false);
  });

  it('rejects a chat question over the length cap', () => {
    expect(
      parseGenerateRequest(ok({ kind: 'chat', question: 'x'.repeat(2001) })).ok,
    ).toBe(false);
  });

  it('rebuilds a minimal body with no stray optional keys', () => {
    const result = parseGenerateRequest(ok());
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).not.toHaveProperty('count');
    expect(result.data).not.toHaveProperty('question');
    expect(result.data).not.toHaveProperty('difficulty');
    expect(result.data).not.toHaveProperty('types');
  });
});
