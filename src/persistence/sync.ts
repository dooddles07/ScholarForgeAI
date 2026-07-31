import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firestore';
import { isBackupPayload, type BackupPayload } from '@/domain/export/backup';

function backupDocRef(uid: string) {
  return doc(firestore(), 'backups', uid);
}

export async function pushBackupToCloud(uid: string, payload: BackupPayload): Promise<void> {
  await setDoc(backupDocRef(uid), payload);
}

export async function pullBackupFromCloud(uid: string): Promise<BackupPayload | null> {
  const snapshot = await getDoc(backupDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return isBackupPayload(data) ? data : null;
}
