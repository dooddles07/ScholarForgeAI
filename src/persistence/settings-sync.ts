import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firestore';
import { isSyncedSettings, type SyncedSettings } from '@/domain/settings/synced';

/* Preferences live in their own document rather than inside backups/{uid}. That document holds
   every parsed page of every upload, so a listener on it would re-download the whole corpus to
   learn that a toggle moved. */
function settingsDocRef(uid: string) {
  return doc(firestore(), 'userSettings', uid);
}

export async function pushSettings(uid: string, synced: SyncedSettings): Promise<void> {
  await setDoc(settingsDocRef(uid), synced);
}

export function subscribeToSettings(
  uid: string,
  onRemote: (remote: SyncedSettings) => void,
): () => void {
  return onSnapshot(
    settingsDocRef(uid),
    (snapshot) => {
      /* This device's own write echoing back through the local cache. Merging it would restart
         the push that produced it. */
      if (snapshot.metadata.hasPendingWrites) return;
      const data = snapshot.data();
      if (isSyncedSettings(data)) onRemote(data);
    },
    /* A dropped listener must never take the app down with it; local settings keep working. */
    () => undefined,
  );
}
