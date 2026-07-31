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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  lastActive: string;
  contributionsCount: number;
  bio?: string;
  bannerUrl?: string;
  profileGradientStyle?: string;
  statusText?: string;
  isOnline?: boolean;
  role?: UserRole;
}

export interface PendingSubmission {
  id: string;
  entryId: string;
  entryData: RatingEntry;
  actionType: 'add' | 'edit' | 'delete';
  submitterId: string;
  submitterName: string;
  submitterPhotoUrl: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

const ADMIN_EMAIL = 'rogerstold@gmail.com';

export function getUserRole(profile: UserProfile | null): UserRole {
  if (!profile) return 'guest';
  if (profile.email?.toLowerCase() === ADMIN_EMAIL) return 'admin';
  return profile.role || 'user';
}

export function canEditDirectly(profile: UserProfile | null): boolean {
  const role = getUserRole(profile);
  return role === 'admin' || role === 'moderator';
}

export function canCreateContent(profile: UserProfile | null): boolean {
  const role = getUserRole(profile);
  return role === 'admin' || role === 'moderator' || role === 'user';
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
  try {
    await setDoc(docRef, entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `entries/${entry.id}`);
  }

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
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `entries/${entryId}`);
  }

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
    try {
      await addDoc(contribsCol, {
        ...params,
        timestamp,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'contributions');
    }

    // 2. Increment user contribution count
    const userRef = doc(db, 'users', params.userId);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${params.userId}`);
    }
    if (userSnap && userSnap.exists()) {
      try {
        await updateDoc(userRef, {
          contributionsCount: increment(1),
          lastActive: timestamp,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${params.userId}`);
      }
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
  let userSnap;
  
  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    console.warn('[Firebase Sync] Failed to get user profile from server (offline?), trying cache...', err);
    try {
      const { getDocFromCache } = await import('firebase/firestore');
      userSnap = await getDocFromCache(userRef);
    } catch (cacheErr) {
      console.error('[Firebase Sync] Failed to retrieve user profile from cache too:', cacheErr);
    }
  }

  const timestamp = new Date().toISOString();

  if (userSnap && userSnap.exists()) {
    const existingData = userSnap.data() as UserProfile;
    const resolvedRole: UserRole = (user.email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : (existingData.role || 'user');
    try {
      await updateDoc(userRef, {
        lastActive: timestamp,
        isOnline: true,
        role: resolvedRole,
      });
    } catch (err) {
      console.warn('[Firebase Sync] Failed to update user online status in Firestore (offline):', err);
    }
    return {
      ...existingData,
      lastActive: timestamp,
      isOnline: true,
      role: resolvedRole,
    };
  } else {
    // Create new profile with customizable default fields
    const initialRole: UserRole = (user.email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Korisnik',
      email: user.email || '',
      photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
      createdAt: timestamp,
      lastActive: timestamp,
      contributionsCount: 0,
      bio: 'Ljubitelj filmova i serija 🎬',
      profileGradientStyle: 'classic',
      statusText: 'Aktivan u katalogu',
      bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&h=200&q=80',
      isOnline: true,
      role: initialRole,
    };
    try {
      await setDoc(userRef, newProfile);
    } catch (err) {
      console.warn('[Firebase Sync] Failed to create new user profile in Firestore (offline), using local fallback profile:', err);
    }
    return newProfile;
  }
}

/**
 * Updates a user's profile with custom settings.
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, data);
  } catch (err) {
    console.warn(`[Firebase Sync] Failed to update user profile in Firestore (offline):`, err);
  }
}

/**
 * Fetches any user's profile by UID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('[Firebase Sync] Failed to get user profile from server (offline?), trying cache:', err);
    try {
      const { getDocFromCache } = await import('firebase/firestore');
      const cachedSnap = await getDocFromCache(userRef);
      if (cachedSnap.exists()) {
        return cachedSnap.data() as UserProfile;
      }
    } catch (cacheErr) {
      console.error('[Firebase Sync] Failed to get user profile from cache too:', cacheErr);
    }
  }
  return null;
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
    
    let querySnap;
    try {
      querySnap = await getDocs(q);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'contributions');
    }
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

// ===== Pending Submissions (for admin review) =====

export async function submitPendingEntry(
  entry: RatingEntry,
  actionType: 'add' | 'edit' | 'delete',
  profile: UserProfile
): Promise<void> {
  const pendingCol = collection(db, 'pending_submissions');
  const submission: Omit<PendingSubmission, 'id'> = {
    entryId: entry.id,
    entryData: entry,
    actionType,
    submitterId: profile.uid,
    submitterName: profile.displayName,
    submitterPhotoUrl: profile.photoURL,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
  await addDoc(pendingCol, submission as any);
}

export async function fetchPendingSubmissions(): Promise<PendingSubmission[]> {
  try {
    const pendingCol = collection(db, 'pending_submissions');
    const q = query(pendingCol, where('status', '==', 'pending'), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    const submissions: PendingSubmission[] = [];
    snap.forEach((doc) => {
      submissions.push({ id: doc.id, ...(doc.data() as any) } as PendingSubmission);
    });
    return submissions;
  } catch (err) {
    console.error('[Firebase Sync] Failed to fetch pending submissions:', err);
    return [];
  }
}

export async function approveSubmission(submission: PendingSubmission, reviewerId: string): Promise<void> {
  const pendingRef = doc(db, 'pending_submissions', submission.id);
  await updateDoc(pendingRef, {
    status: 'approved',
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  });

  if (submission.actionType === 'delete') {
    await deleteDoc(doc(db, 'entries', submission.entryId));
  } else {
    await setDoc(doc(db, 'entries', submission.entryId), submission.entryData as any, { merge: true });
  }
}

export async function rejectSubmission(submissionId: string, reviewerId: string): Promise<void> {
  const pendingRef = doc(db, 'pending_submissions', submissionId);
  await updateDoc(pendingRef, {
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  });
}

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const users: UserProfile[] = [];
    const term = searchTerm.toLowerCase().trim();
    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      if (!term || data.displayName?.toLowerCase().includes(term) || data.email?.toLowerCase().includes(term)) {
        users.push({ ...data, uid: docSnap.id });
      }
    });
    return users;
  } catch (err) {
    console.error('[Firebase Sync] Failed to search users:', err);
    return [];
  }
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { role });
}
