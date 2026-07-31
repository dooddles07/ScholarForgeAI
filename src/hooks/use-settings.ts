import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Settings } from '@/domain/types';
import { db, DEFAULT_SETTINGS } from '@/persistence/db';
import { getSettings, updateSettings } from '@/persistence/settings';

/*
 * The live query is read-only. Dexie runs it inside a read transaction, so seeding the default
 * row has to happen outside it or the observation throws.
 */
export function useSettings() {
  const stored = useLiveQuery(() => db.settings.get('singleton'), [], undefined);

  /* getSettings both seeds the row and backfills updatedAt on one written before sync existed. */
  useEffect(() => {
    void getSettings();
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
    /* 'system' is stored rather than cleared: an absent key is indistinguishable from a first
       visit, which is what used to make the pre-paint script guess dark. */
    localStorage.setItem('sf-theme', settings.theme);
    if (settings.theme !== 'system') return undefined;
    prefersDark.addEventListener('change', apply);
    return () => prefersDark.removeEventListener('change', apply);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.reading = settings.readingMode ? 'on' : 'off';
  }, [settings.readingMode]);

  /* 'system' leaves it to the prefers-reduced-motion media query in globals.css. */
  useEffect(() => {
    document.documentElement.dataset.motion =
      settings.reduceMotion === 'always' ? 'reduce' : 'system';
  }, [settings.reduceMotion]);
}
