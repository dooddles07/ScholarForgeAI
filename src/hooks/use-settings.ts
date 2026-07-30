import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Settings } from '@/domain/types';
import { db, DEFAULT_SETTINGS } from '@/persistence/db';
import { updateSettings } from '@/persistence/settings';

/*
 * The live query is read-only. Dexie runs it inside a read transaction, so seeding the default
 * row has to happen outside it or the observation throws.
 */
export function useSettings() {
  const stored = useLiveQuery(() => db.settings.get('singleton'), [], undefined);

  useEffect(() => {
    void db.settings.get('singleton').then((row) => {
      if (!row) void db.settings.put(DEFAULT_SETTINGS);
    });
  }, []);

  const update = useCallback(async (patch: Partial<Omit<Settings, 'id'>>) => {
    await updateSettings(patch);
  }, []);

  return { settings: stored ?? DEFAULT_SETTINGS, update };
}

/*
 * Theme and reading mode are attributes on the root element. The inline script in index.html
 * sets theme before first paint; this keeps it in step once the app has loaded.
 */
export function useAppearance() {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = settings.theme === 'system' ? prefersDark.matches : settings.theme === 'dark';
      root.dataset.theme = dark ? 'dark' : 'light';
    };

    apply();
    if (settings.theme === 'system') {
      localStorage.removeItem('sf-theme');
      prefersDark.addEventListener('change', apply);
      return () => prefersDark.removeEventListener('change', apply);
    }
    localStorage.setItem('sf-theme', settings.theme);
    return undefined;
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.reading = settings.readingMode ? 'on' : 'off';
  }, [settings.readingMode]);
}
