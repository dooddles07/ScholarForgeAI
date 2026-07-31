import { useCallback, useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup } from '@/persistence/backup';
import { updateSettings } from '@/persistence/settings';
import { useAuthUser, signInWithGoogle, signOutOfGoogle } from '@/hooks/use-auth-user';
import type { BackupPayload } from '@/domain/export/backup';

export type CloudSyncStatus =
  | 'loading'
  | 'signedOut'
  | 'checkingBackup'
  | 'backupFound'
  | 'signedIn'
  | 'syncing'
  | 'offline'
  | 'tooLarge'
  | 'error';

export function useCloudSync() {
  const { status: authStatus, user } = useAuthUser();
  const [status, setStatus] = useState<CloudSyncStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const foundBackupRef = useRef<BackupPayload | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authStatus === 'loading') {
      setStatus('loading');
      return;
    }

    if (!user) {
      uidRef.current = null;
      setEmail(null);
      setStatus('signedOut');
      return;
    }

    uidRef.current = user.uid;
    setEmail(user.email);
    setStatus('checkingBackup');

    let cancelled = false;

    void (async () => {
      try {
        const { pullBackupFromCloud } = await import('@/persistence/sync');
        const backup = await pullBackupFromCloud(user.uid);
        if (cancelled) return;
        if (backup) {
          foundBackupRef.current = backup;
          setStatus('backupFound');
        } else {
          setStatus('signedIn');
        }
      } catch {
        if (cancelled) return;
        setStatus('signedIn');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only on identity change, not email
  }, [authStatus, user?.uid]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch {
      setStatus('error');
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutOfGoogle();
  }, []);

  const restoreFoundBackup = useCallback(async () => {
    if (!foundBackupRef.current) return;
    try {
      await importBackup(foundBackupRef.current);
      foundBackupRef.current = null;
      await updateSettings({ lastSyncedAt: Date.now() });
      setStatus('signedIn');
    } catch {
      setStatus('error');
    }
  }, []);

  const dismissFoundBackup = useCallback(() => {
    foundBackupRef.current = null;
    setStatus('signedIn');
  }, []);

  const syncNow = useCallback(async () => {
    const uid = uidRef.current;
    if (!uid) return;
    /* Checked here as well as on the button: the flag can go stale between render and click,
       and "you are offline" is a different problem from "sync failed". */
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    try {
      const { pushBackupToCloud, BackupTooLargeError } = await import('@/persistence/sync');
      const payload = await exportBackup();
      try {
        await pushBackupToCloud(uid, payload);
      } catch (error) {
        if (error instanceof BackupTooLargeError) {
          setStatus('tooLarge');
          return;
        }
        throw error;
      }
      await updateSettings({ lastSyncedAt: Date.now() });
      setStatus('signedIn');
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow };
}
