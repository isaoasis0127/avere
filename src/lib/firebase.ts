import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** 環境変数が未設定の場合（初回ビルドなど）は Firebase を呼ばない */
export const isFirebaseConfigured = Boolean(config.projectId && config.apiKey);

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

export function db(): Firestore {
  return getFirestore(app());
}

/** ブラウザ専用 */
export function auth(): Auth {
  return getAuth(app());
}
