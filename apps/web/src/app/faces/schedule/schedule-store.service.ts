import { Injectable } from '@angular/core';
import { DEFAULT_SEGMENTS } from './default-schedule';
import type { ScheduleSegment } from './schedule-formatter';
import {
  DEFAULT_PRESET_ID,
  DEFAULT_PRESET_NAME,
  LEGACY_IMAGE_KEY,
  LEGACY_SEGMENTS_KEY,
  PRESETS_KEY,
  type SchedulePreset,
  type ScheduleState,
} from './schedule-preset';

// Legacy single-schedule keys; the methods that use them stay until Task 6,
// when the face and config no longer call them.
const SEGMENTS_KEY = 'allyclock.schedule';
const IDB_DB_NAME = 'allyclock-schedule';
const IDB_STORE_NAME = 'assets';
const IDB_IMAGE_KEY = 'image';

function imageKey(presetId: string): string {
  return `image:${presetId}`;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleStoreService {
  // ---- State (localStorage) -------------------------------------------------

  loadState(): ScheduleState {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ScheduleState;
        if (parsed?.presets?.length) return parsed;
      } catch {
        // fall through to seed
      }
    }
    const state = this.migrateOrSeed();
    this.saveState(state);
    return state;
  }

  private saveState(state: ScheduleState): void {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(state));
    } catch {
      // quota or unavailable — keep in-memory only
    }
  }

  // Build the initial state from legacy single-schedule data when present,
  // otherwise from the bundled defaults. Legacy keys are cleaned up here.
  private migrateOrSeed(): ScheduleState {
    let segments = DEFAULT_SEGMENTS;
    const legacy = localStorage.getItem(LEGACY_SEGMENTS_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as ScheduleSegment[];
        if (Array.isArray(parsed) && parsed.length) segments = parsed;
      } catch {
        // ignore malformed legacy segments
      }
      localStorage.removeItem(LEGACY_SEGMENTS_KEY);
    }
    const preset: SchedulePreset = {
      id: DEFAULT_PRESET_ID,
      name: DEFAULT_PRESET_NAME,
      segments,
      hasImage: false,
    };
    const state: ScheduleState = { presets: [preset], activePresetId: DEFAULT_PRESET_ID };
    // IndexedDB cannot be read synchronously, so seed hasImage=false and re-key
    // any legacy image asynchronously, flipping hasImage + re-persisting when
    // done. The face calls loadPresetImage(id) regardless and falls back to the
    // bundled default, so the brief window before the flip is invisible.
    void this.migrateLegacyImage(state);
    return state;
  }

  private async migrateLegacyImage(state: ScheduleState): Promise<void> {
    try {
      const db = await openDb();
      const blob = await idbGet<Blob>(db, IDB_STORE_NAME, LEGACY_IMAGE_KEY);
      if (!blob) return;
      await idbPut(db, IDB_STORE_NAME, imageKey(DEFAULT_PRESET_ID), blob);
      await idbDelete(db, IDB_STORE_NAME, LEGACY_IMAGE_KEY);
      const def = state.presets.find((p) => p.id === DEFAULT_PRESET_ID);
      if (def) {
        def.hasImage = true;
        this.saveState(state);
      }
    } catch {
      // IDB unavailable — nothing to migrate
    }
  }

  addPreset(): SchedulePreset {
    const state = this.loadState();
    const preset: SchedulePreset = {
      id: newId(),
      name: nextPresetName(state.presets),
      segments: [{ pixelStart: 0, pixelEnd: 0, timeStart: '00:00', timeEnd: '24:00' }],
      hasImage: false,
    };
    state.presets.push(preset);
    state.activePresetId = preset.id;
    this.saveState(state);
    return preset;
  }

  renamePreset(id: string, name: string): void {
    const state = this.loadState();
    const preset = state.presets.find((p) => p.id === id);
    if (!preset) return;
    preset.name = name;
    this.saveState(state);
  }

  updateSegments(id: string, segments: ScheduleSegment[]): void {
    const state = this.loadState();
    const preset = state.presets.find((p) => p.id === id);
    if (!preset) return;
    preset.segments = segments;
    this.saveState(state);
  }

  setActive(id: string): void {
    const state = this.loadState();
    if (!state.presets.some((p) => p.id === id)) return;
    state.activePresetId = id;
    this.saveState(state);
  }

  deletePreset(id: string): void {
    const state = this.loadState();
    if (state.presets.length <= 1) return; // never delete the last preset
    const index = state.presets.findIndex((p) => p.id === id);
    if (index === -1) return;
    state.presets.splice(index, 1);
    if (state.activePresetId === id) {
      const fallback = state.presets[Math.max(0, index - 1)];
      state.activePresetId = fallback.id;
    }
    this.saveState(state);
    void this.removePresetImage(id);
  }

  // ---- Per-preset images (IndexedDB, one blob per preset id) ----------------

  async loadPresetImage(presetId: string): Promise<string | null> {
    try {
      const db = await openDb();
      const blob = await idbGet<Blob>(db, IDB_STORE_NAME, imageKey(presetId));
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  async savePresetImage(presetId: string, blob: Blob): Promise<void> {
    try {
      const db = await openDb();
      await idbPut(db, IDB_STORE_NAME, imageKey(presetId), blob);
    } catch {
      // IDB unavailable — silently ignored
    }
  }

  async removePresetImage(presetId: string): Promise<void> {
    try {
      const db = await openDb();
      await idbDelete(db, IDB_STORE_NAME, imageKey(presetId));
    } catch {
      // IDB unavailable — silently ignored
    }
  }

  // ---- Legacy single-schedule API (consumed by the not-yet-migrated face and
  // config; removed in Task 6) -----------------------------------------------

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

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${performance.now().toString(36)}-${Math.round(performance.now() * 1000)}`;
}

// Next "Preset #N": one greater than the highest existing N, minimum 2 (the
// seeded default occupies the implicit #1 slot).
function nextPresetName(presets: SchedulePreset[]): string {
  let max = 1;
  for (const p of presets) {
    const m = /^Preset #(\d+)$/.exec(p.name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `Preset #${max + 1}`;
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
