import { useEffect, useState } from 'react';

export interface StorageEstimate {
  usedBytes: number;
  percentUsed: number;
  isPersisted: boolean;
}

/* Asking for persistent storage stops the browser treating the study database as evictable
   cache. Chrome grants it silently for an installed or frequently used site; Safari private
   windows refuse outright, which is why nothing here throws. */
async function readEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const isPersisted = (await navigator.storage.persisted?.()) ?? false;
    const granted = isPersisted || ((await navigator.storage.persist?.()) ?? false);
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota === 0) return null;
    return {
      usedBytes: usage,
      percentUsed: Math.min(100, Math.round((usage / quota) * 100)),
      isPersisted: granted,
    };
  } catch {
    return null;
  }
}

export function useStorageEstimate(): StorageEstimate | null | undefined {
  const [estimate, setEstimate] = useState<StorageEstimate | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void readEstimate().then((result) => {
      if (!cancelled) setEstimate(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return estimate;
}
