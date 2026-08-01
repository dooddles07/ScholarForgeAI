import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/* App init and Auth only. Firestore lives in ./firestore.ts so that signing in — which every
   visitor must do — doesn't also pull down the Firestore SDK, which only cloud sync needs.
   Only ever reached via dynamic import() to keep Firebase out of the marketing bundle; these
   config values are Firebase's public client identifiers, not secrets like GROQ_API_KEY. */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;

/* Named up front rather than left to Firebase's opaque runtime failure at first sign-in. */
function assertConfigured(): void {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing environment variables: ${missing.join(', ')}`,
    );
  }
}

/* Exported so ./firestore.ts reuses this one instance — calling initializeApp twice throws. */
export function firebaseApp(): FirebaseApp {
  if (!app) {
    assertConfigured();
    app = initializeApp(config);
  }
  return app;
}

let auth: Auth | undefined;

/* The emulator host is only ever set by the accessibility audit's CI job. Unset everywhere else,
   including every real build, so there is no path from a deployed bundle to a fake auth server. */
export function firebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(firebaseApp());
    const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost) connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
  }
  return auth;
}

export const googleProvider = new GoogleAuthProvider();
