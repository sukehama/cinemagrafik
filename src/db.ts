import { RatingEntry } from './types';

const DB_NAME = 'CinemaGrafikDB';
const STORE_NAME = 'entriesStore';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export function getEntriesFromDB(): Promise<RatingEntry[] | null> {
  return initDB()
    .then(db => {
      return new Promise<RatingEntry[] | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('rating-grid-entries');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    })
    .catch(err => {
      console.error('IndexedDB read error:', err);
      return null;
    });
}

export function saveEntriesToDB(entries: RatingEntry[]): Promise<void> {
  return initDB()
    .then(db => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entries, 'rating-grid-entries');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    })
    .catch(err => {
      console.error('IndexedDB write error:', err);
    });
}
