import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Koristimo redirect umjesto popup-a da spričamo auth/popup-blocked grešku u Tauri/desktop okruženju.
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, googleProvider);
    return null;
  } catch (error: any) {
    console.error("Greška pri pokretanju Google prijave:", error);
    throw error;
  }
}

/**
 * Hvata rezultat nakon što se redirect završi i vrati korisnika na aplikaciju.
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return result.user;
    }
    return null;
  } catch (err) {
    console.error("Greška pri obradi redirect rezultata prijave:", err);
    return null;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}