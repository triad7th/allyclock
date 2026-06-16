# Daily Schedule Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Daily Schedule face from a single schedule into multiple named presets (each with its own image + segments), with one active preset driving the face and SF-symbol overlay-icon controls.

**Architecture:** A new `SchedulePreset` model is persisted as a preset list + `activePresetId` in localStorage, with one image blob per preset id in IndexedDB. `ScheduleStoreService` gains preset-aware CRUD + migration from the legacy single-schedule keys. The config panel becomes a live, immediate-commit settings manager (presets row + per-preset editor with overlay icons); the face renders the active preset. A reusable `IconComponent` keyed to SF Symbol names is the porting seam for Apple platforms.

**Tech Stack:** Angular 21 standalone components, signals, zoneless; Vitest (`@angular/build:unit-test`); IndexedDB + localStorage; SCSS.

**Reference spec:** `docs/superpowers/specs/2026-06-15-schedule-presets-design.md`

**Conventions:** two-space indent, single quotes, final newline, standalone components, no `any` without a boundary reason. Run all tests with `npm run test:web` and the build with `npm run build:web` from the repo root.

---

## File Structure

**New files:**
- `apps/web/src/app/ui/icon/icon.component.ts` — SF-Symbol-named `<app-icon>` rendering inline SVG.
- `apps/web/src/app/ui/icon/icon.component.spec.ts` — icon component tests.
- `apps/web/src/app/faces/schedule/schedule-preset.ts` — `SchedulePreset` / `ScheduleState` types + constants.

**Modified files:**
- `apps/web/src/app/faces/schedule/schedule-store.service.ts` — preset CRUD, per-id images, migration/seed.
- `apps/web/src/app/faces/schedule/schedule-store.service.spec.ts` — preset store tests.
- `apps/web/src/app/faces/schedule/schedule-face.component.ts` — read active preset.
- `apps/web/src/app/faces/schedule/schedule-face.component.spec.ts` — keep passing.
- `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts` — presets row + overlay-icon editor, immediate commit.
- `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.html` — new template.
- `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.scss` — new styles.
- `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.spec.ts` — new config tests.

**Deleted files (Task 8):**
- `apps/web/src/app/faces/schedule/schedule-io.ts` and `schedule-io.spec.ts` — Export/Import removed.

---

## Task 1: Icon abstraction layer (`IconComponent`)

**Files:**
- Create: `apps/web/src/app/ui/icon/icon.component.ts`
- Test: `apps/web/src/app/ui/icon/icon.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/ui/icon/icon.component.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

@Component({
  imports: [IconComponent],
  template: '<app-icon [name]="name" />',
})
class HostComponent {
  name = 'pencil';
}

describe('IconComponent', () => {
  function render(name: string): SVGElement | null {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.name = name;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg');
  }

  it('renders an svg for a known name', () => {
    const svg = render('pencil');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeTruthy();
  });

  it('renders each supported SF Symbol name', () => {
    for (const name of ['pencil', 'photo', 'plus', 'trash', 'square.and.arrow.up']) {
      expect(render(name)).toBeTruthy();
    }
  });

  it('renders an empty svg (no path) for an unknown name', () => {
    const svg = render('does.not.exist');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:web -- icon.component`
Expected: FAIL — cannot find module `./icon.component`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/app/ui/icon/icon.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// SF Symbol name -> SVG path data. The `name` input mirrors Apple's SF Symbol
// names so native ports swap this component for `Image(systemName:)` directly.
// Paths are drawn on a 24x24 viewBox with round caps/joins.
const ICON_PATHS: Record<string, string> = {
  pencil: 'M14.5 4.5l3 3M4 17l9.5-9.5 3 3L7 20l-4 1 1-4z',
  photo: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5zM5 17l5-5 4 4 2.5-2.5L21 16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0l-.7 12a2 2 0 0 1-2 1.9H7.7a2 2 0 0 1-2-1.9L5 7',
  'square.and.arrow.up': 'M12 15V4m0 0L8 8m4-4l4 4M5 13v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @if (path()) {
        <path [attr.d]="path()" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly path = computed(() => ICON_PATHS[this.name()] ?? '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:web -- icon.component`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/ui/icon/
git commit -m "feat(web): add SF-Symbol-named icon component"
```

---

## Task 2: Preset model + store state (load, migrate, seed)

**Files:**
- Create: `apps/web/src/app/faces/schedule/schedule-preset.ts`
- Modify: `apps/web/src/app/faces/schedule/schedule-store.service.ts`
- Test: `apps/web/src/app/faces/schedule/schedule-store.service.spec.ts`

- [ ] **Step 1: Create the preset model**

Create `apps/web/src/app/faces/schedule/schedule-preset.ts`:

```ts
import type { ScheduleSegment } from './schedule-formatter';

export interface SchedulePreset {
  id: string;
  name: string;
  segments: ScheduleSegment[];
  // True when an image blob exists in IndexedDB under `image:<id>`. When false,
  // the face falls back to the bundled default image.
  hasImage: boolean;
}

export interface ScheduleState {
  presets: SchedulePreset[];
  activePresetId: string;
}

// Stable id + name for the seeded/migrated default preset.
export const DEFAULT_PRESET_ID = 'default';
export const DEFAULT_PRESET_NAME = 'Summer Break';

// localStorage key for the preset list + active id.
export const PRESETS_KEY = 'allyclock.schedule.presets';
// Legacy single-schedule keys, migrated then removed.
export const LEGACY_SEGMENTS_KEY = 'allyclock.schedule';
export const LEGACY_IMAGE_KEY = 'image';
```

- [ ] **Step 2: Write the failing tests**

Replace the whole body of `describe('ScheduleStoreService', ...)` in `apps/web/src/app/faces/schedule/schedule-store.service.spec.ts` so the tests below are added. Keep the existing `makeIdbMock()` and `makeLsMock()` helpers and the imports at the top, but change the imports line and the `describe` block. The full new file:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:web -- schedule-store`
Expected: FAIL — `loadState` / `loadPresetImage` not a function, and the imported `schedule-preset` types are missing.

- [ ] **Step 4: Implement `loadState` + migration + per-id image read**

Replace the entire contents of `apps/web/src/app/faces/schedule/schedule-store.service.ts` with the following. This keeps the legacy single-schedule methods (`loadSegments`/`saveSegments`/`loadImage`/`saveImage`/`removeImage`) so the not-yet-migrated face and config keep compiling; Task 6 removes them.

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:web -- schedule-store`
Expected: PASS (6 tests). If `URL.createObjectURL` is undefined in the test env, add `vi.stubGlobal('URL', { createObjectURL: () => 'blob:mock', revokeObjectURL: () => undefined })` in `beforeEach` — but the existing image tests already relied on it, so it is available.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-preset.ts apps/web/src/app/faces/schedule/schedule-store.service.ts apps/web/src/app/faces/schedule/schedule-store.service.spec.ts
git commit -m "feat(web): add preset state model with migration to schedule store"
```

---

## Task 3: Store preset CRUD (add / rename / delete / setActive / updateSegments)

**Files:**
- Modify: `apps/web/src/app/faces/schedule/schedule-store.service.ts`
- Test: `apps/web/src/app/faces/schedule/schedule-store.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append these tests inside the `describe('ScheduleStoreService', ...)` block in the spec:

```ts
  it('addPreset appends a "Preset #N" preset and activates it', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const created = service.addPreset();
    expect(created.name).toBe('Preset #2');
    expect(created.segments).toEqual([
      { pixelStart: 0, pixelEnd: 0, timeStart: '00:00', timeEnd: '24:00' },
    ]);
    expect(created.hasImage).toBe(false);
    const state = service.loadState();
    expect(state.presets).toHaveLength(2);
    expect(state.activePresetId).toBe(created.id);
  });

  it('addPreset numbering increments past existing "Preset #N" names', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const a = service.addPreset();
    service.renamePreset(a.id, 'Preset #5');
    const b = service.addPreset();
    expect(b.name).toBe('Preset #6');
  });

  it('renamePreset updates the name', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const p = service.addPreset();
    service.renamePreset(p.id, 'Morning Routine');
    expect(service.loadState().presets.find((x) => x.id === p.id)?.name).toBe('Morning Routine');
  });

  it('updateSegments replaces a preset segments', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const segs = [{ pixelStart: 0, pixelEnd: 100, timeStart: '00:00', timeEnd: '24:00' }];
    service.updateSegments(DEFAULT_PRESET_ID, segs);
    expect(service.loadState().presets[0].segments).toEqual(segs);
  });

  it('setActive changes the active preset id', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const p = service.addPreset();
    service.setActive(DEFAULT_PRESET_ID);
    expect(service.loadState().activePresetId).toBe(DEFAULT_PRESET_ID);
    service.setActive(p.id);
    expect(service.loadState().activePresetId).toBe(p.id);
  });

  it('deletePreset removes it and reselects active when the active was deleted', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    const p = service.addPreset(); // p is now active
    service.deletePreset(p.id);
    const state = service.loadState();
    expect(state.presets).toHaveLength(1);
    expect(state.activePresetId).toBe(DEFAULT_PRESET_ID);
  });

  it('deletePreset refuses to delete the last remaining preset', () => {
    const service = TestBed.inject(ScheduleStoreService);
    service.loadState();
    service.deletePreset(DEFAULT_PRESET_ID);
    expect(service.loadState().presets).toHaveLength(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:web -- schedule-store`
Expected: FAIL — `addPreset` / `renamePreset` / `updateSegments` / `setActive` / `deletePreset` are not functions.

- [ ] **Step 3: Implement the CRUD methods**

In `schedule-store.service.ts`, add these methods to the class (after `loadState`/`saveState`, before the image section). Add the `DEFAULT_SEGMENTS`-independent new-preset seed inline:

```ts
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
```

Add these module-level helpers near the bottom of the file (above `openDb`):

```ts
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
```

Ensure `SchedulePreset` and `ScheduleSegment` are imported (already imported in Task 2).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web -- schedule-store`
Expected: PASS (13 tests total).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-store.service.ts apps/web/src/app/faces/schedule/schedule-store.service.spec.ts
git commit -m "feat(web): add preset CRUD to schedule store"
```

---

## Task 4: Face renders the active preset

**Files:**
- Modify: `apps/web/src/app/faces/schedule/schedule-face.component.ts`
- Test: `apps/web/src/app/faces/schedule/schedule-face.component.spec.ts`

- [ ] **Step 1: Update the face spec mock to the new store API**

Replace the `mockStore` and the two data-related assertions in `schedule-face.component.spec.ts`. Replace the `const mockStore = {...}` block with:

```ts
import { DEFAULT_PRESET_ID } from './schedule-preset';

const mockStore = {
  loadState: () => ({
    presets: [
      { id: DEFAULT_PRESET_ID, name: 'Summer Break', segments: DEFAULT_SEGMENTS, hasImage: false },
    ],
    activePresetId: DEFAULT_PRESET_ID,
  }),
  loadPresetImage: () => Promise.resolve(null),
  savePresetImage: vi.fn(),
  removePresetImage: vi.fn(),
};
```

Keep all existing `it(...)` tests as-is — they assert DOM (`img`, `.red-box`, gear behavior) and the default image src, all still valid.

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run test:web -- schedule-face`
Expected: FAIL — the new mock provides `loadState`/`loadPresetImage` but not `loadSegments`/`loadImage`, and the not-yet-updated component still calls `this.store.loadSegments()` in `ngOnInit`, throwing "loadSegments is not a function". Step 3 migrates the component so it calls `loadState` + `loadPresetImage` instead.

- [ ] **Step 3: Update the face component to read the active preset**

In `schedule-face.component.ts`, replace the `ngOnInit` body and `onConfigSaved` to use `loadState`. Change these two methods:

```ts
  ngOnInit(): void {
    window.addEventListener('resize', this.onResize);
    this.armGearTimer();
    this.loadActivePreset();
  }
```

```ts
  onConfigSaved(): void {
    this.loadActivePreset();
    this.beginConfigClose();
  }
```

Add this private method to the class:

```ts
  private loadActivePreset(): void {
    const state = this.store.loadState();
    const active = state.presets.find((p) => p.id === state.activePresetId) ?? state.presets[0];
    this.segments.set(active.segments);
    this.imageUrl.set(DEFAULT_IMAGE_SRC);
    this.store.loadPresetImage(active.id).then((url) => {
      if (url) this.imageUrl.set(url);
    });
  }
```

The existing imports already include `DEFAULT_IMAGE_SRC` and `DEFAULT_SEGMENTS`; `DEFAULT_SEGMENTS` stays as the initial signal value. No other changes.

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npm run test:web -- schedule-face`
Expected: PASS (all existing tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-face.component.ts apps/web/src/app/faces/schedule/schedule-face.component.spec.ts
git commit -m "feat(web): render the active preset on the schedule face"
```

---

## Task 5: Config — presets row, add + select (immediate commit)

This task rewrites `ScheduleConfigComponent` to manage presets. It is split into Task 5 (presets row + selection state) and Task 6 (editor overlay icons). After Task 5 the component compiles and shows the presets row; the editor is wired in Task 6.

**Files:**
- Modify: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts`
- Modify: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.html`
- Modify: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.scss`
- Test: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.spec.ts`

- [ ] **Step 1: Write the new config spec**

Replace the entire `schedule-config.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleConfigComponent } from './schedule-config.component';
import { ScheduleStoreService } from '../schedule-store.service';
import { DEFAULT_SEGMENTS } from '../default-schedule';
import { DEFAULT_PRESET_ID } from '../schedule-preset';

function makeState() {
  return {
    presets: [
      { id: DEFAULT_PRESET_ID, name: 'Summer Break', segments: DEFAULT_SEGMENTS, hasImage: false },
    ],
    activePresetId: DEFAULT_PRESET_ID,
  };
}

const mockStore = {
  state: makeState(),
  loadState: vi.fn(),
  addPreset: vi.fn(),
  renamePreset: vi.fn(),
  deletePreset: vi.fn(),
  setActive: vi.fn(),
  updateSegments: vi.fn(),
  loadPresetImage: vi.fn(() => Promise.resolve(null)),
  savePresetImage: vi.fn(() => Promise.resolve()),
  removePresetImage: vi.fn(() => Promise.resolve()),
};

describe('ScheduleConfigComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore.state = makeState();
    mockStore.loadState.mockImplementation(() => mockStore.state);
    mockStore.addPreset.mockImplementation(() => {
      const p = { id: 'p2', name: 'Preset #2', segments: DEFAULT_SEGMENTS, hasImage: false };
      mockStore.state.presets.push(p);
      mockStore.state.activePresetId = 'p2';
      return p;
    });
    mockStore.setActive.mockImplementation((id: string) => {
      mockStore.state.activePresetId = id;
    });
    await TestBed.configureTestingModule({
      imports: [ScheduleConfigComponent],
      providers: [{ provide: ScheduleStoreService, useValue: mockStore }],
    }).compileComponents();
  });

  it('renders the config panel', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.config-panel')).toBeTruthy();
  });

  it('renders a card per preset plus an add-preset card', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.preset-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.add-preset-card')).toBeTruthy();
  });

  it('uses the active preset name as the editor section title', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-title')?.textContent).toContain(
      'Summer Break',
    );
  });

  it('addPreset card calls store.addPreset and switches the active preset', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    expect(mockStore.addPreset).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.editor-title')?.textContent).toContain(
      'Preset #2',
    );
  });

  it('emits cancelled when cancel() is called', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    fixture.componentInstance.cancel();
    expect(cancelled).toBe(true);
  });

  it('empty preset shows a drop zone and only rename + delete overlay icons', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.overlay-icons app-icon')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run test:web -- schedule-config`
Expected: FAIL — `.preset-card` / `.add-preset-card` / `.editor-title` not found; component still uses the old API.

- [ ] **Step 3: Rewrite the config component class**

Replace the entire contents of `schedule-config.component.ts` with:

```ts
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ScheduleStoreService } from '../schedule-store.service';
import { ScheduleSegment } from '../schedule-formatter';
import { DEFAULT_IMAGE_SRC } from '../default-schedule';
import { DEFAULT_PRESET_ID, type SchedulePreset } from '../schedule-preset';
import { ScheduleMarkerComponent } from './schedule-marker.component';
import { IconComponent } from '../../../ui/icon/icon.component';

export interface DraftZone {
  from: string;
}

@Component({
  selector: 'app-schedule-config',
  imports: [ScheduleMarkerComponent, IconComponent],
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
export class ScheduleConfigComponent implements OnInit, OnDestroy {
  private readonly store = inject(ScheduleStoreService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // Preset list + which one is being edited (always also the active one).
  readonly presets = signal<SchedulePreset[]>([]);
  readonly activeId = signal<string>(DEFAULT_PRESET_ID);
  readonly thumbs = signal<Record<string, string>>({});

  readonly activePreset = computed(
    () => this.presets().find((p) => p.id === this.activeId()) ?? this.presets()[0],
  );
  readonly hasImage = computed(() => this.activePreset()?.hasImage ?? false);
  readonly canDelete = computed(() => this.presets().length > 1);

  // Editor state for the active preset.
  readonly previewSrc = signal(DEFAULT_IMAGE_SRC);
  readonly naturalWidth = signal(0);
  readonly naturalHeight = signal(0);
  readonly renderedWidth = signal(0);
  readonly markerSourceY = signal<number[]>([]);
  readonly draftZones = signal<DraftZone[]>([{ from: '00:00' }]);
  readonly renaming = signal(false);

  readonly scale = computed(() => {
    const nw = this.naturalWidth();
    return nw > 0 ? this.renderedWidth() / nw : 0;
  });
  readonly markerRenderedY = computed(() => this.markerSourceY().map((y) => y * this.scale()));
  readonly zoneEndTimes = computed(() => {
    const zones = this.draftZones();
    return zones.map((_, i) => (i < zones.length - 1 ? zones[i + 1].from : '24:00'));
  });
  readonly zoneBands = computed(() => {
    const s = this.scale();
    const nh = this.naturalHeight();
    const bounds = [0, ...this.markerSourceY(), nh];
    return this.draftZones().map((_, i) => {
      const startSrc = bounds[i] ?? 0;
      const endSrc = bounds[i + 1] ?? nh;
      return { top: startSrc * s, height: (endSrc - startSrc) * s };
    });
  });

  private previewObjectUrl: string | null = null;
  private readonly thumbUrls: string[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  ngOnInit(): void {
    const state = this.store.loadState();
    this.presets.set(state.presets);
    this.activeId.set(state.activePresetId);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  ngOnDestroy(): void {
    this.revokePreview();
    for (const url of this.thumbUrls) URL.revokeObjectURL(url);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  // ---- Preset selection / lifecycle ----------------------------------------

  selectPreset(id: string): void {
    if (id === this.activeId()) return;
    this.activeId.set(id);
    this.store.setActive(id);
    this.loadEditorForActive();
  }

  addPreset(): void {
    const created = this.store.addPreset();
    this.presets.set(this.store.loadState().presets);
    this.activeId.set(created.id);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  deleteActive(): void {
    if (!this.canDelete()) return;
    const id = this.activeId();
    this.store.deletePreset(id);
    const state = this.store.loadState();
    this.presets.set(state.presets);
    this.activeId.set(state.activePresetId);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  startRename(): void {
    this.renaming.set(true);
    queueMicrotask(() => this.nameInput()?.nativeElement.focus());
  }

  commitRename(value: string): void {
    const name = value.trim();
    this.renaming.set(false);
    if (!name) return;
    this.store.renamePreset(this.activeId(), name);
    this.presets.set(this.store.loadState().presets);
    this.refreshThumbs();
  }

  cancel(): void {
    this.revokePreview();
    this.cancelled.emit();
  }

  // The face listens for `saved` to refresh; with immediate commit there is no
  // staging, so "done" just signals the face to re-read and close.
  done(): void {
    this.saved.emit();
  }

  // ---- Editor: image -------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void this.applyImage(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) void this.applyImage(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async applyImage(file: Blob): Promise<void> {
    const id = this.activeId();
    await this.store.savePresetImage(id, file);
    const preset = this.activePreset();
    if (preset) preset.hasImage = true;
    this.presets.set([...this.presets()]);
    this.revokePreview();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewSrc.set(this.previewObjectUrl);
    this.refreshThumbs();
  }

  onPreviewImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
    this.naturalHeight.set(img.naturalHeight);
    this.renderedWidth.set(img.clientWidth);
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.renderedWidth.set(img.clientWidth));
      this.resizeObserver.observe(img);
    }
  }

  // ---- Editor: segments ----------------------------------------------------

  addMarker(): void {
    const nh = this.naturalHeight() > 0 ? this.naturalHeight() : 1000;
    const positions = this.markerSourceY();
    const last = positions.length > 0 ? positions[positions.length - 1] : 0;
    const newPos = (last + nh) / 2;
    const next = [...positions, newPos].sort((a, b) => a - b);
    this.markerSourceY.set(next);
    this.rebuildZones(next.length);
    this.persistSegments();
  }

  removeMarker(index: number): void {
    const positions = this.markerSourceY().filter((_, i) => i !== index);
    this.markerSourceY.set(positions);
    this.rebuildZones(positions.length);
    this.persistSegments();
  }

  updateMarkerPosition(index: number, renderedY: number): void {
    const s = this.scale();
    if (s <= 0) return;
    const positions = [...this.markerSourceY()];
    positions[index] = renderedY / s;
    positions.sort((a, b) => a - b);
    this.markerSourceY.set(positions);
    this.persistSegments();
  }

  updateZoneFrom(zoneIndex: number, value: string): void {
    const zones = [...this.draftZones()];
    zones[zoneIndex] = { from: value };
    this.draftZones.set(zones);
    this.persistSegments();
  }

  buildSegments(): ScheduleSegment[] {
    const nh = this.naturalHeight() > 0 ? this.naturalHeight() : 1000;
    const bounds = [0, ...this.markerSourceY(), nh];
    const zones = this.draftZones();
    return zones.map((zone, i) => ({
      pixelStart: Math.round(bounds[i]),
      pixelEnd: Math.round(bounds[i + 1]),
      timeStart: zone.from,
      timeEnd: i < zones.length - 1 ? zones[i + 1].from : '24:00',
    }));
  }

  private persistSegments(): void {
    this.store.updateSegments(this.activeId(), this.buildSegments());
  }

  // ---- Helpers -------------------------------------------------------------

  private loadEditorForActive(): void {
    const preset = this.activePreset();
    this.renaming.set(false);
    this.naturalWidth.set(0);
    this.naturalHeight.set(0);
    if (preset) this.initDraftFromSegments(preset.segments);
    this.revokePreview();
    this.previewSrc.set(DEFAULT_IMAGE_SRC);
    if (preset?.hasImage) {
      this.store.loadPresetImage(preset.id).then((url) => {
        if (url) {
          this.previewObjectUrl = url;
          this.previewSrc.set(url);
        }
      });
    }
  }

  private initDraftFromSegments(segs: ScheduleSegment[]): void {
    if (segs.length === 0) {
      this.markerSourceY.set([]);
      this.draftZones.set([{ from: '00:00' }]);
      return;
    }
    this.markerSourceY.set(segs.slice(0, -1).map((s) => s.pixelEnd));
    this.draftZones.set(segs.map((s) => ({ from: s.timeStart })));
  }

  private rebuildZones(markerCount: number): void {
    const current = this.draftZones();
    const zones: DraftZone[] = [];
    for (let i = 0; i <= markerCount; i++) {
      zones.push(current[i] ?? { from: '00:00' });
    }
    this.draftZones.set(zones);
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  // Thumbnail src per preset: stored image (object URL), the bundled default for
  // the default preset, or empty (placeholder rendered by the template).
  private refreshThumbs(): void {
    for (const url of this.thumbUrls) URL.revokeObjectURL(url);
    this.thumbUrls.length = 0;
    const next: Record<string, string> = {};
    for (const preset of this.presets()) {
      if (!preset.hasImage) {
        if (preset.id === DEFAULT_PRESET_ID) next[preset.id] = DEFAULT_IMAGE_SRC;
        continue;
      }
      this.store.loadPresetImage(preset.id).then((url) => {
        if (!url) return;
        this.thumbUrls.push(url);
        this.thumbs.set({ ...this.thumbs(), [preset.id]: url });
      });
    }
    this.thumbs.set(next);
  }

  thumbFor(id: string): string | null {
    return this.thumbs()[id] ?? null;
  }
}
```

- [ ] **Step 4: Rewrite the config template**

Replace the entire contents of `schedule-config.component.html` with:

```html
<div class="config-panel">
  <section class="presets-section">
    <h3>Presets</h3>
    <div class="preset-row">
      @for (preset of presets(); track preset.id) {
        <button
          type="button"
          class="preset-card"
          [class.active]="preset.id === activeId()"
          (click)="selectPreset(preset.id)"
        >
          <span class="preset-thumb">
            @if (thumbFor(preset.id)) {
              <img [src]="thumbFor(preset.id)" alt="" />
            } @else {
              <app-icon name="photo" />
            }
          </span>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      }
      <button type="button" class="add-preset-card" (click)="addPreset()" aria-label="Add preset">
        <app-icon name="plus" />
      </button>
    </div>
  </section>

  <section class="editor-section">
    <div class="editor-head">
      @if (renaming()) {
        <input
          #nameInput
          class="rename-input"
          type="text"
          [value]="activePreset()?.name ?? ''"
          (keydown.enter)="commitRename($any($event.target).value)"
          (blur)="commitRename($any($event.target).value)"
        />
      } @else {
        <h3 class="editor-title">{{ activePreset()?.name }}</h3>
      }
    </div>

    <div class="image-stage" (drop)="onDrop($event)" (dragover)="onDragOver($event)">
      <div class="overlay-icons">
        <button type="button" class="ov-btn" (click)="startRename()" aria-label="Rename preset">
          <app-icon name="pencil" />
        </button>
        @if (hasImage()) {
          <label class="ov-btn" aria-label="Swap image">
            <app-icon name="photo" />
            <input type="file" accept="image/*" (change)="onFileSelected($event)" />
          </label>
          <button type="button" class="ov-btn" (click)="addMarker()" aria-label="Add segment">
            <app-icon name="plus" />
          </button>
        }
        <button
          type="button"
          class="ov-btn"
          [disabled]="!canDelete()"
          (click)="deleteActive()"
          aria-label="Delete preset"
        >
          <app-icon name="trash" />
        </button>
      </div>

      @if (hasImage()) {
        <div class="marker-preview-container">
          <img
            class="marker-preview-img"
            [src]="previewSrc()"
            alt="Schedule preview"
            (load)="onPreviewImageLoad($event)"
          />
          @for (band of zoneBands(); track $index) {
            <div class="zone-label" [style.top.px]="band.top" [style.height.px]="band.height">
              <div class="zone-times">
                <input
                  type="time"
                  [value]="draftZones()[$index].from"
                  (change)="updateZoneFrom($index, $any($event.target).value)"
                />
                <span class="zone-end">→ {{ zoneEndTimes()[$index] }}</span>
              </div>
            </div>
          }
          @for (y of markerRenderedY(); track $index) {
            <app-schedule-marker
              [index]="$index"
              [renderedY]="y"
              (moved)="updateMarkerPosition($index, $event)"
              (removed)="removeMarker($index)"
            />
          }
        </div>
      } @else {
        <label class="drop-zone">
          <input type="file" accept="image/*" (change)="onFileSelected($event)" />
          <app-icon name="square.and.arrow.up" />
          <span>Tap to upload or drag &amp; drop a schedule image</span>
        </label>
      }
    </div>
  </section>
</div>
```

- [ ] **Step 5: Replace the config styles**

Replace the entire contents of `schedule-config.component.scss` with:

```scss
:host {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: #0b0e14;
  color: #eee;
  display: flex;
  flex-direction: column;
  animation: config-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

:host(.closing) {
  animation: config-slide-out 0.3s cubic-bezier(0.7, 0, 0.84, 0) both;
}

@keyframes config-slide-in {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
}

@keyframes config-slide-out {
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}

.config-panel {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.5rem 2rem;
}

section {
  margin-bottom: 1.5rem;

  h3 {
    font-size: 0.9rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }
}

.preset-row {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.preset-card,
.add-preset-card {
  flex: 0 0 auto;
  background: #1a1a1a;
  border: 2px solid transparent;
  border-radius: 12px;
  color: #eee;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.12s ease,
    border-color 0.2s ease;

  &:active {
    transform: scale(0.97);
  }
}

.preset-card {
  width: 88px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.active {
    border-color: #0a84ff;
  }
}

.preset-thumb {
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2a2a2a;
  color: #666;
  font-size: 1.8rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.preset-name {
  padding: 0.4rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-preset-card {
  width: 88px;
  height: 124px;
  border: 2px dashed #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  color: #888;
}

.editor-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.editor-head {
  margin-bottom: 0.75rem;
}

.editor-title {
  font-size: 1.1rem;
  color: #eee;
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
}

.rename-input {
  width: 100%;
  box-sizing: border-box;
  background: #1a1a1a;
  border: 1px solid #0a84ff;
  border-radius: 6px;
  color: #eee;
  font-size: 1.1rem;
  padding: 0.3rem 0.5rem;
}

.image-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 8px;
}

.overlay-icons {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3;
  display: flex;
  gap: 0.4rem;
}

.ov-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  color: #fff;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: transform 0.12s ease;

  &:active {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  input[type='file'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }
}

.marker-preview-container {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 8px;
}

.marker-preview-img {
  display: block;
  width: 100%;
  height: auto;
}

.drop-zone {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: 2px dashed #444;
  border-radius: 8px;
  cursor: pointer;
  color: #888;
  text-align: center;
  padding: 0 1.5rem;
  font-size: 0.9rem;

  app-icon {
    font-size: 2rem;
  }

  input[type='file'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }
}

.zone-label {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  border-top: 1px dashed rgba(255, 255, 255, 0.3);

  .zone-times {
    pointer-events: all;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: 4px;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.78);
    border-radius: 6px;
  }

  input[type='time'] {
    background: #1a1a1a;
    border: 1px solid #555;
    border-radius: 4px;
    color: #eee;
    font-size: 0.75rem;
    padding: 2px 4px;
  }

  span {
    color: #888;
    font-size: 0.75rem;
  }
}
```

- [ ] **Step 6: Point the face's save button at `config.done()`**

The face's check button calls `onSaveClick()` → `this.config()?.save()`, but the rewritten config exposes `done()` instead of `save()`. Without this change the build breaks. In `schedule-face.component.ts` change `onSaveClick`:

```ts
  onSaveClick(): void {
    this.config()?.done();
  }
```

`onGearClick` already calls `cfg.cancel()`, which the new config still implements — no change there.

- [ ] **Step 7: Run the config + face specs to verify they pass**

Run: `npm run test:web -- schedule-config schedule-face`
Expected: PASS (config: 6 tests; face: unchanged tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-config/ apps/web/src/app/faces/schedule/schedule-face.component.ts
git commit -m "feat(web): preset-managing config panel with overlay-icon editor"
```

---

## Task 6: Remove dead code (Export/Import + legacy store API)

The Export/Import feature is gone (`schedule-io.ts` is unused) and the face and
config no longer call the legacy single-schedule store methods, so they can be
removed.

**Files:**
- Delete: `apps/web/src/app/faces/schedule/schedule-io.ts`
- Delete: `apps/web/src/app/faces/schedule/schedule-io.spec.ts`
- Modify: `apps/web/src/app/faces/schedule/schedule-store.service.ts`

- [ ] **Step 1: Confirm there are no remaining references**

Run: `grep -rn "schedule-io\|serializeSegments\|parseSegments" apps/web/src`
Expected: no matches (the config rewrite dropped them).

Run: `grep -rn "\.loadSegments(\|\.saveSegments(\|\.loadImage()\|\.saveImage(\|\.removeImage()" apps/web/src`
Expected: matches only inside `schedule-store.service.ts` itself (the legacy
method definitions), and the legacy spec — not in `schedule-face.component.ts`
or `schedule-config.component.ts`. If a consumer still references them, fix that
consumer before deleting.

- [ ] **Step 2: Delete the IO files**

```bash
git rm apps/web/src/app/faces/schedule/schedule-io.ts apps/web/src/app/faces/schedule/schedule-io.spec.ts
```

- [ ] **Step 3: Remove the legacy store methods + constants**

In `schedule-store.service.ts` delete the entire `// ---- Legacy single-schedule
API ...` section — the `loadSegments`, `saveSegments`, `loadImage`, `saveImage`,
and `removeImage` methods — and delete the now-unused `SEGMENTS_KEY` and
`IDB_IMAGE_KEY` constants. Keep `IDB_DB_NAME`, `IDB_STORE_NAME`, `imageKey`, the
`LEGACY_SEGMENTS_KEY`/`LEGACY_IMAGE_KEY` imports (still used by `migrateOrSeed`/
`migrateLegacyImage`), and all preset methods.

- [ ] **Step 4: Run the full test suite + build**

Run: `npm run test:web`
Expected: PASS — all schedule, config, face, icon, and store specs green.

Run: `npm run build:web`
Expected: build succeeds (proves no consumer still referenced the removed methods).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-store.service.ts
git commit -m "chore(web): remove schedule export/import and legacy store API"
```

---

## Task 7: Full build + manual verification

**Files:** none (verification only).

- [ ] **Step 1: Build the web app**

Run: `npm run build:web`
Expected: build succeeds with no TypeScript or template errors.

- [ ] **Step 2: Run the full test suite once more**

Run: `npm run test:web`
Expected: all tests pass.

- [ ] **Step 3: Manual smoke (optional, via `npm run start:web`)**

Verify by hand:
- Daily Schedule face still shows the Summer Break image + red box.
- Gear → config shows the Presets row with the Summer Break card + a "+" card.
- "+" adds "Preset #2", switches the editor title, shows the drop zone with rename + trash icons only.
- Dropping/selecting an image reveals the photo + plus overlay icons and the marker editor.
- Rename (pencil) edits the title and the card name.
- Adding/moving boundaries and editing zone times persists (reopen config to confirm).
- Trash deletes a preset and is disabled when only one remains.
- Closing config updates the face to the active preset.

- [ ] **Step 4: Final commit (if any manual fixes were needed)**

```bash
git add -A
git commit -m "test(web): verify schedule presets build and behavior"
```

---

## Self-Review Notes

- **Spec coverage:** presets model (Task 2), per-preset images + migration (Task 2), CRUD + last-preset guard + `Preset #N` numbering (Task 3), face renders active preset (Task 4), presets row + overlay-icon editor + drop zone + immediate commit (Task 5), removed Schedule Image section / add-boundary button / Export-Import (Tasks 5 & 6), SF-symbol icon layer (Task 1), commit-immediately model (Task 5, no Save staging — `done()` only signals the face to refresh). All covered.
- **Naming consistency:** preset store methods (`loadState`, `addPreset`, `renamePreset`, `deletePreset`, `setActive`, `updateSegments`, `loadPresetImage(id)`, `savePresetImage(id, blob)`, `removePresetImage(id)`) are used identically across the service, face, and config. The legacy `loadSegments`/`saveSegments`/`loadImage`/`saveImage`/`removeImage` coexist only through Tasks 2–5 (so unmigrated consumers compile) and are deleted in Task 6. The config calls `done()`; the face's `onSaveClick` calls `done()`.
- **Migration caveat:** `hasImage` for a migrated legacy image is set asynchronously (IDB cannot be read synchronously). The seed persists `hasImage: false`, then the async re-key flips it and re-persists; the face/config read the corrected state on their next `loadState`. This is acceptable because the face calls `loadPresetImage(id)` regardless and falls back to the default image.
