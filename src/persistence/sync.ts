import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firestore';
import { isBackupPayload, type BackupPayload } from '@/domain/export/backup';

/* Firestore rejects any document over 1 MB. Leave room for the field-name overhead its own
   encoding adds on top of the JSON we measure. */
const MAX_BACKUP_BYTES = 900_000;

export class BackupTooLargeError extends Error {
  constructor() {
    super('Backup exceeds the per-document limit');
    this.name = 'BackupTooLargeError';
  }
}

function backupDocRef(uid: string) {
  return doc(firestore(), 'backups', uid);
}

export async function pushBackupToCloud(uid: string, payload: BackupPayload): Promise<void> {
  /* Checked here rather than left to Firestore, whose rejection reads as a generic write
     failure and gives the user nothing to act on. */
  const size = new Blob([JSON.stringify(payload)]).size;
  if (size > MAX_BACKUP_BYTES) throw new BackupTooLargeError();
  await setDoc(backupDocRef(uid), payload);
}

export async function pullBackupFromCloud(uid: string): Promise<BackupPayload | null> {
  const snapshot = await getDoc(backupDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return isBackupPayload(data) ? data : null;
}
