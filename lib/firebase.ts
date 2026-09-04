import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase client configuration is intentionally read from public build-time
 * variables. These values identify the web app; Firebase Authentication still
 * enforces the enabled providers and authorized domains in the Firebase
 * console. Keeping them in env vars lets the same source build locally and in
 * GitHub Actions without committing a project-specific configuration.
 */
const buildEnv =
  (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env ?? {};

const firebaseConfig = {
  apiKey: buildEnv.VITE_FIREBASE_API_KEY ?? '',
  authDomain: buildEnv.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: buildEnv.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: buildEnv.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: buildEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: buildEnv.VITE_FIREBASE_APP_ID ?? '',
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;

if (firebaseAuth) {
  firebaseAuth.languageCode = 'it';
}
