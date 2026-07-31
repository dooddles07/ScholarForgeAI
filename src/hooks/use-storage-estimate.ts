import { useEffect, useState } from 'react';

export interface StorageEstimate {
  usedBytes: number;
  percentUsed: number;
  isPersisted: boolean;
}

/* Persistent storage stops the browser treating the study database as evictable cache. Chrome
   decides silently, but Firefox shows a permission prompt, so the request is made once per
   device and never again — hence the caller-supplied gate rather than a check on every mount. */
async function readEstimate(mayRequest: boolean): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    let isPersisted = (await navigator.storage.persisted?.()) ?? false;
    if (!isPersisted && mayRequest) {
      isPersisted = (await navigator.storage.persist?.()) ?? false;
    }
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota === 0) return null;
    return {
      usedBytes: usage,
      percentUsed: Math.min(100, Math.round((usage / quota) * 100)),
      isPersisted,
    };
  } catch {
    return null;
  }
}

/* undefined while reading, null when the browser will not say (Safari private windows). */
export function useStorageEstimate(
  mayRequestPersistence: boolean,
  onRequested: () => void,
): StorageEstimate | null | undefined {
  const [estimate, setEstimate] = useState<StorageEstimate | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void readEstimate(mayRequestPersistence).then((result) => {
      if (cancelled) return;
      setEstimate(result);
      if (mayRequestPersistence) onRequested();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- asked once per mount, not per callback identity
  }, [mayRequestPersistence]);

  return estimate;
}
