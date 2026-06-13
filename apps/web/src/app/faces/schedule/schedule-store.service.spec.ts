import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleStoreService } from './schedule-store.service';
import { DEFAULT_SEGMENTS } from './default-schedule';

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

// Minimal localStorage mock for environments that lack full Storage API
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
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadSegments returns DEFAULT_SEGMENTS when nothing stored', () => {
    const service = TestBed.inject(ScheduleStoreService);
    expect(service.loadSegments()).toEqual(DEFAULT_SEGMENTS);
  });

  it('saveSegments persists and loadSegments restores', () => {
    const service = TestBed.inject(ScheduleStoreService);
    const segs = [{ pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '12:00' }];
    service.saveSegments(segs);
    expect(service.loadSegments()).toEqual(segs);
  });

  it('loadSegments returns DEFAULT_SEGMENTS on invalid JSON', () => {
    localStorage.setItem('allyclock.schedule', '{bad json}');
    const service = TestBed.inject(ScheduleStoreService);
    expect(service.loadSegments()).toEqual(DEFAULT_SEGMENTS);
  });

  it('saveSegments swallows localStorage quota errors', () => {
    const service = TestBed.inject(ScheduleStoreService);
    vi.spyOn(lsMock, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => service.saveSegments([])).not.toThrow();
  });

  it('saveImage stores blob in IDB and loadImage returns an object URL', async () => {
    const idb = makeIdbMock();
    vi.stubGlobal('indexedDB', idb);
    const service = TestBed.inject(ScheduleStoreService);
    const blob = new Blob(['test'], { type: 'image/png' });
    await service.saveImage(blob);
    const url = await service.loadImage();
    expect(url).toBeTruthy();
    expect(url).toMatch(/^blob:/);
  });

  it('loadImage returns null when no image stored', async () => {
    const idb = makeIdbMock();
    vi.stubGlobal('indexedDB', idb);
    const service = TestBed.inject(ScheduleStoreService);
    const url = await service.loadImage();
    expect(url).toBeNull();
  });

  it('removeImage clears the stored blob', async () => {
    const idb = makeIdbMock();
    vi.stubGlobal('indexedDB', idb);
    const service = TestBed.inject(ScheduleStoreService);
    const blob = new Blob(['test'], { type: 'image/png' });
    await service.saveImage(blob);
    await service.removeImage();
    const url = await service.loadImage();
    expect(url).toBeNull();
  });
});
