// Firebase Configuration — Nova AI
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAqfObAGVH1QtDAtW8etOp3SOjGTB06pRQ",
  authDomain: "medlinkai-2791a.firebaseapp.com",
  databaseURL: "https://medlinkai-2791a-default-rtdb.firebaseio.com",
  projectId: "medlinkai-2791a",
  storageBucket: "medlinkai-2791a.firebasestorage.app",
  messagingSenderId: "252809743785",
  appId: "1:252809743785:web:ebe2cee2e228727b6d88b8",
  measurementId: "G-LRVVE0EWV6"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore (structured data: conversations, user profile, images)
export const db = getFirestore(app);

// Realtime Database (live JSON tree: active session data)
export const rtdb = getDatabase(app);

// Analytics (optional — only in browser, not Electron main process)
export const initAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export default app;
