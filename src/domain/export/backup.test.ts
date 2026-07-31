import { describe, expect, it } from 'vitest';
import { isBackupPayload } from './backup';

describe('isBackupPayload', () => {
  it('accepts a well-formed backup', () => {
    expect(
      isBackupPayload({
        version: 1,
        exportedAt: 0,
        documents: [],
        studySets: [],
        decks: [],
        cards: [],
        quizzes: [],
        attempts: [],
        exams: [],
        conversations: [],
        reviewLog: [],
      }),
    ).toBe(true);
  });

  it('rejects null, arrays, and unrelated objects', () => {
    expect(isBackupPayload(null)).toBe(false);
    expect(isBackupPayload([])).toBe(false);
    expect(isBackupPayload({ foo: 'bar' })).toBe(false);
  });

  it('rejects an object missing the documents or cards arrays', () => {
    expect(isBackupPayload({ version: 1, cards: [] })).toBe(false);
    expect(isBackupPayload({ version: 1, documents: [] })).toBe(false);
  });

  it('rejects a non-numeric version', () => {
    expect(isBackupPayload({ version: '1', documents: [], cards: [] })).toBe(false);
  });

  it('rejects a payload missing a previously-unchecked array field', () => {
    const complete = {
      version: 1,
      exportedAt: 0,
      documents: [],
      studySets: [],
      decks: [],
      cards: [],
      quizzes: [],
      attempts: [],
      exams: [],
      conversations: [],
      reviewLog: [],
    };
    const fields = [
      'studySets',
      'decks',
      'quizzes',
      'attempts',
      'exams',
      'conversations',
      'reviewLog',
    ] as const satisfies readonly (keyof typeof complete)[];
    for (const field of fields) {
      const rest: Record<string, unknown> = { ...complete };
      delete rest[field];
      expect(isBackupPayload(rest)).toBe(false);
    }
  });
});
