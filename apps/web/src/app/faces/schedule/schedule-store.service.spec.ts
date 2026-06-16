import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleStoreService } from './schedule-store.service';
import { DEFAULT_SEGMENTS } from './default-schedule';
import {
  DEFAULT_PRESET_ID,
  DEFAULT_PRESET_NAME,
  LEGACY_IMAGE_KEY,
  LEGACY_SEGMENTS_KEY,
  PRESETS_KEY,
} from './schedule-preset';

// Minimal IDB mock — open() creates a fresh request each time so multiple
// openDb() calls in a single test all resolve correctly.
function makeIdbMock() {
  const store: Record<string, unknown> = {};

  const makeRequest = <T>(result: T): IDBRequest<T> => {
    const req = { result, error: null } as unknown as IDBRequest<T>;
    setTimeout(
      () => (req as unknown as { onsuccess: (e: unknown) => void }).onsuccess?.({ target: req }),
      0,
    );
    return req;
  };

  const makeTx = () => {
    const tx = {
      objectStore: () => ({
        put: (val: unknown, key: string) => {
          store[key] = val;
          return makeRequest(undefined);
        },
        get: (key: string) => makeRequest(store[key] as Blob | undefined),
        delete: (key: string) => {
          delete store[key];
          return makeRequest(undefined);
        },
      }),
      oncomplete: null as (() => void) | null,
      onerror: null,
    };
    setTimeout(() => tx.oncomplete?.(), 10);
    return tx;
  };

  const db = {
    transaction: () => makeTx(),
    objectStoreNames: { contains: () => false },
    createObjectStore: () => undefined,
  };

  return {
    open: () => {
      const req = {
        result: db,
        error: null,
        onupgradeneeded: null as ((e: unknown) => void) | null,
        onsuccess: null as ((e: unknown) => void) | null,
        onerror: null,
      };
      setTimeout(() => {
        req.onupgradeneeded?.({ target: req });
        req.onsuccess?.({ target: req });
      }, 0);
      return req as unknown as IDBOpenDBRequest;
    },
    store,
  };
}

function makeLsMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as unknown as Storage;
}

describe('ScheduleStoreService', () => {
  let lsMock: Storage;

  beforeEach(() => {
    lsMock = makeLsMock();
    vi.stubGlobal('localStorage', lsMock);
    vi.stubGlobal('indexedDB', makeIdbMock());
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('seeds a default preset when nothing is stored', () => {
    const service = TestBed.inject(ScheduleStoreService);
    const state = service.loadState();
    expect(state.presets).toHaveLength(1);
    expect(state.presets[0].id).toBe(DEFAULT_PRESET_ID);
    expect(state.presets[0].name).toBe(DEFAULT_PRESET_NAME);
    expect(state.presets[0].segments).toEqual(DEFAULT_SEGMENTS);
    expect(state.presets[0].hasImage).toBe(false);
    expect(state.activePresetId).toBe(DEFAULT_PRESET_ID);
  });

  it('migrates legacy segments into the default preset and removes the legacy key', () => {
    const legacy = [{ pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '12:00' }];
    localStorage.setItem(LEGACY_SEGMENTS_KEY, JSON.stringify(legacy));
    const service = TestBed.inject(ScheduleStoreService);
    const state = service.loadState();
    expect(state.presets[0].segments).toEqual(legacy);
    expect(localStorage.getItem(LEGACY_SEGMENTS_KEY)).toBeNull();
    expect(localStorage.getItem(PRESETS_KEY)).not.toBeNull();
  });

  it('persists the seeded state so a second load is stable', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const raw = localStorage.getItem(PRESETS_KEY);
    expect(raw).not.toBeNull();
    const again = service.loadState();
    expect(again.presets).toHaveLength(1);
  });

  it('falls back to a fresh default state on corrupt JSON', () => {
    localStorage.setItem(PRESETS_KEY, '{bad json}');
    const service = TestBed.inject(ScheduleStoreService);
    const state = service.loadState();
    expect(state.presets[0].id).toBe(DEFAULT_PRESET_ID);
  });

  it('migrates a legacy image blob to the default preset id', async () => {
    const idb = makeIdbMock();
    idb.store[LEGACY_IMAGE_KEY] = new Blob(['x'], { type: 'image/png' });
    vi.stubGlobal('indexedDB', idb);
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    // Let the async re-key complete (IDB mock resolves on timers/microtasks).
    await new Promise((r) => setTimeout(r, 30));
    const url = await service.loadPresetImage(DEFAULT_PRESET_ID);
    expect(url).toMatch(/^blob:/);
    expect(idb.store[LEGACY_IMAGE_KEY]).toBeUndefined();
    expect(service.loadState().presets[0].hasImage).toBe(true);
  });
});
