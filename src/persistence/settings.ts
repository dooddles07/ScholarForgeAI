import type { Settings } from '@/domain/types';
import { db, DEFAULT_SETTINGS } from './db';

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get('singleton');
  if (row) return row;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.settings.put(next);
  return next;
}
