import { beforeEach, describe, expect, it } from 'vitest';
import type { Settings } from '@/domain/types';
import { db, DEFAULT_SETTINGS } from './db';
import { getSettings, replaceSettings, updateSettings } from './settings';

beforeEach(async () => {
  await db.settings.clear();
});

describe('getSettings', () => {
  it('seeds the defaults on a browser that has never stored settings', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await db.settings.get('singleton')).toEqual(DEFAULT_SETTINGS);
  });

  /* A row written before preferences could sync has no updatedAt. Left as undefined it would be
     pushed to Firestore, where the rules require an integer, and rejected silently. */
  it('backfills updatedAt on a row written before sync existed', async () => {
    const legacy = { ...DEFAULT_SETTINGS, theme: 'dark' as const };
    delete (legacy as Partial<Settings>).updatedAt;
    await db.settings.put(legacy as Settings);

    const settings = await getSettings();
    expect(settings.updatedAt).toBe(0);
    expect(settings.theme).toBe('dark');
    expect((await db.settings.get('singleton'))?.updatedAt).toBe(0);
  });
});

describe('updateSettings', () => {
  it('stamps updatedAt so a later write can be ordered against a remote copy', async () => {
    const before = Date.now();
    const next = await updateSettings({ theme: 'light' });
    expect(next.updatedAt).toBeGreaterThanOrEqual(before);
  });

  /* Clamping lives here rather than in the form so every writer is covered, including a value
     arriving from another device. */
  it('clamps a daily card limit that would break the review session', async () => {
    expect((await updateSettings({ dailyCardLimit: Number('') })).dailyCardLimit).toBe(20);
    expect((await updateSettings({ dailyCardLimit: 1 })).dailyCardLimit).toBe(5);
    expect((await updateSettings({ dailyCardLimit: 9999 })).dailyCardLimit).toBe(200);
  });

  it('leaves untouched fields alone', async () => {
    await updateSettings({ dailyCardLimit: 40 });
    const next = await updateSettings({ theme: 'dark' });
    expect(next.dailyCardLimit).toBe(40);
    expect(next.theme).toBe('dark');
  });

  it('honours an explicit updatedAt, so applying a remote value does not look newer than its source', async () => {
    expect((await updateSettings({ theme: 'dark', updatedAt: 500 })).updatedAt).toBe(500);
  });
});

describe('replaceSettings', () => {
  it('writes the row verbatim without re-stamping updatedAt', async () => {
    await replaceSettings({ ...DEFAULT_SETTINGS, theme: 'light', updatedAt: 777 });
    const stored = await db.settings.get('singleton');
    expect(stored?.updatedAt).toBe(777);
    expect(stored?.theme).toBe('light');
  });
});
