import { describe, expect, it } from 'vitest';
import type { Card } from '@/domain/types';
import { applyRating, previewIntervals } from './fsrs-adapter';

const now = new Date('2026-01-01T00:00:00Z');

const card = (over: Partial<Card> = {}): Card => ({
  id: 'c1',
  deckId: 'd1',
  type: 'basic',
  front: 'front',
  back: 'back',
  citation: { documentId: 'doc', chunkId: 'chunk', pageStart: 1, pageEnd: 1 },
  topic: null,
  due: now.getTime(),
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
  createdAt: now.getTime(),
  ...over,
});

describe('previewIntervals', () => {
  it('returns one preview per rating button', () => {
    const previews = previewIntervals(card(), now);
    expect(previews.map((p) => p.rating)).toEqual([1, 2, 3, 4]);
  });

  it('intervals are non-decreasing from Again to Easy on a fresh card', () => {
    const previews = previewIntervals(card(), now);
    const days = previews.map((p) => p.intervalDays);
    expect(days[0]).toBeLessThanOrEqual(days[1]!);
    expect(days[1]).toBeLessThanOrEqual(days[2]!);
    expect(days[2]).toBeLessThanOrEqual(days[3]!);
  });
});

describe('applyRating', () => {
  it('moves a new card off the new state', () => {
    const next = applyRating(card(), 3, now);
    expect(next.state).not.toBe('new');
  });

  it('increments reps and sets lastReview', () => {
    const next = applyRating(card(), 3, now);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(now.getTime());
  });

  it('never marks a card rated Easy as a leech', () => {
    const next = applyRating(card(), 4, now);
    expect(next.isLeech).toBe(false);
  });

  it('marks a card a leech once one more lapse crosses the threshold', () => {
    const reviewCard = card({
      state: 'review',
      stability: 5,
      difficulty: 5,
      reps: 20,
      lapses: 7,
    });
    const next = applyRating(reviewCard, 1, now);
    expect(next.lapses).toBe(8);
    expect(next.isLeech).toBe(true);
  });

  it('does not mark a leech before the threshold', () => {
    const reviewCard = card({
      state: 'review',
      stability: 5,
      difficulty: 5,
      reps: 20,
      lapses: 2,
    });
    const next = applyRating(reviewCard, 1, now);
    expect(next.isLeech).toBe(false);
  });
});
