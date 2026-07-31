import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_VERSION, type BackupPayload } from '@/domain/export/backup';
import { db, DEFAULT_SETTINGS } from './db';
import { exportBackup, importBackup } from './backup';
import { getSettings, updateSettings } from './settings';

function emptyPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: BACKUP_VERSION,
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
    ...overrides,
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('exportBackup', () => {
  it('carries preferences so a restore on another device is not all defaults', async () => {
    await updateSettings({ theme: 'light', dailyCardLimit: 45, streakCount: 6 });
    const payload = await exportBackup();
    expect(payload.settings?.theme).toBe('light');
    expect(payload.settings?.dailyCardLimit).toBe(45);
    expect(payload.settings?.streakCount).toBe(6);
  });

  /* A backup file gets shared and moved between machines. Anything describing the browser that
     made it would be wrong everywhere else. */
  it('leaves device-local fields out of the file', async () => {
    await updateSettings({ lastSyncedAt: 999, hasSeenLocalDataWarning: true });
    const payload = await exportBackup();
    expect(payload.settings).not.toHaveProperty('lastSyncedAt');
    expect(payload.settings).not.toHaveProperty('hasSeenLocalDataWarning');
  });
});

describe('importBackup', () => {
  it('applies preferences from a newer file', async () => {
    await updateSettings({ theme: 'light', updatedAt: 100 });
    await importBackup(
      emptyPayload({
        settings: { ...DEFAULT_SETTINGS, theme: 'dark', updatedAt: 200 },
      }),
    );
    expect((await getSettings()).theme).toBe('dark');
  });

  /* Restoring an old file must not roll back a preference set more recently on this device. */
  it('keeps the local copy when the file is older', async () => {
    await updateSettings({ theme: 'light', updatedAt: 300 });
    await importBackup(
      emptyPayload({
        settings: { ...DEFAULT_SETTINGS, theme: 'dark', updatedAt: 200 },
      }),
    );
    expect((await getSettings()).theme).toBe('light');
  });

  it('imports a v1 file that predates synced settings without touching preferences', async () => {
    await updateSettings({ theme: 'light', updatedAt: 100 });
    await importBackup({ ...emptyPayload(), version: 1 });
    expect((await getSettings()).theme).toBe('light');
  });

  it('leaves device-local fields alone when applying a file', async () => {
    await updateSettings({ lastSyncedAt: 555, updatedAt: 100 });
    await importBackup(
      emptyPayload({ settings: { ...DEFAULT_SETTINGS, theme: 'dark', updatedAt: 200 } }),
    );
    const settings = await getSettings();
    expect(settings.lastSyncedAt).toBe(555);
    expect(settings.theme).toBe('dark');
  });
});
