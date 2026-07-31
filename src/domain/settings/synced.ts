import type { Settings } from '@/domain/types';

/* Preferences that describe the person, so they belong on every device they sign in on.
   Everything else in Settings describes this browser's own history and stays put. */
export const SYNCED_SETTINGS_KEYS = [
  'theme',
  'readingMode',
  'reduceMotion',
  'dailyCardLimit',
  'focusTimerEnabled',
  'streakCount',
  'streakLastDay',
  'streakGraceUsed',
] as const;

export type SyncedSettings = Pick<Settings, (typeof SYNCED_SETTINGS_KEYS)[number]> & {
  updatedAt: number;
};

export const DAILY_CARD_LIMIT_MIN = 5;
export const DAILY_CARD_LIMIT_MAX = 200;
const DAILY_CARD_LIMIT_FALLBACK = 20;

/* An emptied number input yields NaN or 0, which would ask the review session for no cards. */
export function clampDailyCardLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DAILY_CARD_LIMIT_FALLBACK;
  return Math.min(DAILY_CARD_LIMIT_MAX, Math.max(DAILY_CARD_LIMIT_MIN, Math.round(value)));
}

export function pickSynced(settings: Settings): SyncedSettings {
  return {
    theme: settings.theme,
    readingMode: settings.readingMode,
    reduceMotion: settings.reduceMotion,
    dailyCardLimit: settings.dailyCardLimit,
    focusTimerEnabled: settings.focusTimerEnabled,
    streakCount: settings.streakCount,
    streakLastDay: settings.streakLastDay,
    streakGraceUsed: settings.streakGraceUsed,
    updatedAt: settings.updatedAt,
  };
}

export function isSyncedSettings(value: unknown): value is SyncedSettings {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.theme === 'system' || record.theme === 'light' || record.theme === 'dark') &&
    typeof record.readingMode === 'boolean' &&
    (record.reduceMotion === 'system' || record.reduceMotion === 'always') &&
    typeof record.dailyCardLimit === 'number' &&
    typeof record.focusTimerEnabled === 'boolean' &&
    typeof record.streakCount === 'number' &&
    typeof record.streakLastDay === 'string' &&
    typeof record.streakGraceUsed === 'boolean' &&
    typeof record.updatedAt === 'number'
  );
}

/* Last write wins. Returns the same object when the remote copy is not newer, so a caller can
   compare by reference and skip a needless database write. */
export function mergeSettings(local: Settings, remote: SyncedSettings): Settings {
  /* A row written before preferences could sync has no timestamp, so anything remote is newer. */
  if (remote.updatedAt <= (local.updatedAt ?? 0)) return local;
  /* Copied key by key rather than spread: a backup file is user-supplied and may carry fields we
     never sync, which spreading would let overwrite this device's own history. */
  return {
    ...local,
    theme: remote.theme,
    readingMode: remote.readingMode,
    reduceMotion: remote.reduceMotion,
    dailyCardLimit: clampDailyCardLimit(remote.dailyCardLimit),
    focusTimerEnabled: remote.focusTimerEnabled,
    streakCount: remote.streakCount,
    streakLastDay: remote.streakLastDay,
    streakGraceUsed: remote.streakGraceUsed,
    updatedAt: remote.updatedAt,
  };
}
