import { useEffect, useState } from 'react';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface AuthUser {
  uid: string;
  email: string | null;
}

/*
 * Every Firebase import below is dynamic: this hook backs the app-wide sign-in gate
 * (src/ui/components/AuthGate.tsx), so it must stay out of the marketing page's bundle and only
 * load once a visitor actually enters /app/*.
 */
export function useAuthUser(): { status: AuthStatus; user: AuthUser | null } {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

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
         * and onAuthStateChanged never fires, leaving the UI stuck signed-out with no error.
         */
        try {
          await getRedirectResult(auth);
        } catch (redirectError) {
          if (cancelled) return;
          console.error('[auth] redirect sign-in failed', redirectError);
        }

        if (cancelled) return;

        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (!firebaseUser) {
            setUser(null);
            setStatus('signedOut');
            return;
          }
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
          setStatus('signedIn');
        });
      } catch {
        if (cancelled) return;
        setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { status, user };
}

export async function signInWithGoogle(): Promise<void> {
  const [{ firebaseAuth, googleProvider }, { signInWithRedirect }] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/auth'),
  ]);
  await signInWithRedirect(firebaseAuth(), googleProvider);
}

export async function signOutOfGoogle(): Promise<void> {
  const [{ firebaseAuth }, { signOut }] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/auth'),
  ]);
  await signOut(firebaseAuth());
}
