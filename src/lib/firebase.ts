import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/*
 * This file is only ever reached via a dynamic import() from src/hooks/use-cloud-sync.ts, never
 * a static import — that keeps the whole Firebase SDK out of the app's main bundle for the
 * majority of visitors who never open Settings' sync section.
 *
 * The config values below are Firebase's public client identifiers, not secrets: Firebase's own
 * security model expects them to be visible in the bundle and enforces access control via
 * Firestore's security rules instead (see firestore.rules). This is a different trust model from
 * GEMINI_API_KEY, which must never appear in any client bundle.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;

function firebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export function firestore(): Firestore {
  return getFirestore(firebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
