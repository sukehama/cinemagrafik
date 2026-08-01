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
import firebaseConfig from '../firebase-applet-config.json';

// Inicijalizacija Firebase-a
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle(): Promise<User | null> {
  try {
    // 1. Ključno: Osiguravamo da preglednik/Tauri trajno zapamti login
    await setPersistence(auth, browserLocalPersistence);
    
    // 2. Isključivo koristimo Popup, bez Redirecta koji lomi Tauri desktop
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Greška pri prijavi:", error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      throw error;
    }
    throw error;
  }
}

// Ostavljamo praznu funkciju da ne moramo mijenjati App.tsx
export async function checkRedirectResult(): Promise<User | null> {
  return null; 
}

export async function logout(): Promise<void> {
  await signOut(auth);
}