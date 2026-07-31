import type { Settings } from '@/domain/types';
import { clampDailyCardLimit } from '@/domain/settings/synced';
import { db, DEFAULT_SETTINGS } from './db';

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get('singleton');
  if (row) return row;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
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
