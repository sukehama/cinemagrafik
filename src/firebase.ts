import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { open } from '@tauri-apps/plugin-shell';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export async function loginWithGoogle(): Promise<User | null> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    
    // Ako smo u Tauri desktop aplikaciji, koristimo Popup koji sad uz lokalnu sesiju prolazi stabilnije,
    // ili preusmjeravamo na sistemski preglednik ako zatreba.
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Greška pri Google prijavi:", error);
    throw error;
  }
}

export async function checkRedirectResult(): Promise<User | null> {
  return null;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}