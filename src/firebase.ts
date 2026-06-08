import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "sge-sesi");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const registerUserOnSecondaryApp = async (email: string, password: string) => {
  const appName = `SecondaryApp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return userCredential.user;
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      console.error("Error deleting secondary app:", e);
    }
  }
};
