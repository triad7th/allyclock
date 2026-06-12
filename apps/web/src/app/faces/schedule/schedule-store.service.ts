import { Injectable } from '@angular/core';
import { DEFAULT_SEGMENTS } from './default-schedule';
import type { ScheduleSegment } from './schedule-formatter';

const SEGMENTS_KEY = 'allyclock.schedule';
const IDB_DB_NAME = 'allyclock-schedule';
const IDB_STORE_NAME = 'assets';
const IDB_IMAGE_KEY = 'image';

@Injectable({
  providedIn: 'root',
})
export class ScheduleStoreService {
  loadSegments(): ScheduleSegment[] {
    try {
      const raw = localStorage.getItem(SEGMENTS_KEY);
      if (!raw) return DEFAULT_SEGMENTS;
      return JSON.parse(raw) as ScheduleSegment[];
    } catch {
      return DEFAULT_SEGMENTS;
    }
  }

  saveSegments(segments: ScheduleSegment[]): void {
    try {
      localStorage.setItem(SEGMENTS_KEY, JSON.stringify(segments));
    } catch {
      // quota or unavailable — keep in-memory only
    }
  }

  async loadImage(): Promise<string | null> {
    try {
      const db = await openDb();
      const blob = await idbGet<Blob>(db, IDB_STORE_NAME, IDB_IMAGE_KEY);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  async saveImage(blob: Blob): Promise<void> {
    try {
      const db = await openDb();
      await idbPut(db, IDB_STORE_NAME, IDB_IMAGE_KEY, blob);
    } catch {
      // IDB unavailable — silently ignored
    }
  }

  async removeImage(): Promise<void> {
    try {
      const db = await openDb();
      await idbDelete(db, IDB_STORE_NAME, IDB_IMAGE_KEY);
    } catch {
      // IDB unavailable — silently ignored
    }
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function idbGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    req.onsuccess = (e) => resolve((e.target as IDBRequest<T>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

function idbPut(db: IDBDatabase, storeName: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}
