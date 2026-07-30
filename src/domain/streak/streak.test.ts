import { describe, expect, it } from 'vitest';
import { recordStudyDay, todayKey, type StreakState } from './streak';

const empty: StreakState = { streakCount: 0, streakLastDay: '', streakGraceUsed: false };

describe('recordStudyDay', () => {
  it('starts a new streak at 1 on the first-ever study day', () => {
    const result = recordStudyDay(empty, '2026-07-30');
    expect(result).toEqual({
      streakCount: 1,
      streakLastDay: '2026-07-30',
      streakGraceUsed: false,
      event: 'started',
    });
  });

  it('is a no-op when called again on the same day', () => {
    const state: StreakState = { streakCount: 3, streakLastDay: '2026-07-30', streakGraceUsed: false };
    const result = recordStudyDay(state, '2026-07-30');
    expect(result.event).toBe('sameDay');
    expect(result.streakCount).toBe(3);
  });

  it('continues the streak on the very next day', () => {
    const state: StreakState = { streakCount: 3, streakLastDay: '2026-07-30', streakGraceUsed: false };
    const result = recordStudyDay(state, '2026-07-31');
    expect(result).toEqual({
      streakCount: 4,
      streakLastDay: '2026-07-31',
      streakGraceUsed: false,
      event: 'continued',
    });
  });

  it('forgives exactly one missed day, once per streak', () => {
    const state: StreakState = { streakCount: 3, streakLastDay: '2026-07-30', streakGraceUsed: false };
    const result = recordStudyDay(state, '2026-08-01');
    expect(result).toEqual({
      streakCount: 4,
      streakLastDay: '2026-08-01',
      streakGraceUsed: true,
      event: 'graceUsed',
    });
  });

  it('breaks the streak if the grace day was already used', () => {
    const state: StreakState = { streakCount: 4, streakLastDay: '2026-07-30', streakGraceUsed: true };
    const result = recordStudyDay(state, '2026-08-01');
    expect(result).toEqual({
      streakCount: 1,
      streakLastDay: '2026-08-01',
      streakGraceUsed: false,
      event: 'broken',
    });
  });

  it('breaks the streak after missing more than one day', () => {
    const state: StreakState = { streakCount: 5, streakLastDay: '2026-07-30', streakGraceUsed: false };
    const result = recordStudyDay(state, '2026-08-03');
    expect(result.event).toBe('broken');
    expect(result.streakCount).toBe(1);
  });
});

describe('todayKey', () => {
  it('formats as YYYY-MM-DD using local calendar fields', () => {
    const date = new Date(2026, 6, 5); // July 5, 2026 (month is 0-indexed)
    expect(todayKey(date)).toBe('2026-07-05');
  });
});
