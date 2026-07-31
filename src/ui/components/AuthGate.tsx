import { useState, type ReactNode } from 'react';
import { useAuthUser, signInWithGoogle } from '@/hooks/use-auth-user';
import { Button } from '@/ui/components/primitives/Button';
import { RouteFallback } from '@/ui/components/RouteFallback';
import { authGate as copy } from '@/copy/labels';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useAuthUser();
  const [signInFailed, setSignInFailed] = useState(false);

  if (status === 'loading') return <RouteFallback />;

  if (status === 'signedOut') {
    async function handleSignIn() {
      setSignInFailed(false);
      try {
        await signInWithGoogle();
      } catch {
        setSignInFailed(true);
      }
    }

    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-fg">{copy.heading}</h1>
          <p className="mt-2 text-sm text-fg-muted">{copy.body}</p>
          <Button className="mt-5" onClick={() => void handleSignIn()}>
            {copy.signIn}
          </Button>
          {signInFailed && (
            <p role="alert" className="mt-3 text-sm text-incorrect">
              {copy.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
