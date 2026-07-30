import { describe, expect, it } from 'vitest';
import type { Card } from '@/domain/types';
import { buildCardsCsv } from './deck-export';

function card(over: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'front',
    back: 'back',
    citation: { documentId: 'd', chunkId: 'c', pageStart: 1, pageEnd: 1 },
    topic: null,
    due: 0,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: null,
    isLeech: false,
    isSuspended: false,
    editedByUser: false,
    createdAt: 0,
    ...over,
  };
}

describe('buildCardsCsv', () => {
  it('emits one front,back row per card with no header', () => {
    const csv = buildCardsCsv([card({ front: 'Q1', back: 'A1' }), card({ front: 'Q2', back: 'A2' })]);
    expect(csv).toBe('Q1,A1\r\nQ2,A2');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = buildCardsCsv([card({ front: 'What is 1, 2, or 3?', back: 'Say "yes"' })]);
    expect(csv).toBe('"What is 1, 2, or 3?","Say ""yes"""');
  });

  it('returns an empty string for no cards', () => {
    expect(buildCardsCsv([])).toBe('');
  });
});
