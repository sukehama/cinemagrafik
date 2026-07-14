import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
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

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0039667724",
  appId: "1:376595157576:web:9b881157e8c1f8fb183e7d",
  apiKey: "AIzaSyDxT9vEjwAwf40ld_o1ouJ5_7ltmugTxl0",
  authDomain: "gen-lang-client-0039667724.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-showmovieratingg-c5439292-da9b-40b7-a36f-c30bf21f80a5",
  storageBucket: "gen-lang-client-0039667724.firebasestorage.app",
  messagingSenderId: "376595157576",
  measurementId: "",
  oAuthClientId: "376595157576-6j22lvg0ro7b5206r67pbctlfac0vvol.apps.googleusercontent.com"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Handles signing in with Google.
 * Attempts popup first, and if blocked or in a sandboxed iframe, falls back to redirect.
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Popup blocked or failed, attempting redirect login...", error);
    // If we're in an iframe, popup might be blocked. Attempt redirect as fallback.
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/iframe-userAgent-to-be-careful' || error.message?.includes('iframe')) {
      await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
}

/**
 * Logs out the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}
