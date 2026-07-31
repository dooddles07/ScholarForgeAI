import { useEffect, useRef } from 'react';
import { mergeSettings, pickSynced, type SyncedSettings } from '@/domain/settings/synced';
import { getSettings, replaceSettings } from '@/persistence/settings';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useSettings } from '@/hooks/use-settings';

/* One write per pause, not one per keystroke in the cards-per-day field. */
const PUSH_DEBOUNCE_MS = 600;

/* Safari has no requestIdleCallback, and even where it exists a busy tab must not stall the
   listener indefinitely. */
const IDLE_TIMEOUT_MS = 2000;

async function applyRemote(remote: SyncedSettings): Promise<void> {
  const local = await getSettings();
  const merged = mergeSettings(local, remote);
  if (merged !== local) await replaceSettings(merged);
}

/* Mounted once in AppLayout. Dexie stays the source of truth and the network never sits on the
   critical path of a toggle: the local write lands first, the push follows. */
export function useSettingsSync(): void {
  const { user } = useAuthUser();
  const { settings } = useSettings();
  const uid = user?.uid ?? null;
  /* The newest value this device has agreed with the server on, so an incoming change is not
     immediately pushed back out. */
  const settledAtRef = useRef(0);

  useEffect(() => {
    if (!uid) {
      settledAtRef.current = 0;
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    /* The Firestore SDK is the largest chunk in the app and a preference arriving a second late
       costs nothing, so the listener waits until the route it was mounted on has settled. */
    const start = () =>
      void (async () => {
        const { subscribeToSettings } = await import('@/persistence/settings-sync');
        if (cancelled) return;
        unsubscribe = subscribeToSettings(uid, (remote) => {
          settledAtRef.current = Math.max(settledAtRef.current, remote.updatedAt);
          void applyRemote(remote);
        });
      })();

    const idle = window.requestIdleCallback?.(start, { timeout: IDLE_TIMEOUT_MS });
    const fallback = idle === undefined ? setTimeout(start, IDLE_TIMEOUT_MS) : undefined;

    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      clearTimeout(fallback);
      unsubscribe?.();
    };
  }, [uid]);

  useEffect(() => {
    /* 0 means the row is still the seeded default, or predates sync: nothing worth sending, and
       a legacy row without the field at all must never be pushed as undefined. */
    if (!uid || !settings.updatedAt || settings.updatedAt <= settledAtRef.current) {
      return undefined;
    }

    const timer = setTimeout(() => {
      void (async () => {
        const { pushSettings } = await import('@/persistence/settings-sync');
        const synced = pickSynced(settings);
        try {
          await pushSettings(uid, synced);
          settledAtRef.current = synced.updatedAt;
        } catch {
          /* Offline writes are queued by the persistent cache; anything else retries on the
             next change rather than blocking the UI with an error nobody can act on. */
        }
      })();
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [uid, settings]);
}
