import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Equipment, Profile, Shot } from './types';

interface EspressoDB extends DBSchema {
  shots: {
    key: string;
    value: Shot;
    indexes: { 'by-createdAt': number };
  };
  profiles: {
    key: string;
    value: Profile;
  };
  equipment: {
    key: string;
    value: Equipment;
  };
}

const DB_NAME = 'espresso-shot-profiler';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EspressoDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<EspressoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EspressoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('shots')) {
          const store = db.createObjectStore('shots', { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('equipment')) {
          db.createObjectStore('equipment', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadAllShots(): Promise<Shot[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('shots', 'by-createdAt');
  return all.reverse();
}

export async function saveShot(shot: Shot): Promise<void> {
  const db = await getDB();
  await db.put('shots', shot);
}

export async function deleteShot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('shots', id);
}

export async function loadAllProfiles(): Promise<Profile[]> {
  const db = await getDB();
  return db.getAll('profiles');
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('profiles', id);
}

export async function loadEquipment(): Promise<Equipment | null> {
  const db = await getDB();
  const eq = await db.get('equipment', 'singleton');
  return eq ?? null;
}

export async function saveEquipment(eq: Equipment): Promise<void> {
  const db = await getDB();
  await db.put('equipment', eq);
}
