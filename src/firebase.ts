import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
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
 * Log in with Email & Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return res.user;
}

/**
 * Register with Email, Password & Display Name
 */
export async function registerWithEmail(email: string, pass: string, name: string): Promise<User> {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  if (name.trim()) {
    await updateProfile(res.user, { displayName: name.trim() });
  }
  return res.user;
}

/**
 * Reset password via standard Email link
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Confirms password reset with oobCode from URL
 */
export async function completePasswordReset(oobCode: string, newPass: string): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newPass);
}

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
