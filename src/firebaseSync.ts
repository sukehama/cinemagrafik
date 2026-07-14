import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  getDocs,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { RatingEntry } from './types';

export interface ContributionLog {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl: string;
  actionType: 'add' | 'edit' | 'delete' | 'rating' | 'review';
  entryName: string;
  details: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  lastActive: string;
  contributionsCount: number;
}

/**
 * Syncs entries from Firestore in real-time.
 * If Firestore is empty and localEntries has data, migrates localEntries to Firestore.
 */
export function syncFirestoreEntries(
  localEntries: RatingEntry[],
  onSync: (entries: RatingEntry[]) => void,
  onSyncStateChange: (syncing: boolean, error?: string) => void
): () => void {
  onSyncStateChange(true);
  
  const entriesCol = collection(db, 'entries');
  
  // Real-time listener
  const unsubscribe = onSnapshot(entriesCol, async (snapshot) => {
    try {
      if (snapshot.empty) {
        // Firestore is empty. If we have local entries, migrate them!
        if (localEntries.length > 0) {
          console.log(`[Firebase Sync] Firestore is empty. Migrating ${localEntries.length} local entries...`);
          const batch = writeBatch(db);
          localEntries.forEach((entry) => {
            const docRef = doc(db, 'entries', entry.id);
            batch.set(docRef, entry);
          });
          await batch.commit();
          console.log('[Firebase Sync] Migration completed successfully.');
          onSync(localEntries);
        } else {
          onSync([]);
        }
      } else {
        // Firestore has data, load it as the universal source of truth
        const firestoreEntries: RatingEntry[] = [];
        snapshot.forEach((doc) => {
          firestoreEntries.push(doc.data() as RatingEntry);
        });
        onSync(firestoreEntries);
      }
      onSyncStateChange(false);
    } catch (err: any) {
      console.error('[Firebase Sync] Error in snapshot processing:', err);
      onSyncStateChange(false, err.message);
    }
  }, (err) => {
    console.error('[Firebase Sync] Real-time subscription error:', err);
    onSyncStateChange(false, err.message);
  });

  return unsubscribe;
}

/**
 * Saves or updates a rating entry in Firestore.
 * Optionally logs a contribution if user details are provided.
 */
export async function saveEntryToFirestore(
  entry: RatingEntry,
  actionType: 'add' | 'edit',
  userId?: string,
  userName?: string,
  userPhotoUrl?: string
): Promise<void> {
  const docRef = doc(db, 'entries', entry.id);
  await setDoc(docRef, entry);

  if (userId && userName) {
    await logContribution({
      userId,
      userName,
      userPhotoUrl: userPhotoUrl || '',
      actionType,
      entryName: entry.name,
      details: actionType === 'add' ? 'Dodao novi naslov u katalog' : 'Izmijenio detalje naslova',
    });
  }
}

/**
 * Deletes a rating entry from Firestore.
 * Optionally logs a contribution.
 */
export async function deleteEntryFromFirestore(
  entryId: string,
  entryName: string,
  userId?: string,
  userName?: string,
  userPhotoUrl?: string
): Promise<void> {
  const docRef = doc(db, 'entries', entryId);
  await deleteDoc(docRef);

  if (userId && userName) {
    await logContribution({
      userId,
      userName,
      userPhotoUrl: userPhotoUrl || '',
      actionType: 'delete',
      entryName,
      details: 'Obrisao naslov iz kataloga',
    });
  }
}

/**
 * Logs a contribution to the global activity feed and updates user contribution count.
 */
export async function logContribution(params: {
  userId: string;
  userName: string;
  userPhotoUrl: string;
  actionType: 'add' | 'edit' | 'delete' | 'rating' | 'review';
  entryName: string;
  details: string;
}): Promise<void> {
  try {
    const contribsCol = collection(db, 'contributions');
    const timestamp = new Date().toISOString();
    
    // 1. Add contribution log document
    await addDoc(contribsCol, {
      ...params,
      timestamp,
    });

    // 2. Increment user contribution count
    const userRef = doc(db, 'users', params.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        contributionsCount: increment(1),
        lastActive: timestamp,
      });
    }
  } catch (err) {
    console.error('[Firebase Sync] Failed to log contribution:', err);
  }
}

/**
 * Syncs or creates user profile in Firestore upon successful Google Login.
 */
export async function syncUserProfile(user: any): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const timestamp = new Date().toISOString();

  if (userSnap.exists()) {
    // Update last active
    await updateDoc(userRef, {
      lastActive: timestamp,
      displayName: user.displayName || user.email || 'Korisnik',
      photoURL: user.photoURL || '',
    });
    return userSnap.data() as UserProfile;
  } else {
    // Create new profile
    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || user.email || 'Korisnik',
      email: user.email || '',
      photoURL: user.photoURL || '',
      createdAt: timestamp,
      lastActive: timestamp,
      contributionsCount: 0,
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

/**
 * Fetches recent contributions for the user or globally.
 */
export async function fetchContributions(userId?: string): Promise<ContributionLog[]> {
  try {
    const contribsCol = collection(db, 'contributions');
    let q;
    
    if (userId) {
      q = query(
        contribsCol,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        contribsCol,
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }
    
    const querySnap = await getDocs(q);
    const logs: ContributionLog[] = [];
    querySnap.forEach((doc) => {
      logs.push({ id: doc.id, ...(doc.data() as any) } as ContributionLog);
    });
    return logs;
  } catch (err) {
    console.error('[Firebase Sync] Failed to fetch contributions:', err);
    return [];
  }
}
