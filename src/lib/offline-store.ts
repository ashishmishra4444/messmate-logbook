import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineScan {
  id: string; // uuid
  payload: string; // QR jwt or manual member_id
  auth_type: 'qr' | 'manual';
  scanner_device_id: string;
  scanner_name: string;
  offline_timestamp: number;
  meal_session_id: string;
  meal_type: string;
  status: 'pending' | 'failed';
  retryCount: number;
  errorReason?: string;
}

interface ScannerDB extends DBSchema {
  offline_scans: {
    key: string;
    value: OfflineScan;
    indexes: { 'by-status': string };
  };
  dead_letter_queue: {
    key: string;
    value: OfflineScan;
  };
}

let dbPromise: Promise<IDBPDatabase<ScannerDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ScannerDB>('MessMateScanner', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline_scans')) {
          const store = db.createObjectStore('offline_scans', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('dead_letter_queue')) {
          db.createObjectStore('dead_letter_queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function addOfflineScan(scan: Omit<OfflineScan, 'status' | 'retryCount'>) {
  const db = await getDB();
  const fullScan: OfflineScan = {
    ...scan,
    status: 'pending',
    retryCount: 0
  };
  await db.add('offline_scans', fullScan);
  return fullScan;
}

export async function getPendingScans() {
  const db = await getDB();
  return db.getAllFromIndex('offline_scans', 'by-status', 'pending');
}

export async function getQueueSize() {
  const db = await getDB();
  return db.count('offline_scans');
}

export async function removeScan(id: string) {
  const db = await getDB();
  await db.delete('offline_scans', id);
}

export async function moveToDeadLetter(scan: OfflineScan, reason: string) {
  const db = await getDB();
  const tx = db.transaction(['offline_scans', 'dead_letter_queue'], 'readwrite');
  await tx.objectStore('offline_scans').delete(scan.id);
  await tx.objectStore('dead_letter_queue').put({ ...scan, status: 'failed', errorReason: reason });
  await tx.done;
}

export async function incrementRetry(scan: OfflineScan) {
  const db = await getDB();
  await db.put('offline_scans', { ...scan, retryCount: scan.retryCount + 1 });
}
