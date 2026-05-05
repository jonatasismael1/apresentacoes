import { openDB, type DBSchema } from 'idb';

interface SyncDB extends DBSchema {
  sync_queue: {
    key: string;
    value: {
      id: string; // uuid
      payload: any;
      type: 'save' | 'delete';
      timestamp: number;
    };
  };
}

const DB_NAME = 'dbe_sync_db';

async function initDB() {
  return openDB<SyncDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function addToQueue(type: 'save' | 'delete', payload: any) {
  const db = await initDB();
  const id = crypto.randomUUID();
  await db.put('sync_queue', {
    id,
    type,
    payload,
    timestamp: Date.now(),
  });
  console.log(`[Sync Queue] Adicionado à fila offline (${type})`);
}

export async function getQueue() {
  const db = await initDB();
  return db.getAll('sync_queue');
}

export async function removeFromQueue(id: string) {
  const db = await initDB();
  await db.delete('sync_queue', id);
}

export async function clearQueue() {
  const db = await initDB();
  await db.clear('sync_queue');
}
