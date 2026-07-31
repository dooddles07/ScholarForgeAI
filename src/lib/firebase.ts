import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

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

/* Exported so ./firestore.ts reuses this one instance — calling initializeApp twice throws. */
export function firebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
