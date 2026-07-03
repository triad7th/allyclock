import { computed, Injectable, Injector, signal } from '@angular/core';
import { DEFAULT_FACE_ID } from './default-face-id';

export interface ScreenConfig {
  id: number; // stable, monotonic (max existing + 1); the storage-namespace key
  faceId: string; // this screen's selected face
}

export interface ScreensState {
  version: 1;
  screens: ScreenConfig[]; // ordered; index = swipe order
  activeIndex: number;
}

// Web default. The iOS port replaces the body of maxScreens() with an
// entitlement check (in-app purchase); callers must never read this directly.
export const MAX_SCREENS = 5;

const STORAGE_KEY = 'allyclock.screens';
const LEGACY_FACE_KEY = 'allyclock.face';
// IDB coordinates shared with the schedule face's image store. Declared here so
// core/ can clean up screen images without importing from features/.
const IDB_DB_NAME = 'allyclock-schedule';
const IDB_STORE_NAME = 'assets';
// Legacy single-config keys migrated into Screen 1 (see the migration table).
const LEGACY_CONFIG_KEYS: readonly [legacy: string, scoped: string][] = [
  ['allyclock.fullscreen.config', 'allyclock.screen.1.fullscreen.config'],
  ['allyclock.world-cards.config', 'allyclock.screen.1.world-cards.config'],
  ['allyclock.schedule.presets', 'allyclock.screen.1.schedule.presets'],
];

@Injectable({ providedIn: 'root' })
export class ScreensService {
  private readonly state = signal<ScreensState>(this.load());
  // Not part of persisted state — live DI injectors keyed by screen id, so
  // sheets can render a screen's preview in that screen's config context.
  private readonly injectors = new Map<number, Injector>();

  readonly screens = computed(() => this.state().screens);
  readonly activeIndex = computed(() => this.state().activeIndex);
  readonly activeScreen = computed(() => {
    const st = this.state();
    return st.screens[st.activeIndex] ?? st.screens[0];
  });

  maxScreens(): number {
    return MAX_SCREENS;
  }

  addScreen(): void {
    const st = this.state();
    if (st.screens.length >= this.maxScreens()) return;
    const nextId = st.screens.reduce((m, s) => Math.max(m, s.id), 0) + 1;
    const screens = [...st.screens, { id: nextId, faceId: DEFAULT_FACE_ID }];
    this.commit({ ...st, screens, activeIndex: screens.length - 1 });
  }

  removeScreen(id: number): void {
    const st = this.state();
    if (st.screens.length <= 1) return;
    const index = st.screens.findIndex((s) => s.id === id);
    if (index === -1) return;
    const screens = st.screens.filter((s) => s.id !== id);
    const activeIndex = Math.min(st.activeIndex, screens.length - 1);
    this.clearScreenStorage(id);
    this.clearScreenImages(id);
    this.commit({ ...st, screens, activeIndex });
  }

  setActiveIndex(i: number): void {
    const st = this.state();
    const activeIndex = Math.max(0, Math.min(i, st.screens.length - 1));
    if (activeIndex === st.activeIndex) return;
    this.commit({ ...st, activeIndex });
  }

  setFace(screenId: number, faceId: string): void {
    const st = this.state();
    const screens = st.screens.map((s) => (s.id === screenId ? { ...s, faceId } : s));
    this.commit({ ...st, screens });
  }

  registerInjector(id: number, injector: Injector): void {
    this.injectors.set(id, injector);
  }
  unregisterInjector(id: number): void {
    this.injectors.delete(id);
  }
  injectorFor(id: number): Injector | undefined {
    return this.injectors.get(id);
  }

  private commit(next: ScreensState): void {
    this.state.set(next);
    this.persist(next);
  }

  private persist(next: ScreensState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota / unavailable — keep in-memory only
    }
  }

  // Read persisted state, or seed Screen 1 from the legacy single-config setup
  // (renaming the legacy localStorage keys) so an existing user loses nothing.
  // NOTE: called during field initialisation (before this.state is assigned),
  // so must not call commit() — use persist() directly.
  private load(): ScreensState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScreensState;
        if (parsed?.screens?.length) {
          const activeIndex = Math.max(0, Math.min(parsed.activeIndex ?? 0, parsed.screens.length - 1));
          return { version: 1, screens: parsed.screens, activeIndex };
        }
      }
    } catch {
      // fall through to seed
    }
    return this.seedFromLegacy();
  }

  private seedFromLegacy(): ScreensState {
    let faceId = DEFAULT_FACE_ID;
    try {
      const legacyFace = localStorage.getItem(LEGACY_FACE_KEY);
      if (legacyFace) {
        faceId = legacyFace;
        localStorage.removeItem(LEGACY_FACE_KEY);
      }
      for (const [legacy, scoped] of LEGACY_CONFIG_KEYS) {
        const value = localStorage.getItem(legacy);
        if (value !== null) {
          localStorage.setItem(scoped, value);
          localStorage.removeItem(legacy);
        }
      }
    } catch {
      // localStorage unavailable — seed defaults, nothing to migrate
    }
    const seeded: ScreensState = { version: 1, screens: [{ id: 1, faceId }], activeIndex: 0 };
    // Persist to storage but do NOT call commit() here — this.state is not yet
    // assigned (we are still inside the field initialiser that creates it).
    this.persist(seeded);
    return seeded;
  }

  private clearScreenStorage(id: number): void {
    try {
      const prefix = `allyclock.screen.${id}.`;
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) doomed.push(key);
      }
      for (const key of doomed) localStorage.removeItem(key);
    } catch {
      // localStorage unavailable — nothing to clear
    }
    // IndexedDB image blobs (s<id>:image:*) are deleted separately by clearScreenImages.
  }

  // Delete this screen's schedule image blobs (keys prefixed `s<id>:image:`).
  // Fire-and-forget; guarded so a missing IndexedDB/object store is a no-op.
  private clearScreenImages(id: number): void {
    if (typeof indexedDB === 'undefined') return;
    const prefix = `s${id}:image:`;
    const req = indexedDB.open(IDB_DB_NAME);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) { db.close(); return; }
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        for (const key of keysReq.result) {
          if (typeof key === 'string' && key.startsWith(prefix)) store.delete(key);
        }
      };
      tx.oncomplete = () => db.close();
    };
    req.onerror = () => {};
  }
}
