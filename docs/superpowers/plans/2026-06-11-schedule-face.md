# Daily Schedule Face Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Daily Schedule" clock face that pans a user-uploaded schedule image in real time so the current time is always centered, with a red box highlighting the active segment.

**Architecture:** A `ScheduleFaceComponent` renders an `<img>` inside a `translateY`-animated stage div alongside a red-box overlay; a gear icon opens `ScheduleConfigComponent` as a full-face overlay where users upload an image (stored in IndexedDB) and drag horizontal markers to define time-to-pixel segments (stored in localStorage). A pure `schedule-formatter.ts` handles all pixel interpolation math. A `ScheduleStoreService` handles all persistence. The face is registered in the existing `FACES` registry so it appears in the picker automatically.

**Tech Stack:** Angular 21 signals + standalone components, Vitest, IndexedDB (native browser API), localStorage, CSS `transform: translateY`, pointer events for drag.

**Spec:** `docs/superpowers/specs/2026-06-11-schedule-face-design.md`

---

## Context for a zero-context engineer

- Work from `/Volumes/AllyDrive/Storage/Repos/allyclock`. Branch: `main`.
- Run tests: `npm run test:web` (from repo root). Build: `npm run build:web`.
- The app is **zoneless** (signals only). In tests, always call `fixture.detectChanges()` after changing signal state.
- `new Date('2026-06-11T10:30:00')` (no `Z`) is always local time — `date.getHours()` returns `10` regardless of the test machine's timezone. Use this for deterministic time-based tests.
- TypeScript style: two-space indent, single quotes, final newlines.
- `ScheduleSegment` is defined in `schedule-formatter.ts` (Task 2) and imported everywhere else. Do not re-define it.

## File Structure (end state)

```text
apps/web/src/app/faces/schedule/
├── default-schedule.ts                           # Placeholder SVG data URL + DEFAULT_SEGMENTS
├── schedule-formatter.ts                         # Pure fns: currentPixelY, activeSegment; ScheduleSegment type
├── schedule-formatter.spec.ts
├── schedule-store.service.ts                     # IndexedDB image + localStorage segments
├── schedule-store.service.spec.ts
├── schedule-face.component.ts/.html/.scss/.spec.ts
└── schedule-config/
    └── schedule-config.component.ts/.html/.scss/.spec.ts

apps/web/src/app/faces/face-registry.ts           # Modified: add schedule entry
```

---

### Task 1: default-schedule.ts — placeholder image and default segments

The placeholder is an SVG embedded as a data URL (no binary asset needed). It shows six colored bands representing a typical day: sleep, work morning, lunch, work afternoon, evening, night.

**Files:**
- Create: `apps/web/src/app/faces/schedule/default-schedule.ts`

- [ ] **Step 1: Create the file**

```ts
import { ScheduleSegment } from './schedule-formatter';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000">
  <rect x="0" y="0" width="400" height="375" fill="#0d1b2a"/>
  <text x="200" y="180" text-anchor="middle" fill="#4a7fa5" font-size="28" font-family="sans-serif">Sleep</text>
  <text x="200" y="215" text-anchor="middle" fill="#4a7fa5" font-size="18" font-family="sans-serif">00:00 – 09:00</text>
  <rect x="0" y="375" width="400" height="150" fill="#2a1a0a"/>
  <text x="200" y="447" text-anchor="middle" fill="#c87941" font-size="24" font-family="sans-serif">Work Morning</text>
  <text x="200" y="477" text-anchor="middle" fill="#c87941" font-size="16" font-family="sans-serif">09:00 – 12:00</text>
  <rect x="0" y="525" width="400" height="75" fill="#0a2a0a"/>
  <text x="200" y="566" text-anchor="middle" fill="#4ab841" font-size="18" font-family="sans-serif">Lunch 12:00 – 13:00</text>
  <rect x="0" y="600" width="400" height="150" fill="#2a1a0a"/>
  <text x="200" y="672" text-anchor="middle" fill="#c87941" font-size="24" font-family="sans-serif">Work Afternoon</text>
  <text x="200" y="702" text-anchor="middle" fill="#c87941" font-size="16" font-family="sans-serif">13:00 – 18:00</text>
  <rect x="0" y="750" width="400" height="150" fill="#1a0a2a"/>
  <text x="200" y="822" text-anchor="middle" fill="#9841c8" font-size="24" font-family="sans-serif">Evening</text>
  <text x="200" y="852" text-anchor="middle" fill="#9841c8" font-size="16" font-family="sans-serif">18:00 – 21:00</text>
  <rect x="0" y="900" width="400" height="100" fill="#0d1b2a"/>
  <text x="200" y="953" text-anchor="middle" fill="#4a7fa5" font-size="18" font-family="sans-serif">Night 21:00 – 24:00</text>
</svg>`;

export const DEFAULT_IMAGE_SRC =
  'data:image/svg+xml,' + encodeURIComponent(svg);

export const DEFAULT_SEGMENTS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 375, timeStart: '00:00', timeEnd: '09:00' },
  { pixelStart: 375, pixelEnd: 525, timeStart: '09:00', timeEnd: '12:00' },
  { pixelStart: 525, pixelEnd: 600, timeStart: '12:00', timeEnd: '13:00' },
  { pixelStart: 600, pixelEnd: 750, timeStart: '13:00', timeEnd: '18:00' },
  { pixelStart: 750, pixelEnd: 900, timeStart: '18:00', timeEnd: '21:00' },
  { pixelStart: 900, pixelEnd: 1000, timeStart: '21:00', timeEnd: '24:00' },
];
```

Note: This file imports `ScheduleSegment` from `./schedule-formatter` which does not exist yet. That is fine — it will be created in Task 2. Create `default-schedule.ts` first; the TypeScript error resolves when Task 2 is done.

- [ ] **Step 2: Verify the file exists**

```bash
ls apps/web/src/app/faces/schedule/default-schedule.ts
```

No test for this file — it is pure static data exercised by every consumer's tests.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/faces/schedule/default-schedule.ts
git commit -m "feat(web): add schedule face default image and segments"
```

---

### Task 2: schedule-formatter.ts — pure time-to-pixel functions

All time math lives here. No Angular, no side effects. Uses `date.getHours()`/`getMinutes()`/`getSeconds()` (local time) because the spec requires browser-local timezone.

**Files:**
- Create: `apps/web/src/app/faces/schedule/schedule-formatter.ts`
- Test: `apps/web/src/app/faces/schedule/schedule-formatter.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { activeSegment, currentPixelY } from './schedule-formatter';
import type { ScheduleSegment } from './schedule-formatter';

// new Date('...T...:...') without Z = local time, getHours() is deterministic
const at = (h: number, m: number, s = 0) =>
  new Date(`2026-06-11T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

const SEGS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '10:00' },
  { pixelStart: 500, pixelEnd: 700, timeStart: '10:00', timeEnd: '14:00' },
  { pixelStart: 700, pixelEnd: 1000, timeStart: '14:00', timeEnd: '24:00' },
];

describe('currentPixelY', () => {
  it('returns pixelStart at the exact start of a segment', () => {
    expect(currentPixelY(at(10, 0), SEGS)).toBe(500);
  });

  it('interpolates at the midpoint of a segment', () => {
    // 10:00–14:00 is 240 min, midpoint at 12:00 = 120 min in
    // progress = 120/240 = 0.5, pixelY = 500 + 0.5 * 200 = 600
    expect(currentPixelY(at(12, 0), SEGS)).toBeCloseTo(600);
  });

  it('returns pixelEnd at the exact end of the last segment', () => {
    // 24:00 = midnight next day = 0h0m clamp-after
    expect(currentPixelY(at(23, 59, 59), SEGS)).toBeCloseTo(1000, 0);
  });

  it('clamps to pixelStart of first segment when time is before all segments', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(currentPixelY(at(5, 0), lateSegs)).toBe(200);
  });

  it('clamps to pixelEnd of last segment when time is after all segments', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(currentPixelY(at(22, 0), earlySegs)).toBe(400);
  });

  it('handles single-segment: returns midpoint at midtime', () => {
    const single: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 1000, timeStart: '00:00', timeEnd: '24:00' },
    ];
    // 12:00 = 720 min, progress = 720/1440 = 0.5, pixelY = 500
    expect(currentPixelY(at(12, 0), single)).toBeCloseTo(500);
  });

  it('returns 0 for empty segments', () => {
    expect(currentPixelY(at(12, 0), [])).toBe(0);
  });
});

describe('activeSegment', () => {
  it('returns the segment containing the current time', () => {
    expect(activeSegment(at(11, 0), SEGS)).toEqual(SEGS[1]);
  });

  it('clamps to first segment when before all', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(activeSegment(at(5, 0), lateSegs)).toEqual(lateSegs[0]);
  });

  it('clamps to last segment when after all', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(activeSegment(at(22, 0), earlySegs)).toEqual(earlySegs[0]);
  });

  it('returns first segment for empty array', () => {
    expect(activeSegment(at(12, 0), [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./schedule-formatter`.

- [ ] **Step 3: Write the implementation**

```ts
export interface ScheduleSegment {
  pixelStart: number;
  pixelEnd: number;
  timeStart: string; // "HH:MM" 24-hour
  timeEnd: string;   // "HH:MM" 24-hour
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function currentPixelY(date: Date, segments: ScheduleSegment[]): number {
  if (segments.length === 0) return 0;

  const now = nowMinutes(date);
  const first = segments[0];
  const last = segments[segments.length - 1];

  if (now <= toMinutes(first.timeStart)) return first.pixelStart;
  if (now >= toMinutes(last.timeEnd)) return last.pixelEnd;

  const seg = segments.find(
    (s) => now >= toMinutes(s.timeStart) && now < toMinutes(s.timeEnd),
  );
  if (!seg) return last.pixelEnd;

  const segStartMin = toMinutes(seg.timeStart);
  const segEndMin = toMinutes(seg.timeEnd);
  const progress = (now - segStartMin) / (segEndMin - segStartMin);
  return seg.pixelStart + progress * (seg.pixelEnd - seg.pixelStart);
}

export function activeSegment(date: Date, segments: ScheduleSegment[]): ScheduleSegment | null {
  if (segments.length === 0) return null;

  const now = nowMinutes(date);
  const first = segments[0];
  const last = segments[segments.length - 1];

  if (now <= toMinutes(first.timeStart)) return first;
  if (now >= toMinutes(last.timeEnd)) return last;

  return (
    segments.find((s) => now >= toMinutes(s.timeStart) && now < toMinutes(s.timeEnd)) ?? last
  );
}
```

- [ ] **Step 4: Run to verify tests pass**

Run: `npm run test:web`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-formatter.ts apps/web/src/app/faces/schedule/schedule-formatter.spec.ts
git commit -m "feat(web): add schedule-formatter pure functions"
```

---

### Task 3: ScheduleStoreService — IndexedDB image + localStorage segments

**Files:**
- Create: `apps/web/src/app/faces/schedule/schedule-store.service.ts`
- Test: `apps/web/src/app/faces/schedule/schedule-store.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

The IDB methods are tested by mocking `indexedDB.open` via `vi.stubGlobal`. localStorage is available natively in jsdom.

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleStoreService } from './schedule-store.service';
import { DEFAULT_SEGMENTS } from './default-schedule';

// Minimal IDB mock
function makeIdbMock() {
  const store: Record<string, unknown> = {};
  const makeRequest = <T>(result: T): IDBRequest<T> => {
    const req = { result, error: null } as unknown as IDBRequest<T>;
    setTimeout(() => (req as unknown as { onsuccess: (e: Event) => void }).onsuccess?.({ target: req } as Event), 0);
    return req;
  };
  const makeTx = (mode: string) => {
    const tx = {
      objectStore: () => ({
        put: (val: unknown, key: string) => { store[key] = val; return makeRequest(undefined); },
        get: (key: string) => makeRequest(store[key] as Blob | undefined),
        delete: (key: string) => { delete store[key]; return makeRequest(undefined); },
      }),
      oncomplete: null as (() => void) | null,
      onerror: null,
    };
    setTimeout(() => tx.oncomplete?.(), 10);
    return tx;
  };
  const db = { transaction: (_: string, mode?: string) => makeTx(mode ?? 'readonly') };
  const openReq = {
    result: db,
    error: null,
    onupgradeneeded: null as ((e: unknown) => void) | null,
    onsuccess: null as ((e: unknown) => void) | null,
    onerror: null,
  };
  setTimeout(() => {
    openReq.onupgradeneeded?.({ target: openReq });
    openReq.onsuccess?.({ target: openReq });
  }, 0);
  return {
    open: () => openReq as unknown as IDBOpenDBRequest,
    store,
  };
}

describe('ScheduleStoreService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
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
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
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
```

- [ ] **Step 2: Run to verify new tests fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./schedule-store.service`.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run to verify tests pass**

Run: `npm run test:web`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-store.service.ts apps/web/src/app/faces/schedule/schedule-store.service.spec.ts
git commit -m "feat(web): add ScheduleStoreService (IndexedDB image + localStorage segments)"
```

---

### Task 4: ScheduleFaceComponent — face shell

Renders the image stage, red box, and gear button. The gear uses the same auto-hide pattern as `ConfigureButtonComponent` but is local to this component (different position, icon, and no `focusButton()` needed).

**Files:**
- Create: `apps/web/src/app/faces/schedule/schedule-face.component.ts`
- Create: `apps/web/src/app/faces/schedule/schedule-face.component.html`
- Create: `apps/web/src/app/faces/schedule/schedule-face.component.scss`
- Test: `apps/web/src/app/faces/schedule/schedule-face.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleFaceComponent } from './schedule-face.component';
import { ScheduleStoreService } from './schedule-store.service';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';

const mockStore = {
  loadSegments: () => DEFAULT_SEGMENTS,
  loadImage: () => Promise.resolve(null),
  saveImage: vi.fn(),
  removeImage: vi.fn(),
  saveSegments: vi.fn(),
};

describe('ScheduleFaceComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ScheduleFaceComponent],
      providers: [{ provide: ScheduleStoreService, useValue: mockStore }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an img element', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
  });

  it('renders the red-box overlay', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.red-box')).toBeTruthy();
  });

  it('img src defaults to DEFAULT_IMAGE_SRC', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('data:image/svg+xml');
  });

  it('gear button is visible on load', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    const gear = fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement;
    expect(gear.classList.contains('hidden')).toBe(false);
  });

  it('gear button hides after 4s', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    const gear = fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement;
    expect(gear.classList.contains('hidden')).toBe(true);
  });

  it('gear button opens config overlay', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-schedule-config')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./schedule-face.component`.

- [ ] **Step 3: Write the component files**

`schedule-face.component.ts`:

```ts
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ScheduleStoreService } from './schedule-store.service';
import { ScheduleConfigComponent } from './schedule-config/schedule-config.component';
import { activeSegment, currentPixelY } from './schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-schedule-face',
  imports: [ScheduleConfigComponent],
  templateUrl: './schedule-face.component.html',
  styleUrl: './schedule-face.component.scss',
  host: {
    '(document:pointermove)': 'revealGear()',
    '(document:pointerdown)': 'revealGear()',
    '(document:keydown)': 'revealGear()',
  },
})
export class ScheduleFaceComponent implements OnInit, OnDestroy {
  private readonly clock = inject(ClockService);
  private readonly store = inject(ScheduleStoreService);
  private readonly imgRef = viewChild<ElementRef<HTMLImageElement>>('schedImg');

  readonly defaultImageSrc = DEFAULT_IMAGE_SRC;
  readonly imageUrl = signal(DEFAULT_IMAGE_SRC);
  readonly segments = signal(DEFAULT_SEGMENTS);
  readonly naturalWidth = signal(0);
  readonly viewportWidth = signal(window.innerWidth);
  readonly viewportHeight = signal(window.innerHeight);
  readonly gearVisible = signal(true);
  readonly configOpen = signal(false);

  private gearTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly onResize = () => {
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
  };

  readonly scaleFactor = computed(() => {
    const nw = this.naturalWidth();
    return nw === 0 ? 1 : this.viewportWidth() / nw;
  });

  readonly translateY = computed(() => {
    const pixY = currentPixelY(this.clock.now(), this.segments());
    const vh = this.viewportHeight();
    return -(pixY * this.scaleFactor() - vh / 2);
  });

  readonly redBoxTop = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments());
    return seg ? seg.pixelStart * this.scaleFactor() : 0;
  });

  readonly redBoxHeight = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments());
    return seg ? (seg.pixelEnd - seg.pixelStart) * this.scaleFactor() : 0;
  });

  ngOnInit(): void {
    window.addEventListener('resize', this.onResize);
    this.armGearTimer();
    this.segments.set(this.store.loadSegments());
    this.store.loadImage().then((url) => {
      if (url) this.imageUrl.set(url);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.gearTimer);
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
  }

  revealGear(): void {
    if (this.configOpen()) return;
    this.gearVisible.set(true);
    this.armGearTimer();
  }

  onConfigSaved(): void {
    this.segments.set(this.store.loadSegments());
    this.store.loadImage().then((url) => {
      if (url) this.imageUrl.set(url);
    });
    this.configOpen.set(false);
  }

  private armGearTimer(): void {
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.gearVisible.set(false), HIDE_DELAY_MS);
  }
}
```

`schedule-face.component.html`:

```html
<div class="stage" [style.transform]="'translateY(' + translateY() + 'px)'">
  <img
    #schedImg
    [src]="imageUrl()"
    alt="Daily schedule"
    (load)="onImageLoad($event)"
    (error)="imageUrl.set(defaultImageSrc)"
  />
  <div
    class="red-box"
    [style.top.px]="redBoxTop()"
    [style.height.px]="redBoxHeight()"
  ></div>
</div>
<button
  type="button"
  class="gear"
  [class.hidden]="!gearVisible() && !configOpen()"
  (click)="configOpen.set(true)"
>⚙</button>
@if (configOpen()) {
  <app-schedule-config
    (saved)="onConfigSaved()"
    (cancelled)="configOpen.set(false)"
  />
}
```

`schedule-face.component.scss`:

```scss
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.stage {
  position: absolute;
  left: 0;
  right: 0;
}

img {
  display: block;
  width: 100%;
  height: auto;
}

.red-box {
  position: absolute;
  left: 0;
  right: 0;
  border: 5px solid #ff0000;
  pointer-events: none;
  box-sizing: border-box;
}

.gear {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: rgba(30, 30, 30, 0.85);
  color: #eee;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.1rem;
  cursor: pointer;
  z-index: 10;
  opacity: 1;
  transition: opacity 0.3s ease;

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
}
```

- [ ] **Step 4: Create a placeholder `ScheduleConfigComponent` so the import resolves**

Create `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts` with the minimal scaffold (Task 5 will fill it in):

```ts
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-schedule-config',
  template: '<div class="schedule-config-placeholder"></div>',
})
export class ScheduleConfigComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();
}
```

- [ ] **Step 5: Run to verify tests pass**

Run: `npm run test:web`
Expected: PASS (all suites). The gear-opens-config test passes because the placeholder renders `app-schedule-config`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/faces/schedule
git commit -m "feat(web): add ScheduleFaceComponent with image panning and red-box overlay"
```

---

### Task 5: ScheduleConfigComponent — image upload

Replaces the placeholder from Task 4 with a full config overlay. This task delivers the image upload section and the overall panel structure. The drag-marker editor is wired in Task 6.

**Files:**
- Modify: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts`
- Create: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.html`
- Create: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.scss`
- Test: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleConfigComponent } from './schedule-config.component';
import { ScheduleStoreService } from '../schedule-store.service';
import { DEFAULT_SEGMENTS } from '../default-schedule';

const mockStore = {
  loadSegments: vi.fn(() => DEFAULT_SEGMENTS),
  saveSegments: vi.fn(),
  loadImage: vi.fn(() => Promise.resolve(null)),
  saveImage: vi.fn(() => Promise.resolve()),
  removeImage: vi.fn(() => Promise.resolve()),
};

describe('ScheduleConfigComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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

  it('renders the image upload zone', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeTruthy();
  });

  it('emits cancelled when Cancel is clicked', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => { cancelled = true; });
    (fixture.nativeElement.querySelector('button.cancel') as HTMLButtonElement).click();
    expect(cancelled).toBe(true);
  });

  it('Save calls saveSegments and emits saved', async () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let saved = false;
    fixture.componentInstance.saved.subscribe(() => { saved = true; });
    await (fixture.nativeElement.querySelector('button.save') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(mockStore.saveSegments).toHaveBeenCalled();
    expect(saved).toBe(true);
  });

  it('Remove image calls store.removeImage', async () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    const removeBtn = fixture.nativeElement.querySelector('button.remove-image') as HTMLButtonElement;
    removeBtn.click();
    expect(mockStore.removeImage).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

Run: `npm run test:web`
Expected: FAIL — `ScheduleConfigComponent` still has the placeholder template (no `.config-panel`).

- [ ] **Step 3: Write the component**

`schedule-config.component.ts`:

```ts
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ScheduleStoreService } from '../schedule-store.service';
import { ScheduleSegment } from '../schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from '../default-schedule';

export interface DraftZone {
  timeStart: string;
  timeEnd: string;
}

@Component({
  selector: 'app-schedule-config',
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
export class ScheduleConfigComponent implements OnInit {
  private readonly store = inject(ScheduleStoreService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly previewSrc = signal(DEFAULT_IMAGE_SRC);
  readonly naturalWidth = signal(400);
  readonly naturalHeight = signal(1000);

  // Draft state: marker Y positions in rendered-preview pixels, sorted ascending
  readonly markerPositions = signal<number[]>([]);
  // One zone per gap: zones[i] = zone between markerPositions[i-1] and markerPositions[i]
  // zones.length = markerPositions.length + 1
  readonly draftZones = signal<DraftZone[]>([{ timeStart: '00:00', timeEnd: '24:00' }]);

  private pendingBlob: Blob | null = null;
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    const segs = this.store.loadSegments();
    this.initDraftFromSegments(segs);
    this.store.loadImage().then((url) => {
      if (url) {
        this.previewObjectUrl = url;
        this.previewSrc.set(url);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingBlob = file;
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewSrc.set(this.previewObjectUrl);
  }

  onPreviewImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
    this.naturalHeight.set(img.naturalHeight);
  }

  async removeImage(): Promise<void> {
    this.pendingBlob = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    await this.store.removeImage();
    this.previewSrc.set(DEFAULT_IMAGE_SRC);
  }

  async save(): Promise<void> {
    if (this.pendingBlob) {
      await this.store.saveImage(this.pendingBlob);
      this.pendingBlob = null;
    }
    const segments = this.buildSegments();
    this.store.saveSegments(segments);
    this.saved.emit();
  }

  cancel(): void {
    if (this.pendingBlob && this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
      this.pendingBlob = null;
    }
    this.cancelled.emit();
  }

  addMarker(): void {
    const positions = [...this.markerPositions()];
    // Insert at the rendered-pixel midpoint of the preview image
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedHeight = previewEl?.offsetHeight ?? this.naturalHeight();
    const mid = renderedHeight / 2;
    positions.push(mid);
    positions.sort((a, b) => a - b);
    this.markerPositions.set(positions);
    this.rebuildZones(positions);
  }

  removeMarker(index: number): void {
    const positions = this.markerPositions().filter((_, i) => i !== index);
    this.markerPositions.set(positions);
    this.rebuildZones(positions);
  }

  updateMarkerPosition(index: number, renderedY: number): void {
    const positions = [...this.markerPositions()];
    positions[index] = renderedY;
    positions.sort((a, b) => a - b);
    this.markerPositions.set(positions);
  }

  updateZoneTime(zoneIndex: number, field: 'timeStart' | 'timeEnd', value: string): void {
    const zones = [...this.draftZones()];
    zones[zoneIndex] = { ...zones[zoneIndex], [field]: value };
    this.draftZones.set(zones);
  }

  buildSegments(): ScheduleSegment[] {
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedHeight = previewEl?.offsetHeight ?? this.naturalHeight();
    const scaleToSource = this.naturalHeight() / renderedHeight;

    const positions = this.markerPositions();
    const zones = this.draftZones();
    const segments: ScheduleSegment[] = [];

    for (let i = 0; i <= positions.length; i++) {
      const pixelStart = i === 0 ? 0 : Math.round(positions[i - 1] * scaleToSource);
      const pixelEnd =
        i === positions.length
          ? this.naturalHeight()
          : Math.round(positions[i] * scaleToSource);
      segments.push({
        pixelStart,
        pixelEnd,
        timeStart: zones[i]?.timeStart ?? '00:00',
        timeEnd: zones[i]?.timeEnd ?? '24:00',
      });
    }
    return segments;
  }

  private initDraftFromSegments(segs: ScheduleSegment[]): void {
    if (segs.length === 0) {
      this.markerPositions.set([]);
      this.draftZones.set([{ timeStart: '00:00', timeEnd: '24:00' }]);
      return;
    }
    // Convert source-pixel boundaries back to rendered-preview positions
    // Use naturalHeight as the scale reference before the image loads
    const nh = this.naturalHeight();
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedH = previewEl?.offsetHeight ?? nh;
    const scale = renderedH / nh;

    const positions = segs.slice(0, -1).map((s) => s.pixelEnd * scale);
    const zones = segs.map((s) => ({ timeStart: s.timeStart, timeEnd: s.timeEnd }));
    this.markerPositions.set(positions);
    this.draftZones.set(zones);
  }

  private rebuildZones(positions: number[]): void {
    const currentZones = this.draftZones();
    const newZones: DraftZone[] = [];
    for (let i = 0; i <= positions.length; i++) {
      newZones.push(currentZones[i] ?? { timeStart: '00:00', timeEnd: '24:00' });
    }
    this.draftZones.set(newZones);
  }
}
```

`schedule-config.component.html`:

```html
<div class="config-panel">
  <div class="header">
    <h2>Daily Schedule</h2>
    <div class="header-actions">
      <button type="button" class="cancel" (click)="cancel()">Cancel</button>
      <button type="button" class="save" (click)="save()">Save</button>
    </div>
  </div>

  <section class="image-section">
    <h3>Schedule Image</h3>
    <label class="upload-zone">
      <input type="file" accept="image/*" (change)="onFileSelected($event)" />
      <span>Tap to upload a schedule image</span>
    </label>
    <button type="button" class="remove-image" (click)="removeImage()">Remove image</button>
  </section>

  <section class="editor-section">
    <h3>Time Segments</h3>
    <p class="hint">Drag the lines to set segment boundaries. Set time ranges in each zone.</p>
    <div class="marker-preview-container">
      <img
        class="marker-preview-img"
        [src]="previewSrc()"
        alt="Schedule preview"
        (load)="onPreviewImageLoad($event)"
      />
      @for (pos of markerPositions(); track $index) {
        <app-schedule-marker
          [index]="$index"
          [renderedY]="pos"
          (moved)="updateMarkerPosition($index, $event)"
          (removed)="removeMarker($index)"
        />
      }
      @for (zone of draftZones(); track $index) {
        <div
          class="zone-label"
          [style.top.px]="$index === 0 ? 0 : markerPositions()[$index - 1]"
          [style.height.px]="$index === markerPositions().length
            ? 9999
            : (markerPositions()[$index] - ($index === 0 ? 0 : markerPositions()[$index - 1]))"
        >
          <input
            type="time"
            [value]="zone.timeStart"
            (change)="updateZoneTime($index, 'timeStart', $any($event.target).value)"
          />
          <span>–</span>
          <input
            type="time"
            [value]="zone.timeEnd"
            (change)="updateZoneTime($index, 'timeEnd', $any($event.target).value)"
          />
        </div>
      }
    </div>
    <button type="button" class="add-marker" (click)="addMarker()">+ Add segment boundary</button>
  </section>
</div>
```

Note: `<app-schedule-marker>` is a helper component created in Task 6. Add a placeholder import for it now so the template compiles — Task 6 replaces it with the real implementation.

`schedule-config.component.scss`:

```scss
:host {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(0, 0, 0, 0.92);
  overflow-y: auto;
  color: #eee;
}

.config-panel {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;

  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.cancel,
.save,
.add-marker {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.save {
  border-color: #4a9eff;
  color: #4a9eff;
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

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #444;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  margin-bottom: 0.5rem;

  input[type='file'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }

  span {
    color: #888;
    font-size: 0.9rem;
  }
}

.remove-image {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
}

.hint {
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

.marker-preview-container {
  position: relative;
  max-height: 300px;
  overflow-y: auto;
  border-radius: 8px;
  overflow-x: hidden;
}

.marker-preview-img {
  display: block;
  width: 100%;
  height: auto;
}

.zone-label {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 4px 6px;
  pointer-events: none;

  input[type='time'] {
    pointer-events: all;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #555;
    border-radius: 4px;
    color: #eee;
    font-size: 0.75rem;
    padding: 2px 4px;
    width: 80px;
  }

  span {
    color: #888;
    font-size: 0.75rem;
    line-height: 1.6;
  }
}

.add-marker {
  margin-top: 0.75rem;
  width: 100%;
}
```

- [ ] **Step 4: Run to verify tests pass**

Run: `npm run test:web`
Expected: PASS.

Note: If the template fails to compile because `app-schedule-marker` is unknown, add `schemas: [NO_ERRORS_SCHEMA]` to the `TestBed.configureTestingModule` call in the spec until Task 6 provides the real component.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-config
git commit -m "feat(web): add ScheduleConfigComponent with image upload"
```

---

### Task 6: ScheduleMarkerComponent — draggable marker lines

A small single-purpose component for a draggable horizontal line. `ScheduleConfigComponent` already renders `<app-schedule-marker>` in its template; this task creates the real implementation.

**Files:**
- Create: `apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.ts`
- Create: `apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.html`
- Create: `apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.scss`
- Modify: `apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts` (import the marker)

No spec file for the marker — its behavior is covered by the integration through `ScheduleConfigComponent`.

- [ ] **Step 1: Write the marker component files**

`schedule-marker.component.ts`:

```ts
import { Component, ElementRef, OnDestroy, inject, input, output } from '@angular/core';

@Component({
  selector: 'app-schedule-marker',
  templateUrl: './schedule-marker.component.html',
  styleUrl: './schedule-marker.component.scss',
})
export class ScheduleMarkerComponent implements OnDestroy {
  private readonly el = inject(ElementRef);

  readonly index = input.required<number>();
  readonly renderedY = input.required<number>();
  readonly moved = output<number>();
  readonly removed = output<void>();

  private dragging = false;
  private startY = 0;
  private startPos = 0;

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const delta = e.clientY - this.startY;
    const newY = Math.max(0, this.startPos + delta);
    this.moved.emit(newY);
  };

  private readonly onPointerUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  };

  onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.dragging = true;
    this.startY = e.clientY;
    this.startPos = this.renderedY();
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}
```

`schedule-marker.component.html`:

```html
<div
  class="marker-line"
  [style.top.px]="renderedY()"
  (pointerdown)="onPointerDown($event)"
>
  <span class="marker-remove" (click)="removed.emit()">✕</span>
</div>
```

`schedule-marker.component.scss`:

```scss
:host {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
}

.marker-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: #4a9eff;
  cursor: ns-resize;
  touch-action: none;
}

.marker-remove {
  position: absolute;
  right: 4px;
  top: -10px;
  font-size: 0.75rem;
  color: #4a9eff;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
```

- [ ] **Step 2: Add the import to ScheduleConfigComponent**

In `schedule-config.component.ts`, add `ScheduleMarkerComponent` to imports:

```ts
import { ScheduleMarkerComponent } from './schedule-marker.component';

@Component({
  selector: 'app-schedule-config',
  imports: [ScheduleMarkerComponent],   // <-- add this
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
```

Remove `schemas: [NO_ERRORS_SCHEMA]` from the test if it was added in Task 5 Step 4.

- [ ] **Step 3: Run to verify all tests pass**

Run: `npm run test:web`
Expected: PASS (all suites).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.ts \
        apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.html \
        apps/web/src/app/faces/schedule/schedule-config/schedule-marker.component.scss \
        apps/web/src/app/faces/schedule/schedule-config/schedule-config.component.ts
git commit -m "feat(web): add draggable ScheduleMarkerComponent for segment editor"
```

---

### Task 7: Register face + build + lint + docs

**Files:**
- Modify: `apps/web/src/app/faces/face-registry.ts`
- Modify: root `CLAUDE.md` and `apps/web/CLAUDE.md` (minor doc updates)

- [ ] **Step 1: Add the schedule face to the registry**

Open `apps/web/src/app/faces/face-registry.ts`. Add the import and registry entry:

```ts
import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';
import { ScheduleFaceComponent } from './schedule/schedule-face.component';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  { id: 'fullscreen', displayName: 'Fullscreen', component: FullscreenFaceComponent },
  { id: 'world-cards', displayName: 'World Cards', component: WorldCardsFaceComponent },
  { id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
```

- [ ] **Step 2: Run tests to confirm registry change passes**

Run: `npm run test:web`

The face-picker sheet test asserts `toHaveLength(2)` for `button.face-option`. Update it to `toHaveLength(3)`:

In `apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.spec.ts`, find:

```ts
expect(options).toHaveLength(2);
```

Change to:

```ts
expect(options).toHaveLength(3);
```

Run `npm run test:web` again. Expected: PASS (all suites).

- [ ] **Step 3: Build and lint**

```bash
npm run build:web
npm --prefix apps/web run lint
```

Expected: build green, lint clean. If lint reports issues fix them before continuing.

- [ ] **Step 4: Update CLAUDE.md docs**

In `apps/web/CLAUDE.md`, under "Important Files", add after the `face-registry.ts` line:

```markdown
- `src/app/faces/schedule/` contains the Daily Schedule face: image panning, drag-marker config, and IndexedDB image storage.
```

In root `CLAUDE.md`, under "Important Files", the existing line already covers faces generically — no change needed unless you want to add the schedule-specific note.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/face-registry.ts \
        apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.spec.ts \
        apps/web/CLAUDE.md
git commit -m "feat(web): register Daily Schedule face in registry"
```

---

## Verification checklist (after all tasks)

- `npm run build:web` — green, no warnings
- `npm run test:web` — all specs pass
- `npm --prefix apps/web run lint` — clean
- Manual smoke test:
  1. `npm run start:web`, open http://localhost:4200
  2. Open face picker (Configure button) — "Daily Schedule" appears as option 3 with a live SVG preview
  3. Select Daily Schedule — placeholder image loads, vertically centered on current time, red box on active segment
  4. Move mouse, gear icon appears bottom-right
  5. Tap gear → config overlay opens; upload an image; drag marker lines to set boundaries; set time inputs; Save
  6. Face updates to new image with new segments
  7. Reload page — image and segments persist
