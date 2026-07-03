import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { ScreensService, MAX_SCREENS } from './screens.service';
import { DEFAULT_FACE_ID } from './default-face-id';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  get length() {
    return Object.keys(mem).length;
  },
};

function make(): ScreensService {
  return TestBed.inject(ScreensService);
}

// Minimal IDB mock that satisfies clearScreenImages: open without version,
// objectStoreNames.contains, getAllKeys, delete, and tx.oncomplete.
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
        getAllKeys: () => makeRequest(Object.keys(store) as IDBValidKey[]),
        delete: (key: string) => {
          delete store[key];
          return makeRequest(undefined);
        },
      }),
      oncomplete: null as (() => void) | null,
    };
    setTimeout(() => tx.oncomplete?.(), 10);
    return tx;
  };

  const db = {
    transaction: () => makeTx(),
    objectStoreNames: { contains: () => true },
    close: () => {},
  };

  return {
    open: () => {
      const req = {
        result: db,
        error: null,
        onsuccess: null as ((e: unknown) => void) | null,
        onerror: null,
      };
      setTimeout(() => req.onsuccess?.({ target: req }), 0);
      return req as unknown as IDBOpenDBRequest;
    },
    store,
  };
}

describe('ScreensService', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Re-stub localStorage so the mock is available if something accesses it
    // between afterEach and the next beforeEach.
    vi.stubGlobal('localStorage', storageMock);
  });

  it('seeds one screen on the default face when nothing is stored', () => {
    const s = make();
    expect(s.screens().length).toBe(1);
    expect(s.screens()[0].faceId).toBe(DEFAULT_FACE_ID);
    expect(s.activeIndex()).toBe(0);
    expect(s.activeScreen().id).toBe(s.screens()[0].id);
  });

  it('migrates the legacy face + config keys into Screen 1', () => {
    mem['allyclock.face'] = 'world-cards';
    mem['allyclock.fullscreen.config'] = '{"v":1}';
    mem['allyclock.world-cards.config'] = '{"v":2}';
    mem['allyclock.schedule.presets'] = '{"presets":[]}';
    const s = make();
    expect(s.screens()[0].faceId).toBe('world-cards');
    expect(mem['allyclock.face']).toBeUndefined();
    expect(mem['allyclock.screen.1.fullscreen.config']).toBe('{"v":1}');
    expect(mem['allyclock.screen.1.world-cards.config']).toBe('{"v":2}');
    expect(mem['allyclock.screen.1.schedule.presets']).toBe('{"presets":[]}');
    expect(mem['allyclock.fullscreen.config']).toBeUndefined();
  });

  it('persists and re-reads its state round-trip', () => {
    make().addScreen();
    TestBed.resetTestingModule();
    const s2 = make();
    expect(s2.screens().length).toBe(2);
  });

  it('addScreen appends a default-face screen with a new id and activates it', () => {
    const s = make();
    const firstId = s.screens()[0].id;
    s.addScreen();
    expect(s.screens().length).toBe(2);
    expect(s.screens()[1].id).toBe(firstId + 1);
    expect(s.screens()[1].faceId).toBe(DEFAULT_FACE_ID);
    expect(s.activeIndex()).toBe(1);
  });

  it('addScreen is a no-op at the cap', () => {
    const s = make();
    for (let i = 0; i < MAX_SCREENS + 3; i++) s.addScreen();
    expect(s.screens().length).toBe(MAX_SCREENS);
  });

  it('removeScreen refuses to drop the last screen', () => {
    const s = make();
    s.removeScreen(s.screens()[0].id);
    expect(s.screens().length).toBe(1);
  });

  it('removeScreen clamps activeIndex and clears the screen storage', () => {
    const s = make();
    s.addScreen(); // screen 2, active index 1
    const secondId = s.screens()[1].id;
    mem[`allyclock.screen.${secondId}.fullscreen.config`] = '{}';
    s.removeScreen(secondId);
    expect(s.screens().length).toBe(1);
    expect(s.activeIndex()).toBe(0);
    expect(mem[`allyclock.screen.${secondId}.fullscreen.config`]).toBeUndefined();
  });

  it('setActiveIndex clamps to range', () => {
    const s = make();
    s.addScreen();
    s.setActiveIndex(99);
    expect(s.activeIndex()).toBe(1);
    s.setActiveIndex(-5);
    expect(s.activeIndex()).toBe(0);
  });

  it('setFace updates the target screen only', () => {
    const s = make();
    s.addScreen();
    const [a, b] = s.screens();
    s.setFace(a.id, 'schedule');
    expect(s.screens()[0].faceId).toBe('schedule');
    expect(s.screens()[1].faceId).toBe(b.faceId);
  });

  it('the injector registry stores and returns per-id injectors', () => {
    const s = make();
    const inj = Injector.create({ providers: [] });
    s.registerInjector(7, inj);
    expect(s.injectorFor(7)).toBe(inj);
    s.unregisterInjector(7);
    expect(s.injectorFor(7)).toBeUndefined();
  });

  it('removeScreen deletes s<id>:image:* IDB keys for the removed screen only', async () => {
    const idbMock = makeIdbMock();
    vi.stubGlobal('indexedDB', idbMock);

    // Seed keys: screen 2 (will be removed) and screen 1 (must survive).
    idbMock.store['s2:image:p1'] = new Blob(['img'], { type: 'image/png' });
    idbMock.store['s1:image:p1'] = new Blob(['img2'], { type: 'image/png' });

    const s = make(); // seeds screen id=1
    s.addScreen(); // adds screen id=2, activeIndex=1
    const secondId = s.screens()[1].id; // 2

    s.removeScreen(secondId);

    // clearScreenImages is fire-and-forget (setTimeout chain); poll until done.
    for (let i = 0; i < 100 && `s${secondId}:image:p1` in idbMock.store; i++) {
      await new Promise<void>((r) => setTimeout(r, 5));
    }

    expect(idbMock.store[`s${secondId}:image:p1`]).toBeUndefined();
    expect(idbMock.store['s1:image:p1']).toBeDefined();
    // Synchronous state/localStorage changes must also have applied.
    expect(s.screens().length).toBe(1);
    expect(s.screens()[0].id).toBe(1);
  });

  it('removeScreen does not throw when indexedDB is undefined', () => {
    vi.stubGlobal('indexedDB', undefined);
    const s = make();
    s.addScreen();
    const secondId = s.screens()[1].id;
    expect(() => s.removeScreen(secondId)).not.toThrow();
    expect(s.screens().length).toBe(1);
  });
});
