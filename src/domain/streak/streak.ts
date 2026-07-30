export interface StreakState {
  streakCount: number;
  streakLastDay: string;
  streakGraceUsed: boolean;
}

export type StreakEvent = 'sameDay' | 'started' | 'continued' | 'graceUsed' | 'broken';

export interface StreakUpdate extends StreakState {
  event: StreakEvent;
}

/* Local calendar day, not UTC: a streak resets at the user's midnight, not Greenwich's. */
export function todayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function utcFromKey(key: string): number {
  const [year = 0, month = 0, day = 0] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round((utcFromKey(to) - utcFromKey(from)) / (1000 * 60 * 60 * 24));
}

/*
 * One studying day advances the streak. Missing a single day is forgiven once per streak
 * (streakGraceUsed); missing more than one day, or missing a second day before a normal day
 * resets the grace, breaks it. Calling this on a day already counted is a no-op.
 */
export function recordStudyDay(state: StreakState, today = todayKey()): StreakUpdate {
  if (state.streakLastDay === today) {
    return { ...state, event: 'sameDay' };
  }

  if (state.streakLastDay === '') {
    return { streakCount: 1, streakLastDay: today, streakGraceUsed: false, event: 'started' };
  }

  const gap = daysBetween(state.streakLastDay, today);

  if (gap === 1) {
    return {
      streakCount: state.streakCount + 1,
      streakLastDay: today,
      streakGraceUsed: false,
      event: 'continued',
    };
  }

  if (gap === 2 && !state.streakGraceUsed) {
    return {
      streakCount: state.streakCount + 1,
      streakLastDay: today,
      streakGraceUsed: true,
      event: 'graceUsed',
    };
  }

  return { streakCount: 1, streakLastDay: today, streakGraceUsed: false, event: 'broken' };
}
