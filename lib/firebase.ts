import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const auth: Auth = typeof window !== 'undefined' ? getAuth(getFirebaseApp()) : ({} as Auth);
export const db: Firestore = typeof window !== 'undefined' ? getFirestore(getFirebaseApp()) : ({} as Firestore);
export const storage: FirebaseStorage = typeof window !== 'undefined' ? getStorage(getFirebaseApp()) : ({} as FirebaseStorage);
export default typeof window !== 'undefined' ? getFirebaseApp() : ({} as FirebaseApp);
