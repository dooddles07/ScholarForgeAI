import { useNavigate } from 'react-router';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useIsOffline } from '@/hooks/use-is-offline';
import { useSettings } from '@/hooks/use-settings';
import { relativeTime } from '@/lib/format';
import { Button } from '@/ui/components/primitives/Button';
import { settings as copy, offline as offlineCopy } from '@/copy/labels';

export function CloudSyncSection() {
  const { status, email, signIn, signOut, restoreFoundBackup, dismissFoundBackup, syncNow } =
    useCloudSync();
  const { settings } = useSettings();
  const isOffline = useIsOffline();
  const navigate = useNavigate();

  /* Every /app route is gated, so staying put after sign-out just shows the gate. Send them to
     the landing page instead. */
  async function handleSignOut() {
    await signOut();
    void navigate('/', { replace: true });
  }

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

  if (status === 'error' || status === 'offline' || status === 'tooLarge') {
    const message =
      status === 'offline'
        ? copy.syncOffline
        : status === 'tooLarge'
          ? copy.syncTooLarge
          : copy.syncError;
    return (
      <div className="p-4">
        <p
          role="alert"
          className={status === 'error' ? 'text-sm text-incorrect' : 'text-sm text-fg'}
        >
          {message}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void syncNow()}>
            {copy.syncNow}
          </Button>
          <Button variant="ghost" onClick={() => void handleSignOut()}>
            {copy.syncSignOut}
          </Button>
        </div>
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
        <Button variant="ghost" onClick={() => void handleSignOut()}>
          {copy.syncSignOut}
        </Button>
      </div>
    </div>
  );
}
