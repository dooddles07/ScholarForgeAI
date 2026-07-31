import { useEffect, useState } from 'react';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useSettings } from '@/hooks/use-settings';
import { relativeTime } from '@/lib/format';
import { Button } from '@/ui/components/primitives/Button';
import { settings as copy, offline as offlineCopy } from '@/copy/labels';

/* Same navigator.onLine + online/offline event pattern as OfflineBanner.tsx. */
function useIsOffline() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return isOffline;
}

export function CloudSyncSection() {
  const { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow } =
    useCloudSync();
  const { settings } = useSettings();
  const isOffline = useIsOffline();

  if (status === 'loading') return null;

  if (status === 'signedOut') {
    return (
      <div className="p-4">
        <p className="max-w-[62ch] text-sm text-fg-muted">{copy.syncIntro}</p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => void signIn()}
          disabled={isOffline}
          title={isOffline ? offlineCopy.disabledAction : undefined}
        >
          {copy.signInWithGoogle}
        </Button>
        {isOffline && <p className="mt-2 text-sm text-fg-muted">{offlineCopy.banner}</p>}
      </div>
    );
  }

  if (status === 'checkingBackup') {
    return (
      <div className="p-4">
        <p className="text-sm text-fg-muted">{copy.syncChecking}</p>
      </div>
    );
  }

  if (status === 'backupFound') {
    return (
      <div className="p-4">
        <p className="text-sm text-fg">{copy.syncBackupFound}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void restoreFoundBackup()}>{copy.syncRestore}</Button>
          <Button variant="secondary" onClick={dismissFoundBackup}>
            {copy.syncSkip}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-incorrect">
          {copy.syncError}
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => void syncNow()}>
          {copy.syncNow}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm text-fg">{copy.syncSignedInAs(email ?? '')}</p>
      {settings.lastSyncedAt && (
        <p className="mt-1 text-sm text-fg-muted">
          {copy.syncLastSynced(relativeTime(settings.lastSyncedAt))}
        </p>
      )}
      {isOffline && <p className="mt-1 text-sm text-fg-muted">{offlineCopy.banner}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => void syncNow()}
          disabled={status === 'syncing' || isOffline}
          title={isOffline ? offlineCopy.disabledAction : undefined}
        >
          {status === 'syncing' ? copy.syncing : copy.syncNow}
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          {copy.syncSignOut}
        </Button>
      </div>
    </div>
  );
}
