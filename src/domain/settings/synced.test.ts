import { describe, expect, it } from 'vitest';
import type { Settings } from '@/domain/types';
import {
  clampDailyCardLimit,
  isSyncedSettings,
  mergeSettings,
  pickSynced,
  type SyncedSettings,
} from './synced';

const local: Settings = {
  id: 'singleton',
  theme: 'light',
  readingMode: false,
  reduceMotion: 'system',
  dailyCardLimit: 20,
  focusTimerEnabled: false,
  hasSeenLocalDataWarning: true,
  lastExportAt: 111,
  lastSyncedAt: 222,
  streakCount: 3,
  streakLastDay: '2026-07-30',
  streakGraceUsed: false,
  updatedAt: 1000,
};

const remote: SyncedSettings = {
  theme: 'dark',
  readingMode: true,
  reduceMotion: 'always',
  dailyCardLimit: 50,
  focusTimerEnabled: true,
  streakCount: 9,
  streakLastDay: '2026-07-31',
  streakGraceUsed: true,
  updatedAt: 2000,
};

describe('clampDailyCardLimit', () => {
  it('falls back when the field was emptied', () => {
    expect(clampDailyCardLimit(Number(''))).toBe(20);
    expect(clampDailyCardLimit(Number.NaN)).toBe(20);
  });

  it('holds the value inside the supported range', () => {
    expect(clampDailyCardLimit(1)).toBe(5);
    expect(clampDailyCardLimit(9999)).toBe(200);
    expect(clampDailyCardLimit(37.6)).toBe(38);
  });
});

describe('mergeSettings', () => {
  it('takes the newer remote copy', () => {
    const merged = mergeSettings(local, remote);
    expect(merged.theme).toBe('dark');
    expect(merged.streakCount).toBe(9);
    expect(merged.updatedAt).toBe(2000);
  });

  it('leaves device-local fields alone', () => {
    const merged = mergeSettings(local, remote);
    expect(merged.lastSyncedAt).toBe(222);
    expect(merged.hasSeenLocalDataWarning).toBe(true);
  });

  it('returns the same object when the remote copy is older, so no write happens', () => {
    expect(mergeSettings(local, { ...remote, updatedAt: 999 })).toBe(local);
    expect(mergeSettings(local, { ...remote, updatedAt: 1000 })).toBe(local);
  });

  it('treats a row written before sync existed as older than anything remote', () => {
    const legacy = { ...local, updatedAt: undefined } as unknown as Settings;
    expect(mergeSettings(legacy, remote).theme).toBe('dark');
  });

  it('clamps a remote limit that skipped the client check', () => {
    expect(mergeSettings(local, { ...remote, dailyCardLimit: 9999 }).dailyCardLimit).toBe(200);
  });
});

describe('pickSynced', () => {
  it('carries preferences and no device history', () => {
    const picked = pickSynced(local);
    expect(picked).not.toHaveProperty('lastSyncedAt');
    expect(picked).not.toHaveProperty('hasSeenLocalDataWarning');
    expect(picked.theme).toBe('light');
  });
});

describe('isSyncedSettings', () => {
  it('accepts a well-formed record', () => {
    expect(isSyncedSettings(remote)).toBe(true);
  });

  it('rejects anything missing or mistyped', () => {
    expect(isSyncedSettings(null)).toBe(false);
    expect(isSyncedSettings({ ...remote, theme: 'neon' })).toBe(false);
    expect(isSyncedSettings({ ...remote, dailyCardLimit: '20' })).toBe(false);
    const { updatedAt: _omitted, ...withoutUpdatedAt } = remote;
    expect(isSyncedSettings(withoutUpdatedAt)).toBe(false);
  });
});
