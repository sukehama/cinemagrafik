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

import { TrophyItem, PendingChangeRequest } from './types';

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
  isModerator?: boolean;
  isAdmin?: boolean;
  trophies?: TrophyItem[];
}

/**
 * Fetch all registered user profiles (for Admin panel search)
 */
export async function fetchAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const users: UserProfile[] = [];
    snap.forEach(docSnap => {
      users.push(docSnap.data() as UserProfile);
    });
    return users;
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    return [];
  }
}

/**
 * Set user moderator status (Admin only)
 */
export async function setUserModeratorStatus(targetUid: string, isModerator: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { isModerator });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

/**
 * Submit pending change request (for regular non-moderator users)
 */
export async function submitPendingChangeRequest(
  userId: string,
  userName: string,
  userEmail: string,
  type: PendingChangeRequest['type'],
  details: string,
  entryId?: string,
  entryData?: Partial<RatingEntry>
): Promise<void> {
  try {
    const requestsCol = collection(db, 'pending_requests');
    await addDoc(requestsCol, {
      userId,
      userName,
      userEmail,
      type,
      details,
      entryId: entryId || null,
      entryData: entryData ? sanitizeForFirestore(entryData) : null,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'pending_requests');
  }
}

/**
 * Fetch pending change requests (for Admin / Moderators)
 */
export async function fetchPendingChangeRequests(): Promise<PendingChangeRequest[]> {
  try {
    const requestsCol = collection(db, 'pending_requests');
    const q = query(requestsCol, where('status', '==', 'pending'));
    const snap = await getDocs(q);
    const list: PendingChangeRequest[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as PendingChangeRequest);
    });
    return list;
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    return [];
  }
}

/**
 * Update request status (Approve / Reject)
 */
export async function updateChangeRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const ref = doc(db, 'pending_requests', requestId);
    await updateDoc(ref, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `pending_requests/${requestId}`);
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return data;
  return JSON.parse(JSON.stringify(data));
}

export function syncFirestoreEntries(
  localEntries: RatingEntry[],
  onSync: (entries: RatingEntry[]) => void,
  onSyncStateChange: (syncing: boolean, error?: string) => void
): () => void {
  onSyncStateChange(true);
  
  const entriesCol = collection(db, 'entries');
  
  const unsubscribe = onSnapshot(entriesCol, async (snapshot) => {
    try {
      if (snapshot.empty) {
        if (localEntries.length > 0) {
          console.log(`[Firebase Sync] Firestore is empty. Migrating ${localEntries.length} local entries...`);
          const CHUNK_SIZE = 400;
          for (let i = 0; i < localEntries.length; i += CHUNK_SIZE) {
            const chunk = localEntries.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((entry) => {
              const docRef = doc(db, 'entries', entry.id);
              batch.set(docRef, sanitizeForFirestore(entry));
            });
            await batch.commit();
          }
          console.log('[Firebase Sync] Migration completed successfully.');
          onSync(localEntries);
        } else {
          onSync([]);
        }
      } else {
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

export async function syncAllLocalCatalogToFirestore(entries: RatingEntry[]): Promise<void> {
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((entry) => {
        const docRef = doc(db, 'entries', entry.id);
        batch.set(docRef, sanitizeForFirestore(entry));
      });
      await batch.commit();
    }
    console.log(`[Firebase Master Sync] Successfully uploaded ${entries.length} entries to Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'entries_batch_sync');
  }
}

export async function saveEntryToFirestore(
  entry: RatingEntry,
  actionType: 'add' | 'edit',
  userId?: string,
  userName?: string,
  userPhotoUrl?: string
): Promise<void> {
  const docRef = doc(db, 'entries', entry.id);
  try {
    await setDoc(docRef, sanitizeForFirestore(entry));
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
    
    try {
      await addDoc(contribsCol, {
        ...params,
        timestamp,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'contributions');
    }

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

  // Master Admin E-mail
  const isMasterAdmin = user.email?.toLowerCase() === 'bilkufarimulhik006@gmail.com' || user.email?.toLowerCase() === 'rogerstold@gmail.com';

  if (userSnap && userSnap.exists()) {
    const existingData = userSnap.data() as UserProfile;
    const updatedProfile: UserProfile = {
      ...existingData,
      isAdmin: isMasterAdmin ? true : existingData.isAdmin,
      isModerator: isMasterAdmin ? true : existingData.isModerator,
      lastActive: timestamp,
      isOnline: true,
    };
    try {
      await updateDoc(userRef, {
        isAdmin: updatedProfile.isAdmin,
        isModerator: updatedProfile.isModerator,
        lastActive: timestamp,
        isOnline: true,
      });
    } catch (err) {
      console.warn('[Firebase Sync] Failed to update user online status in Firestore (offline):', err);
    }
    return updatedProfile;
  } else {
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
      isAdmin: isMasterAdmin,
      isModerator: isMasterAdmin,
      trophies: []
    };
    try {
      await setDoc(userRef, newProfile);
    } catch (err) {
      console.warn('[Firebase Sync] Failed to create new user profile in Firestore (offline):', err);
    }
    return newProfile;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, data);
  } catch (err) {
    console.warn(`[Firebase Sync] Failed to update user profile in Firestore (offline):`, err);
  }
}

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