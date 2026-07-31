import { useCallback, useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup } from '@/persistence/backup';
import { updateSettings } from '@/persistence/settings';
import type { BackupPayload } from '@/domain/export/backup';

export type CloudSyncStatus =
  | 'loading'
  | 'signedOut'
  | 'checkingBackup'
  | 'backupFound'
  | 'signedIn'
  | 'syncing'
  | 'error';

/*
 * Every Firebase import below is dynamic, including inside the effect: Settings is a route many
 * visitors open without ever touching sync, and this keeps the SDK out of that page's chunk
 * until this hook actually runs (see Task 1's note on bundle isolation).
 */
export function useCloudSync() {
  const [status, setStatus] = useState<CloudSyncStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const foundBackupRef = useRef<BackupPayload | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const [{ firebaseAuth }, { onAuthStateChanged, getRedirectResult }] = await Promise.all([
          import('@/lib/firebase'),
          import('firebase/auth'),
        ]);
        if (cancelled) return;

        const auth = firebaseAuth();

        /*
         * Required to complete a signInWithRedirect flow: without this call, a failed redirect
         * (e.g. third-party storage blocked between this origin and the authDomain) fails silently
         * and onAuthStateChanged never fires, leaving the UI stuck on signedOut with no error.
         */
        try {
          await getRedirectResult(auth);
        } catch (redirectError) {
          if (cancelled) return;
          console.error('[cloud-sync] redirect sign-in failed', redirectError);
        }

        if (cancelled) return;

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) {
            uidRef.current = null;
            setEmail(null);
            setStatus('signedOut');
            return;
          }

          uidRef.current = user.uid;
          setEmail(user.email);
          setStatus('checkingBackup');

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
        });
      } catch {
        if (cancelled) return;
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      const [{ firebaseAuth, googleProvider }, { signInWithRedirect }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
      ]);
      await signInWithRedirect(firebaseAuth(), googleProvider);
    } catch {
      setStatus('error');
    }
  }, []);

  const signOut = useCallback(async () => {
    const [{ firebaseAuth }, { signOut: firebaseSignOut }] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
    ]);
    await firebaseSignOut(firebaseAuth());
  }, []);

  const restoreFoundBackup = useCallback(async () => {
    if (!foundBackupRef.current) return;
    try {
      await importBackup(foundBackupRef.current);
      foundBackupRef.current = null;
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
    setStatus('syncing');
    try {
      const { pushBackupToCloud } = await import('@/persistence/sync');
      const payload = await exportBackup();
      await pushBackupToCloud(uid, payload);
      await updateSettings({ lastSyncedAt: Date.now() });
      setStatus('signedIn');
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow };
}
