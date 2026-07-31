import { useEffect, useState } from 'react';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

/* Module-level singleton: every useAuthUser() call site (AuthGate, useCloudSync, ...) shares one
   Firebase subscription and one getRedirectResult() call instead of each mounting its own. */
let sharedState: AuthState = { status: 'loading', user: null };
const listeners = new Set<(state: AuthState) => void>();
let initStarted = false;

function setSharedState(next: AuthState): void {
  sharedState = next;
  for (const listener of listeners) listener(next);
}

function ensureInitialized(): void {
  if (initStarted) return;
  initStarted = true;

  void (async () => {
    try {
      const [{ firebaseAuth }, { onAuthStateChanged, getRedirectResult }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
      ]);
      const auth = firebaseAuth();

      /*
       * Required to complete a signInWithRedirect flow: without this call, a failed redirect
       * (e.g. third-party storage blocked between this origin and the authDomain) fails silently
       * and onAuthStateChanged never fires, leaving the UI stuck signed-out with no error.
       */
      try {
        await getRedirectResult(auth);
      } catch (redirectError) {
        console.error('[auth] redirect sign-in failed', redirectError);
      }

      onAuthStateChanged(auth, (firebaseUser) => {
        setSharedState(
          firebaseUser
            ? { status: 'signedIn', user: { uid: firebaseUser.uid, email: firebaseUser.email } }
            : { status: 'signedOut', user: null },
        );
      });
    } catch {
      setSharedState({ status: 'signedOut', user: null });
    }
  })();
}

export function useAuthUser(): { status: AuthStatus; user: AuthUser | null } {
  const [state, setState] = useState(sharedState);

  useEffect(() => {
    listeners.add(setState);
    ensureInitialized();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
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
