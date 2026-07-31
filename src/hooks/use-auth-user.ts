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
   Firebase subscription instead of each mounting its own. */
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
      const [{ firebaseAuth }, { onAuthStateChanged }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
      ]);
      const auth = firebaseAuth();

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

/* Popup, not redirect: the redirect flow hands the session off through Firebase's cross-site
   authDomain, which Chrome/Safari/Firefox now block as third-party storage, silently bouncing the
   user back to the sign-in screen. A popup opened from this button's own click is a user gesture,
   so popup blockers leave it alone. */
export async function signInWithGoogle(): Promise<void> {
  const [{ firebaseAuth, googleProvider }, { signInWithPopup }] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/auth'),
  ]);
  await signInWithPopup(firebaseAuth(), googleProvider);
}

export async function signOutOfGoogle(): Promise<void> {
  const [{ firebaseAuth }, { signOut }] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/auth'),
  ]);
  await signOut(firebaseAuth());
}
