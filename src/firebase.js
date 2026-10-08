import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'fueldrive-14ec8';
const useEmulator = process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true';
const emulatorHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || '127.0.0.1';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:1234567890:web:demo'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (useEmulator) {
  const authPort = Number(process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_PORT || 9099);
  const firestorePort = Number(process.env.REACT_APP_FIREBASE_FIRESTORE_EMULATOR_PORT || 8080);
  const storagePort = Number(process.env.REACT_APP_FIREBASE_STORAGE_EMULATOR_PORT || 9199);

  connectAuthEmulator(auth, `http://${emulatorHost}:${authPort}`);
  connectFirestoreEmulator(db, emulatorHost, firestorePort);
  connectStorageEmulator(storage, emulatorHost, storagePort);
}

export default app;
