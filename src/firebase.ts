import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot,
  writeBatch,
  query,
  where,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore with explicit databaseId
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Handles signing in with Google.
 * Attempts popup first, and if blocked or in a sandboxed iframe, falls back to redirect.
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Popup blocked or failed, attempting redirect login...", error);
    // If popup is closed by user or cancelled intentionally, don't trigger redirect
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      throw error;
    }
    // For popup blocked or iframe security restriction, fallback to redirect
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/iframe-userAgent-to-be-careful' || 
      error.message?.includes('iframe') ||
      error.message?.includes('popup')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/**
 * Checks for login redirect results when returning to app.
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    console.error("Error processing login redirect result:", err);
    return null;
  }
}

/**
 * Logs out the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}
