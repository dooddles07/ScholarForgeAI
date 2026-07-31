import type { Settings } from '@/domain/types';
import { clampDailyCardLimit } from '@/domain/settings/synced';
import { db, DEFAULT_SETTINGS } from './db';

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get('singleton');
  if (!row) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  /* Rows written before preferences could sync have no updatedAt. Treated as older than any
     remote copy, and filled in so the first push carries a real number rather than undefined. */
  if (typeof row.updatedAt !== 'number') {
    const filled = { ...row, updatedAt: 0 };
    await db.settings.put(filled);
    return filled;
  }
  return row;
}

/* Clamping here rather than in the component covers every writer: the settings form, the streak
   counter, and a preference arriving from another device. */
export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch, updatedAt: patch.updatedAt ?? Date.now() };
  next.dailyCardLimit = clampDailyCardLimit(next.dailyCardLimit);
  await db.settings.put(next);
  return next;
}

/* Applying a remote copy keeps its own updatedAt, otherwise the merge would look newer than the
   device it came from and bounce straight back. */
export async function replaceSettings(next: Settings): Promise<void> {
  await db.settings.put(next);
}
