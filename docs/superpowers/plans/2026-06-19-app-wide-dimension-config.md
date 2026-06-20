# App-Wide Dimension Config + Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the Fullscreen face's ratio-band presets into an app-wide dimension registry + per-face config store, and add two app-shell overlays (top-left `W × H · BAND` label, top-right LIVE/MOCK chip) shown across all faces.

**Architecture:** A shared `DimensionRegistry` owns the ratio bands (resolve-by-ratio + persistence). A generic `BandConfigStore<T>` holds per-face config keyed by band id; `FullscreenConfigStore` extends it. An app-shell `FaceOverlayComponent` renders the label + chip with a glow legibility effect and its own auto-hide. `FaceDescriptor.configComponent` gates the Adjust button.

**Tech Stack:** Angular 21 standalone + signals (zoneless), Vitest (`@angular/build:unit-test`), SCSS with `@use 'tokens'`, localStorage persistence.

**Conventions for every task:**
- Run all commands from the repo root `/Volumes/AllyDrive/Storage/Repos/allyclock`.
- Tests: `npm run test:web` runs the whole suite (~30s); read its output for the named test. Build: `npm run build:web`.
- Two-space indent, single quotes, final newline.
- Every commit message ends with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Spec: `docs/superpowers/specs/2026-06-19-app-wide-dimension-config-design.md`.

---

## File Structure

**Create**
- `apps/web/src/app/faces/dimension-band.ts` — `DimensionBand` type, `BUILT_IN_BANDS`, `buildDefaultDimensions()`, storage key/version.
- `apps/web/src/app/services/dimension-registry.service.ts` (+ `.spec.ts`) — band resolution + persistence.
- `apps/web/src/app/faces/band-config-store.ts` (+ `.spec.ts`) — generic per-face banded config base.
- `apps/web/src/app/controls/face-overlay/face-overlay.component.{ts,html,scss}` (+ `.spec.ts`) — the two overlays.

**Modify**
- `apps/web/src/app/faces/fullscreen/fullscreen-preset.ts` — drop `FullscreenPreset`/`FullscreenConfigState`/`STATE_VERSION`/`PRESETS_KEY`; add `FullscreenFields`; keep `SectionStyle`/`BarStyle`/`SectionBase`/`SectionKey`/`DATE_SECTION_KEYS`/`GAP_BASE_CQ`.
- `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts` (+ `.spec.ts`) — `buildDefaultFields(): Record<bandId, FullscreenFields>`.
- `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts` (+ `.spec.ts`) — extends `BandConfigStore<FullscreenFields>`.
- `apps/web/src/app/faces/fullscreen/fullscreen-style.ts` — `varsFor(fields: FullscreenFields)`.
- `apps/web/src/app/faces/fullscreen/fullscreen-face.component.{ts,html,scss}` (+ `.spec.ts`) — use `fieldsFor`; remove `.viewport-label`.
- `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.{ts,html}` (+ `.spec.ts`) — `ratio` input + band-keyed writes.
- `apps/web/src/app/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.ts` (+ `.spec.ts`) — read `store.sample()`.
- `apps/web/src/app/faces/face-registry.ts` — `configComponent?`.
- `apps/web/src/app/app.component.{ts,html}` — mount overlay; Adjust gating.
- `apps/web/src/app/ui/tokens.scss` — `$mock`.

---

## Task 1: `DimensionBand` type + built-in band data

**Files:**
- Create: `apps/web/src/app/faces/dimension-band.ts`
- Test: `apps/web/src/app/services/dimension-registry.service.spec.ts` (band-shape cases live with the registry spec — created in Task 2; this task is verified through Task 2's tests and a quick compile)

- [ ] **Step 1: Create the type + data module**

`apps/web/src/app/faces/dimension-band.ts`:

```ts
// A single ratio band (the app-wide "dimension preset"). Bands are contiguous,
// sorted by minRatio ascending; the top band uses Infinity for maxRatio.
export interface DimensionBand {
  id: string;        // 'phone' … 'super'
  name: string;      // 'PHONE' … 'SUPER' (shown in the overlay label)
  minRatio: number;  // inclusive (ratio = width / height)
  maxRatio: number;  // exclusive; top band uses Infinity
}

export interface DimensionRegistryState {
  version: number;
  bands: DimensionBand[];
}

export const DIMENSIONS_KEY = 'allyclock.dimensions';
export const DIMENSIONS_VERSION = 1;

// The eight built-in bands (lifted from the former fullscreen BUILT_IN_PRESETS
// ratios/names). Edit this list later to add/remove dimension presets app-wide.
export const BUILT_IN_BANDS: DimensionBand[] = [
  { id: 'phone', name: 'PHONE', minRatio: 0, maxRatio: 0.62 },
  { id: 'tall', name: 'TALL', minRatio: 0.62, maxRatio: 1.05 },
  { id: 'pad', name: 'PAD', minRatio: 1.05, maxRatio: 1.45 },
  { id: 'lap', name: 'LAP', minRatio: 1.45, maxRatio: 1.7 },
  { id: 'wide', name: 'WIDE', minRatio: 1.7, maxRatio: 1.95 },
  { id: 'mini', name: 'MINI', minRatio: 1.95, maxRatio: 2.2 },
  { id: 'ultra', name: 'ULTRA', minRatio: 2.2, maxRatio: 2.8 },
  { id: 'super', name: 'SUPER', minRatio: 2.8, maxRatio: Infinity },
];

export function buildDefaultDimensions(): DimensionRegistryState {
  return { version: DIMENSIONS_VERSION, bands: BUILT_IN_BANDS.map((b) => ({ ...b })) };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build:web`
Expected: build succeeds (the module is not yet imported anywhere, so this only type-checks the new file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/faces/dimension-band.ts
git commit -m "$(printf 'feat(web): add DimensionBand type and built-in band data\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `DimensionRegistry` service

**Files:**
- Create: `apps/web/src/app/services/dimension-registry.service.ts`
- Test: `apps/web/src/app/services/dimension-registry.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/app/services/dimension-registry.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DimensionRegistry } from './dimension-registry.service';
import { BUILT_IN_BANDS, DIMENSIONS_KEY } from '../faces/dimension-band';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('DimensionRegistry', () => {
  let registry: DimensionRegistry;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    registry = TestBed.inject(DimensionRegistry);
  });

  it('seeds the 8 built-in bands and persists them', () => {
    expect(registry.bands()).toHaveLength(8);
    expect(JSON.parse(mem[DIMENSIONS_KEY]).bands).toHaveLength(8);
  });

  it('the bands cover the ratio range contiguously, top band open-ended', () => {
    const bands = [...registry.bands()].sort((a, b) => a.minRatio - b.minRatio);
    expect(bands[0].minRatio).toBe(0);
    expect(bands[bands.length - 1].maxRatio).toBe(Infinity);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].minRatio).toBe(bands[i - 1].maxRatio);
    }
    expect(bands.map((b) => b.name)).toEqual(
      ['PHONE', 'TALL', 'PAD', 'LAP', 'WIDE', 'MINI', 'ULTRA', 'SUPER'],
    );
    for (const b of BUILT_IN_BANDS) expect(b.name.length).toBeLessThanOrEqual(5);
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(registry.resolveForRatio(2.1).id).toBe('mini');
    expect(registry.resolveForRatio(1.78).id).toBe('wide');
    expect(registry.resolveForRatio(2.33).id).toBe('ultra');
    expect(registry.resolveForRatio(1.6).id).toBe('lap');
    expect(registry.resolveForRatio(1.33).id).toBe('pad');
    expect(registry.resolveForRatio(0.75).id).toBe('tall');
    expect(registry.resolveForRatio(0.46).id).toBe('phone');
    expect(registry.resolveForRatio(3.5).id).toBe('super');
    expect(registry.resolveForRatio(0.62).id).toBe('tall');
  });

  it('maps both very tall and moderately tall ratios to the phone band', () => {
    expect(registry.resolveForRatio(0.2).id).toBe('phone');
    expect(registry.resolveForRatio(0.5).id).toBe('phone');
  });

  it('revives Infinity maxRatio lost to JSON on reload (SUPER stays reachable)', () => {
    const persisted = JSON.parse(JSON.stringify(registry.state()));
    expect(persisted.bands.find((b: { id: string }) => b.id === 'super').maxRatio).toBeNull();
    mem[DIMENSIONS_KEY] = JSON.stringify(persisted);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(DimensionRegistry);
    expect(fresh.bands().find((b) => b.id === 'super')!.maxRatio).toBe(Infinity);
    expect(fresh.resolveForRatio(8.56).id).toBe('super');
  });

  it('reseeds stale older-version persisted state', () => {
    mem[DIMENSIONS_KEY] = JSON.stringify({ version: 0, bands: [{ id: 'x', name: 'X', minRatio: 0, maxRatio: 99 }] });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(DimensionRegistry);
    expect(fresh.bands()).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:web`
Expected: FAIL — `Cannot find module './dimension-registry.service'`.

- [ ] **Step 3: Implement the service**

`apps/web/src/app/services/dimension-registry.service.ts`:

```ts
import { Injectable, computed, signal } from '@angular/core';
import {
  BUILT_IN_BANDS,
  DIMENSIONS_KEY,
  DIMENSIONS_VERSION,
  buildDefaultDimensions,
  type DimensionBand,
  type DimensionRegistryState,
} from '../faces/dimension-band';

function bandDistance(b: DimensionBand, ratio: number): number {
  if (ratio < b.minRatio) return b.minRatio - ratio;
  if (ratio >= b.maxRatio) return ratio - b.maxRatio;
  return 0;
}

// App-wide ratio bands ("dimension presets"). Owns band definitions only — no
// per-face style. Resolves the active band for a given width/height ratio.
@Injectable({ providedIn: 'root' })
export class DimensionRegistry {
  private readonly _state = signal<DimensionRegistryState>(this.load());
  readonly state = this._state.asReadonly();
  readonly bands = computed(() => this._state().bands);

  resolveForRatio(ratio: number): DimensionBand {
    const bands = this._state().bands;
    return (
      bands.find((b) => ratio >= b.minRatio && ratio < b.maxRatio) ??
      [...bands].sort((a, b) => bandDistance(a, ratio) - bandDistance(b, ratio))[0]
    );
  }

  private load(): DimensionRegistryState {
    try {
      const raw = localStorage.getItem(DIMENSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DimensionRegistryState;
        if (parsed?.bands?.length) return this.migrate(this.reviveRatios(parsed));
      }
    } catch {
      // fall through to seed
    }
    const seeded = buildDefaultDimensions();
    try {
      localStorage.setItem(DIMENSIONS_KEY, JSON.stringify(seeded));
    } catch {
      // quota/unavailable — in-memory only
    }
    return seeded;
  }

  // JSON serializes Infinity as null; restore the open-ended top band's bound so
  // a ratio like 8.56 keeps resolving to SUPER after a reload.
  private reviveRatios(state: DimensionRegistryState): DimensionRegistryState {
    for (const b of state.bands) {
      if (typeof b.maxRatio !== 'number') b.maxRatio = Infinity;
    }
    return state;
  }

  private migrate(state: DimensionRegistryState): DimensionRegistryState {
    if (state.version >= DIMENSIONS_VERSION) return state;
    // Older persisted band shapes are reseeded to current built-ins.
    return { version: DIMENSIONS_VERSION, bands: BUILT_IN_BANDS.map((b) => ({ ...b })) };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:web`
Expected: PASS — all `DimensionRegistry` cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/services/dimension-registry.service.ts apps/web/src/app/services/dimension-registry.service.spec.ts
git commit -m "$(printf 'feat(web): add DimensionRegistry resolving the app-wide ratio bands\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `BandConfigStore<T>` generic base

**Files:**
- Create: `apps/web/src/app/faces/band-config-store.ts`
- Test: `apps/web/src/app/faces/band-config-store.spec.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/app/faces/band-config-store.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BandConfigStore } from './band-config-store';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

interface Fields { n: number; on: boolean }

class TestStore extends BandConfigStore<Fields> {
  protected storageKey(): string { return 'test.bands'; }
  protected version(): number { return 1; }
  protected buildDefaults(): Record<string, Fields> {
    return { a: { n: 1, on: true }, b: { n: 2, on: true } };
  }
  constructor() { super(); this.init(); }
  bump(id: string): void { this.patch(id, (f) => ({ ...f, n: f.n + 1 })); }
  allOff(): void { this.patchAll((f) => ({ ...f, on: false })); }
}

describe('BandConfigStore', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
  });

  it('seeds defaults per band id and persists them', () => {
    const s = new TestStore();
    expect(s.config('a')).toEqual({ n: 1, on: true });
    expect(JSON.parse(mem['test.bands']).byBand.b.n).toBe(2);
  });

  it('patch updates one band; patchAll broadcasts to all bands', () => {
    const s = new TestStore();
    s.bump('a');
    expect(s.config('a').n).toBe(2);
    expect(s.config('b').n).toBe(2);
    s.allOff();
    expect(s.config('a').on).toBe(false);
    expect(s.config('b').on).toBe(false);
  });

  it('config returns a default for an id absent from byBand (never undefined)', () => {
    const s = new TestStore();
    expect(s.config('missing')).toBeDefined();
  });

  it('migration additively fills band ids missing from persisted state', () => {
    mem['test.bands'] = JSON.stringify({ version: 1, byBand: { a: { n: 9, on: false } } });
    const s = new TestStore();
    expect(s.config('a')).toEqual({ n: 9, on: false }); // existing preserved
    expect(s.config('b')).toEqual({ n: 2, on: true });   // missing filled from defaults
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:web`
Expected: FAIL — `Cannot find module './band-config-store'`.

- [ ] **Step 3: Implement the base class**

`apps/web/src/app/faces/band-config-store.ts`:

```ts
import { Signal, signal } from '@angular/core';

export interface BandConfigState<T> {
  version: number;
  byBand: Record<string, T>; // keyed by DimensionBand.id
}

// Generic per-face config keyed by dimension-band id. Subclasses provide the
// storage key, version, and default fields per band. Persistence + immutable
// updates are shared. Subclasses MUST call `this.init()` from their constructor
// (after `super()`), so injected dependencies are available before loading.
export abstract class BandConfigStore<T> {
  protected abstract storageKey(): string;
  protected abstract version(): number;
  protected abstract buildDefaults(): Record<string, T>;

  private readonly _state = signal<BandConfigState<T>>({ version: 0, byBand: {} });
  readonly state: Signal<BandConfigState<T>> = this._state.asReadonly();

  protected init(): void {
    this._state.set(this.load());
  }

  // Current fields for a band id. Defensive: a band id that exists in the
  // registry but is missing from byBand (the two persist separately) falls back
  // to a freshly built default, never undefined (it feeds varsFor).
  config(bandId: string): T {
    const byBand = this._state().byBand;
    return byBand[bandId] ?? this.buildDefaults()[bandId] ?? Object.values(byBand)[0];
  }

  protected patch(bandId: string, fn: (t: T) => T): void {
    const byBand = { ...this._state().byBand, [bandId]: fn(this.config(bandId)) };
    this.commit({ ...this._state(), byBand });
  }

  protected patchAll(fn: (t: T) => T): void {
    const byBand: Record<string, T> = {};
    for (const [id, fields] of Object.entries(this._state().byBand)) byBand[id] = fn(fields);
    this.commit({ ...this._state(), byBand });
  }

  private load(): BandConfigState<T> {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as BandConfigState<T>;
        if (parsed?.byBand) return this.migrate(parsed);
      }
    } catch {
      // fall through to seed
    }
    const seeded: BandConfigState<T> = { version: this.version(), byBand: this.buildDefaults() };
    this.persist(seeded);
    return seeded;
  }

  // Additive: existing per-band values win; any band id missing from the
  // persisted state is filled from defaults. Never blanket-wipes tuning.
  private migrate(state: BandConfigState<T>): BandConfigState<T> {
    const byBand = { ...this.buildDefaults(), ...state.byBand };
    const migrated: BandConfigState<T> = { version: this.version(), byBand };
    if (
      state.version !== this.version() ||
      Object.keys(byBand).length !== Object.keys(state.byBand).length
    ) {
      this.persist(migrated);
    }
    return migrated;
  }

  private commit(state: BandConfigState<T>): void {
    this._state.set(state);
    this.persist(state);
  }

  private persist(state: BandConfigState<T>): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(state));
    } catch {
      // quota/unavailable — in-memory only
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:web`
Expected: PASS — all `BandConfigStore` cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/band-config-store.ts apps/web/src/app/faces/band-config-store.spec.ts
git commit -m "$(printf 'feat(web): add generic BandConfigStore base for per-face banded config\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: `FullscreenFields` type + band-keyed defaults

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-preset.ts`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.spec.ts`

- [ ] **Step 1: Rewrite the type module**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-preset.ts` with:

```ts
// Section style knobs (time + each date part). `sizeScale` multiplies the
// preset's responsive base for that section group.
export interface SectionStyle {
  // Per-band visibility. The Weekday/GMT/Bar toggles write this to every band
  // (dimension-agnostic), but the per-band field is kept so per-band visibility
  // control can be revived later. (time/month/day stay true.)
  visible: boolean;
  sizeScale: number; // 0.5–2.0, default 1.0
  weight: number;    // 100–700
  opacity: number;   // 0.2–1.0
}

export interface BarStyle {
  visible: boolean;
  sizeScale: number; // scales bar width base, default 1.0
  opacity: number;
}

// Responsive base for a section group, used as `min(cqw·1cqw, cqh·1cqh)`.
// `minCqh` (optional) sets a floor in cqh units so the size stops shrinking
// below a target ratio: `max(min(cqw, cqh), minCqh)`.
export interface SectionBase {
  cqw: number;
  cqh: number;
  minCqh?: number;
}

// Per-band style fields for the Fullscreen face. Keyed by DimensionBand.id in
// the store; the band boundaries themselves live in DimensionRegistry.
export interface FullscreenFields {
  bar: BarStyle;
  sections: {
    time: SectionStyle;
    weekday: SectionStyle;
    month: SectionStyle;
    day: SectionStyle;
    gmt: SectionStyle;
  };
  bases: {
    time: SectionBase;
    date: SectionBase; // shared by weekday/month/day/gmt
    bar: SectionBase;  // bar width base
  };
  gaps: {
    timeToBar: number;        // scale on a cq gap base, default 1.0
    barToDate: number;
    betweenDateParts: number;
  };
}

export type SectionKey = 'time' | 'weekday' | 'month' | 'day' | 'gmt';
export const DATE_SECTION_KEYS: SectionKey[] = ['weekday', 'month', 'day', 'gmt'];

// Base cq value for the inter-section gap (multiplied by each gap scale).
export const GAP_BASE_CQ = 2;
```

- [ ] **Step 2: Rewrite the defaults data module**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts` with:

```ts
import { type FullscreenFields, type SectionBase, type SectionStyle } from './fullscreen-preset';

const timeStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 200, opacity: 1 });
const dateStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 300, opacity: 0.6 });

const LANDSCAPE = {
  time: { cqw: 120, cqh: 68 } as SectionBase,
  date: { cqw: 8, cqh: 5 } as SectionBase,
  bar: { cqw: 120, cqh: 56 } as SectionBase,
};
const NEAR_SQUARE = {
  time: { cqw: 38, cqh: 64 } as SectionBase,
  date: { cqw: 3.4, cqh: 4 } as SectionBase,
  bar: { cqw: 58, cqh: 62 } as SectionBase,
};
// Phone band carries a cqh floor (minCqh = cqw * 0.31) so that below ratio 0.31
// the height-bound floor wins and the layout stops shrinking, matching the size
// it has across 0.31–0.62.
const PHONE = {
  time: { cqw: 24, cqh: 200, minCqh: 7.44 } as SectionBase,
  date: { cqw: 3.4, cqh: 200, minCqh: 1.054 } as SectionBase,
  bar: { cqw: 60, cqh: 200, minCqh: 18.6 } as SectionBase,
};

function fields(bases: FullscreenFields['bases']): FullscreenFields {
  return {
    bar: { visible: true, sizeScale: 1, opacity: 0.34 },
    sections: {
      time: timeStyle(),
      weekday: dateStyle(),
      month: dateStyle(),
      day: dateStyle(),
      gmt: dateStyle(),
    },
    bases,
    gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
  };
}

// Default fields per band id. Band ids MUST match DimensionRegistry's bands.
export function buildDefaultFields(): Record<string, FullscreenFields> {
  return {
    phone: fields(PHONE),
    tall: fields(NEAR_SQUARE),
    pad: fields(NEAR_SQUARE),
    lap: fields(LANDSCAPE),
    wide: fields(LANDSCAPE),
    mini: fields(LANDSCAPE),
    ultra: fields(LANDSCAPE),
    super: fields(LANDSCAPE),
  };
}
```

- [ ] **Step 3: Rewrite the data spec**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { buildDefaultFields } from './fullscreen-presets.data';

describe('buildDefaultFields', () => {
  it('returns one FullscreenFields per band id (the eight bands)', () => {
    const f = buildDefaultFields();
    expect(Object.keys(f).sort()).toEqual(
      ['lap', 'mini', 'pad', 'phone', 'super', 'tall', 'ultra', 'wide'],
    );
  });

  it('defaults bar visible and weekday/gmt visible on every band', () => {
    for (const fields of Object.values(buildDefaultFields())) {
      expect(fields.bar.visible).toBe(true);
      expect(fields.sections.weekday.visible).toBe(true);
      expect(fields.sections.gmt.visible).toBe(true);
    }
  });

  it('only the phone band carries a cqh floor (minCqh) on its time base', () => {
    const f = buildDefaultFields();
    expect(f.phone.bases.time.minCqh).toBeGreaterThan(0);
    for (const [id, fields] of Object.entries(f)) {
      expect(fields.bases.time.minCqh != null).toBe(id === 'phone');
    }
  });

  it('returns independent deep clones each call', () => {
    const a = buildDefaultFields();
    const b = buildDefaultFields();
    a.phone.sections.time.weight = 999;
    expect(b.phone.sections.time.weight).toBe(200);
  });
});
```

- [ ] **Step 4: Run the test (it will fail to COMPILE elsewhere)**

Run: `npm run test:web`
Expected: FAIL — the data spec passes, but `fullscreen-config-store.service.ts`, `fullscreen-style.ts`, and others still import the removed `FullscreenPreset`. This is expected; Tasks 5–9 fix every consumer. (If you want a green checkpoint, do Steps 5 below in the same commit — the suite is not green until Task 9.)

- [ ] **Step 5: Commit (work-in-progress, suite not yet green)**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-preset.ts apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts apps/web/src/app/faces/fullscreen/fullscreen-presets.data.spec.ts
git commit -m "$(printf 'refactor(web): replace FullscreenPreset with band-keyed FullscreenFields\n\nWIP: consumers updated in following commits.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: `FullscreenConfigStore` extends `BandConfigStore`

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.spec.ts`

- [ ] **Step 1: Rewrite the store spec**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.spec.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigStore } from './fullscreen-config-store.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenConfigStore', () => {
  let store: FullscreenConfigStore;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('seeds fields for all eight band ids and persists them', () => {
    expect(Object.keys(store.state().byBand).sort()).toEqual(
      ['lap', 'mini', 'pad', 'phone', 'super', 'tall', 'ultra', 'wide'],
    );
    expect(JSON.parse(mem['allyclock.fullscreen.config']).byBand.mini).toBeDefined();
  });

  it('fieldsFor(ratio) returns the fields for the band containing the ratio', () => {
    // 2.1 → mini, 0.46 → phone (phone is the only band with a time minCqh floor).
    expect(store.fieldsFor(2.1).bases.time.minCqh).toBeUndefined();
    expect(store.fieldsFor(0.46).bases.time.minCqh).toBeGreaterThan(0);
  });

  it('updateSection merges a partial into one band and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5 });
    expect(store.config('phone').sections.time.sizeScale).toBe(1.5);
    expect(store.config('mini').sections.time.sizeScale).toBe(1); // other bands untouched
    expect(JSON.parse(mem['allyclock.fullscreen.config']).byBand.phone.sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right band', () => {
    store.updateBar('ultra', { opacity: 0.5 });
    expect(store.config('ultra').bar.opacity).toBe(0.5);
    store.updateGap('ultra', 'timeToBar', 1.4);
    expect(store.config('ultra').gaps.timeToBar).toBe(1.4);
  });

  it('setSectionVisibleAll writes visibility to every band', () => {
    store.setSectionVisibleAll('weekday', false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.weekday.visible).toBe(false);
    }
  });

  it('setBarVisibleAll writes bar visibility to every band', () => {
    store.setBarVisibleAll(false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.visible).toBe(false);
    }
  });

  it('sample() returns a representative band fields object', () => {
    expect(store.sample().sections.weekday.visible).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:web`
Expected: FAIL — store still references `FullscreenPreset`/`resolveForRatio`/old API.

- [ ] **Step 3: Rewrite the store**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts` with:

```ts
import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '../../services/dimension-registry.service';
import { BandConfigStore } from '../band-config-store';
import { buildDefaultFields } from './fullscreen-presets.data';
import { type FullscreenFields, type SectionKey } from './fullscreen-preset';

@Injectable({ providedIn: 'root' })
export class FullscreenConfigStore extends BandConfigStore<FullscreenFields> {
  private readonly registry = inject(DimensionRegistry);

  protected storageKey(): string { return 'allyclock.fullscreen.config'; }
  protected version(): number { return 1; }
  protected buildDefaults(): Record<string, FullscreenFields> { return buildDefaultFields(); }

  constructor() {
    super();
    this.init();
  }

  // Fields for the band that contains the given ratio.
  fieldsFor(ratio: number): FullscreenFields {
    return this.config(this.registry.resolveForRatio(ratio).id);
  }

  // Visibility is uniform across bands (toggles broadcast), so any band's fields
  // are a faithful sample for reading the current toggle state.
  sample(): FullscreenFields {
    return Object.values(this.state().byBand)[0];
  }

  updateSection(bandId: string, key: SectionKey, partial: Partial<FullscreenFields['sections'][SectionKey]>): void {
    this.patch(bandId, (f) => ({
      ...f,
      sections: { ...f.sections, [key]: { ...f.sections[key], ...partial } },
    }));
  }

  updateBar(bandId: string, partial: Partial<FullscreenFields['bar']>): void {
    this.patch(bandId, (f) => ({ ...f, bar: { ...f.bar, ...partial } }));
  }

  updateGap(bandId: string, key: keyof FullscreenFields['gaps'], value: number): void {
    this.patch(bandId, (f) => ({ ...f, gaps: { ...f.gaps, [key]: value } }));
  }

  // Dimension-agnostic visibility: write the value to EVERY band. The per-band
  // field is preserved so per-band control can be revived later.
  setSectionVisibleAll(key: SectionKey, visible: boolean): void {
    this.patchAll((f) => ({ ...f, sections: { ...f.sections, [key]: { ...f.sections[key], visible } } }));
  }

  setBarVisibleAll(visible: boolean): void {
    this.patchAll((f) => ({ ...f, bar: { ...f.bar, visible } }));
  }
}
```

- [ ] **Step 4: Run the test to verify the store spec passes**

Run: `npm run test:web`
Expected: the `FullscreenConfigStore` cases PASS. (Other faces/components still fail to compile until Tasks 6–9.)

- [ ] **Step 5: Commit (WIP)**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.spec.ts
git commit -m "$(printf 'refactor(web): FullscreenConfigStore extends BandConfigStore, keyed by band\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: `varsFor(fields)` style mapper

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-style.ts`

- [ ] **Step 1: Update the signature to take `FullscreenFields`**

In `apps/web/src/app/faces/fullscreen/fullscreen-style.ts`, change the import and the function signature (the body is unchanged — `FullscreenFields` has the same `bases`/`gaps`/`sections`/`bar` shape):

Replace line 1:

```ts
import type { FullscreenFields, SectionBase, SectionKey } from './fullscreen-preset';
```

Replace the `varsFor` signature line:

```ts
export function varsFor(p: FullscreenFields): Record<string, string> {
```

- [ ] **Step 2: Verify the consumers still type-check against this file**

Run: `npm run test:web`
Expected: `fullscreen-style` no longer references the removed `FullscreenPreset`. The fullscreen face still fails to compile (it calls the old `store.resolveForRatio`/`activePreset`) — fixed in Task 7.

- [ ] **Step 3: Commit (WIP)**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-style.ts
git commit -m "$(printf 'refactor(web): varsFor takes FullscreenFields\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: Fullscreen face uses `fieldsFor`; remove local label

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.ts`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.html`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.scss`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.spec.ts`

- [ ] **Step 1: Update the face component class**

In `apps/web/src/app/faces/fullscreen/fullscreen-face.component.ts`:

Replace the `activePreset` computed (currently `readonly activePreset = computed(() => this.store.resolveForRatio(this.ratio()));`) with:

```ts
  readonly activeFields = computed(() => this.store.fieldsFor(this.ratio()));
```

Replace the `styleVars` computed line with:

```ts
  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activeFields()));
```

Remove the now-unused `width`/`height` fields (they were only used by the deleted label):

Delete these two lines:

```ts
  readonly width = this.size.width;
  readonly height = this.size.height;
```

(Keep everything else — `ratio`, `big`, `parts`, `controlsVisible`, `togglesOpen`, the auto-hide timer, `openToggles`/`closeToggles`/`closeAdjust`, the `reveal()` guard.)

- [ ] **Step 2: Update the face template**

In `apps/web/src/app/faces/fullscreen/fullscreen-face.component.html`:

Change the bar guard:

```html
  @if (activeFields().bar.visible) { <div class="bar divider"></div> }
```

Change the weekday/gmt guards:

```html
    @if (activeFields().sections.weekday.visible) {
      <span class="weekday">{{ parts().weekday }}</span>
      <span class="sep">·</span>
    }
```

```html
    @if (activeFields().sections.gmt.visible) {
      <span class="sep">·</span>
      <span class="gmt">{{ parts().gmt }}</span>
    }
```

Delete the local label block entirely (the shared overlay replaces it):

```html
<p class="viewport-label" [class.hidden]="!controlsVisible()">
  {{ width() }} × {{ height() }} · {{ activePreset().name }}
</p>
```

Add `[ratio]` to the Adjust panel so it stays reactive to the face's size (Task 8 adds the input):

```html
@if (faceConfig.adjustOpen()) {
  <app-fullscreen-config [ratio]="ratio()" (closed)="closeAdjust()" />
}
```

- [ ] **Step 3: Remove the `.viewport-label` styles**

In `apps/web/src/app/faces/fullscreen/fullscreen-face.component.scss`, delete the entire `.viewport-label { … }` rule (the block starting `.viewport-label {` and its `&.hidden` nested rule). Keep `.gear` and everything else.

- [ ] **Step 4: Update the face spec**

Replace the two "selects the … preset" tests in `apps/web/src/app/faces/fullscreen/fullscreen-face.component.spec.ts` (the `activePreset().name` assertions no longer exist) with field-based assertions:

```ts
  it('resolves landscape fields for a 2.1-ratio host (no time minCqh floor)', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activeFields().bases.time.minCqh).toBeUndefined();
  });

  it('resolves phone fields for a tall portrait host (time minCqh floor present)', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 840, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activeFields().bases.time.minCqh).toBeGreaterThan(0);
  });
```

(Keep the "renders the time digits" and "renders the date line" tests unchanged.)

- [ ] **Step 5: Run the test**

Run: `npm run test:web`
Expected: the fullscreen face spec PASSES. The Adjust/Display panels still fail (old API) — fixed in Tasks 8–9. The build of the face itself now type-checks except for the `[ratio]` input which Task 8 adds (do Task 8 next; if you run `build:web` now it will error on the unknown `ratio` input — expected).

- [ ] **Step 6: Commit (WIP)**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-face.component.ts apps/web/src/app/faces/fullscreen/fullscreen-face.component.html apps/web/src/app/faces/fullscreen/fullscreen-face.component.scss apps/web/src/app/faces/fullscreen/fullscreen-face.component.spec.ts
git commit -m "$(printf 'refactor(web): fullscreen face reads band fields; drop local viewport label\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: Adjust panel — `ratio` input + band-keyed writes

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.ts`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.html`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.spec.ts`

- [ ] **Step 1: Rewrite the Adjust panel spec**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigComponent } from './fullscreen-config.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

function make(ratio: number) {
  const fixture = TestBed.createComponent(FullscreenConfigComponent);
  fixture.componentRef.setInput('ratio', ratio);
  fixture.detectChanges();
  return fixture;
}

describe('FullscreenConfigComponent', () => {
  let store: FullscreenConfigStore;

  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [FullscreenConfigComponent] }).compileComponents();
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('clicking the header X button emits closed after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = make(2.1);
      let closed = false;
      fixture.componentInstance.closed.subscribe(() => (closed = true));
      (fixture.nativeElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('edits the band that contains the input ratio', () => {
    const fixture = make(2.1); // mini
    expect(fixture.componentInstance.editingBand().id).toBe('mini');
  });

  it('re-selects the band when the ratio input changes', () => {
    const fixture = make(2.1);
    fixture.componentRef.setInput('ratio', 0.46); // phone
    fixture.detectChanges();
    expect(fixture.componentInstance.editingBand().id).toBe('phone');
  });

  it('moving the Time size slider updates that band sections.time.sizeScale', () => {
    const fixture = make(2.1);
    const slider = fixture.nativeElement.querySelector('[data-knob="time-size"]') as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(store.config('mini').sections.time.sizeScale).toBeCloseTo(1.5);
  });

  it('moving the Date size slider sets sizeScale on all four date parts of the band', () => {
    const fixture = make(2.1);
    const slider = fixture.nativeElement.querySelector('[data-knob="date-size"]') as HTMLInputElement;
    slider.value = '1.3';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const f = store.config('mini');
    expect(f.sections.weekday.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.month.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.day.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.gmt.sizeScale).toBeCloseTo(1.3);
  });

  it('does not render the visibility toggles (they moved to the Display panel)', () => {
    const fixture = make(2.1);
    expect(fixture.nativeElement.querySelector('[data-knob="weekday-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="gmt-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="bar-visible"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:web`
Expected: FAIL — `ratio` is not an input yet; `editingBand` does not exist.

- [ ] **Step 3: Rewrite the Adjust panel class**

Replace the entire contents of `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { DimensionRegistry } from '../../../services/dimension-registry.service';
import { SheetComponent } from '../../../ui/sheet/sheet.component';
import { NavHeaderComponent } from '../../../ui/nav-header/nav-header.component';
import { IconButtonComponent } from '../../../ui/icon-button/icon-button.component';
import { type SectionKey, DATE_SECTION_KEYS } from '../fullscreen-preset';

@Component({
  selector: 'app-fullscreen-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent, DecimalPipe],
  templateUrl: './fullscreen-config.component.html',
  styleUrl: './fullscreen-config.component.scss',
})
export class FullscreenConfigComponent {
  protected readonly store = inject(FullscreenConfigStore);
  private readonly registry = inject(DimensionRegistry);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  // The full-screen face's live ratio. The panel auto-selects the band for this
  // ratio and re-selects reactively when the face resizes. (Always the viewport
  // ratio — the Adjust panel is only opened over the full-screen face.)
  readonly ratio = input.required<number>();

  readonly editingBand = computed(() => this.registry.resolveForRatio(this.ratio()));
  readonly editingFields = computed(() => this.store.config(this.editingBand().id));

  close(): void { this.sheet()?.close(); }
  onSheetClosed(): void { this.closed.emit(); }

  /** Compute --fill % for a slider given its current value and range. */
  fillPct(value: number, min: number, max: number): string {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  onSectionSize(key: SectionKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.updateSection(this.editingBand().id, key, { sizeScale: value });
  }

  onDateSize(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    for (const key of DATE_SECTION_KEYS) {
      this.store.updateSection(this.editingBand().id, key, { sizeScale: value });
    }
  }
}
```

- [ ] **Step 4: Update the Adjust panel template**

In `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.html`, replace each `editingPreset()` with `editingFields()` (two slider rows — Time and Date). The Time row:

```html
          <input
            type="range"
            class="knobs-slider"
            min="0.5" max="2.0" step="0.05"
            [value]="editingFields().sections.time.sizeScale"
            [style.--fill]="fillPct(editingFields().sections.time.sizeScale, 0.5, 2.0)"
            data-knob="time-size"
            (input)="onSectionSize('time', $event)"
          />
          <span class="knobs-row-value">{{ editingFields().sections.time.sizeScale | number:'1.2-2' }}</span>
```

The Date row:

```html
          <input
            type="range"
            class="knobs-slider"
            min="0.5" max="2.0" step="0.05"
            [value]="editingFields().sections.month.sizeScale"
            [style.--fill]="fillPct(editingFields().sections.month.sizeScale, 0.5, 2.0)"
            data-knob="date-size"
            (input)="onDateSize($event)"
          />
          <span class="knobs-row-value">{{ editingFields().sections.month.sizeScale | number:'1.2-2' }}</span>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:web`
Expected: the Adjust panel spec PASSES. (Display panel still fails until Task 9.)

- [ ] **Step 6: Commit (WIP)**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-config/
git commit -m "$(printf 'refactor(web): Adjust panel takes the face ratio input, writes per band\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 9: Display (toggles) panel — read `sample()`

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.ts`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.spec.ts`

- [ ] **Step 1: Update the toggles component**

In `apps/web/src/app/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.ts`, replace the three `computed` reads (which currently read `this.store.state().presets[0]…`) with reads off `sample()`:

```ts
  readonly showWeekday = computed(() => this.store.sample().sections.weekday.visible);
  readonly showGmt = computed(() => this.store.sample().sections.gmt.visible);
  readonly showBar = computed(() => this.store.sample().bar.visible);
```

(The `toggleWeekday`/`toggleGmt`/`toggleBar` methods already call `store.setSectionVisibleAll`/`store.setBarVisibleAll` and are unchanged.)

- [ ] **Step 2: Confirm the toggles spec asserts band-wide writes**

Ensure `apps/web/src/app/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.spec.ts` asserts every band, replacing any `presets` reference. The three behavioral tests should read:

```ts
  it('toggling Weekday writes visible to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().sections.weekday.visible;
    (fixture.nativeElement.querySelector('[data-knob="weekday-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.weekday.visible).toBe(!before);
    }
  });

  it('toggling GMT writes visible to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().sections.gmt.visible;
    (fixture.nativeElement.querySelector('[data-knob="gmt-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.gmt.visible).toBe(!before);
    }
  });

  it('toggling Bar writes visible to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().bar.visible;
    (fixture.nativeElement.querySelector('[data-knob="bar-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.visible).toBe(!before);
    }
  });
```

(Keep the existing "clicking the header X button emits closed" test as-is.)

- [ ] **Step 3: Run the full suite — it should now be green**

Run: `npm run test:web`
Expected: PASS — entire suite green (all faces/panels migrated).

- [ ] **Step 4: Build to confirm the app compiles**

Run: `npm run build:web`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-toggles/
git commit -m "$(printf 'refactor(web): Display panel reads visibility from store.sample()\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 10: `FaceOverlayComponent` (label + LIVE/MOCK chip)

**Files:**
- Modify: `apps/web/src/app/ui/tokens.scss`
- Create: `apps/web/src/app/controls/face-overlay/face-overlay.component.ts`
- Create: `apps/web/src/app/controls/face-overlay/face-overlay.component.html`
- Create: `apps/web/src/app/controls/face-overlay/face-overlay.component.scss`
- Test: `apps/web/src/app/controls/face-overlay/face-overlay.component.spec.ts`

- [ ] **Step 1: Add the `$mock` token**

In `apps/web/src/app/ui/tokens.scss`, add after the `$live` line (line 11):

```scss
// Mocked-clock indicator (iOS systemOrange) — Time Machine active.
$mock: #ff9f0a;
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/app/controls/face-overlay/face-overlay.component.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FaceOverlayComponent } from './face-overlay.component';
import { ClockService } from '../../services/clock.service';
import { AUTO_HIDE_MS } from '../../config/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

function sizedFixture(w: number, h: number) {
  const fixture = TestBed.createComponent(FaceOverlayComponent);
  const host = fixture.nativeElement as HTMLElement;
  Object.defineProperty(host, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(host, 'clientHeight', { value: h, configurable: true });
  return fixture;
}

describe('FaceOverlayComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [FaceOverlayComponent] }).compileComponents();
  });

  it('labels the viewport size and the resolved band name', async () => {
    const fixture = sizedFixture(840, 400); // ratio 2.1 → MINI
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.label') as HTMLElement;
    expect(label.textContent).toContain('840');
    expect(label.textContent).toContain('400');
    expect(label.textContent).toContain('MINI');
  });

  it('shows LIVE (green) when the clock is not mocked', () => {
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent).toContain('LIVE');
    expect(chip.classList.contains('is-live')).toBe(true);
  });

  it('shows MOCK when the clock is mocked', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date(2026, 0, 1));
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent).toContain('MOCK');
    expect(chip.classList.contains('is-mock')).toBe(true);
  });

  it('is hidden while a face config panel is open', () => {
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    expect(fixture.componentInstance.hidden()).toBe(false);
    fixture.componentInstance['faceConfig'].open.set(true);
    expect(fixture.componentInstance.hidden()).toBe(true);
  });

  it('is hidden while the picker sheet is open (sheetOpen input)', () => {
    const fixture = sizedFixture(840, 400);
    fixture.componentRef.setInput('sheetOpen', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.hidden()).toBe(true);
  });

  it('auto-hides after AUTO_HIDE_MS and reveal() restores it', () => {
    vi.useFakeTimers();
    try {
      const fixture = sizedFixture(840, 400);
      fixture.detectChanges();
      expect(fixture.componentInstance.visible()).toBe(true);
      vi.advanceTimersByTime(AUTO_HIDE_MS);
      expect(fixture.componentInstance.visible()).toBe(false);
      fixture.componentInstance.reveal();
      expect(fixture.componentInstance.visible()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:web`
Expected: FAIL — `Cannot find module './face-overlay.component'`.

- [ ] **Step 4: Implement the component class**

`apps/web/src/app/controls/face-overlay/face-overlay.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { DimensionRegistry } from '../../services/dimension-registry.service';
import { ClockService } from '../../services/clock.service';
import { FaceConfigService } from '../../services/face-config.service';
import { AUTO_HIDE_MS } from '../../config/animation-timing';

// App-shell overlay shown above every face (outside the crossfade layers): a
// top-left "W × H · BAND" label and a top-right LIVE/MOCK chip. Measures the
// viewport itself via ContainerSizeDirective and resolves the band from the
// shared registry. Auto-hides with its own timer (mirrors the face controls).
@Component({
  selector: 'app-face-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './face-overlay.component.html',
  styleUrl: './face-overlay.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class FaceOverlayComponent implements OnDestroy {
  private readonly size = inject(ContainerSizeDirective);
  private readonly registry = inject(DimensionRegistry);
  private readonly clock = inject(ClockService);
  protected readonly faceConfig = inject(FaceConfigService);

  /** True while the face-picker sheet is open (passed by the app shell). */
  readonly sheetOpen = input(false);

  readonly width = this.size.width;
  readonly height = this.size.height;
  readonly band = computed(() =>
    this.registry.resolveForRatio(this.height() > 0 ? this.width() / this.height() : 1),
  );
  readonly isMocked = this.clock.isMocked;

  readonly visible = signal(true);
  readonly hidden = computed(() => !this.visible() || this.faceConfig.open() || this.sheetOpen());

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  reveal(): void {
    if (this.faceConfig.open()) return; // no-op while a config panel is open
    this.visible.set(true);
    this.armTimer();
  }

  private armTimer(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), AUTO_HIDE_MS);
  }
}
```

- [ ] **Step 5: Implement the template**

`apps/web/src/app/controls/face-overlay/face-overlay.component.html`:

```html
<p class="label" [class.hidden]="hidden()">{{ width() }} × {{ height() }} · {{ band().name }}</p>
<p
  class="chip"
  [class.hidden]="hidden()"
  [class.is-live]="!isMocked()"
  [class.is-mock]="isMocked()"
>
  <span class="dot"></span>{{ isMocked() ? 'MOCK' : 'LIVE' }}
</p>
```

- [ ] **Step 6: Implement the styles**

`apps/web/src/app/controls/face-overlay/face-overlay.component.scss`:

```scss
@use 'tokens' as t;

// Full-viewport, non-interactive chrome above the face crossfade layers.
:host {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

// Glow: white text + a strong dark halo so both read on dark and light faces.
.label,
.chip {
  position: fixed;
  top: 0.9rem;
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.9),
    0 0 6px rgba(0, 0, 0, 0.85);
  opacity: 1;
  transition: opacity 0.3s ease;

  &.hidden {
    opacity: 0;
  }
}

.label {
  left: 1rem;
}

.chip {
  right: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.chip .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow:
    0 0 6px currentColor,
    0 0 2px rgba(0, 0, 0, 0.9);
}

// The dot inherits the state colour; the text stays white (its own colour above).
.chip.is-live .dot {
  color: t.$live;
}
.chip.is-mock .dot {
  color: t.$mock;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:web`
Expected: PASS — all `FaceOverlayComponent` cases green.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/controls/face-overlay/ apps/web/src/app/ui/tokens.scss
git commit -m "$(printf 'feat(web): add FaceOverlayComponent (W×H·band label + LIVE/MOCK chip)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 11: Wire the overlay + Adjust gating into the app shell

**Files:**
- Modify: `apps/web/src/app/faces/face-registry.ts`
- Modify: `apps/web/src/app/app.component.ts`
- Modify: `apps/web/src/app/app.component.html`
- Test: `apps/web/src/app/app.component.spec.ts` (if present; otherwise verified by build + manual)

- [ ] **Step 1: Add `configComponent` to the registry**

Replace the entire contents of `apps/web/src/app/faces/face-registry.ts` with:

```ts
import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { FullscreenConfigComponent } from './fullscreen/fullscreen-config/fullscreen-config.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';
import { ScheduleFaceComponent } from './schedule/schedule-face.component';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
  // Present when the face has an "Adjust" (size) panel — gates the shell's
  // Adjust button. The face still renders its own panel internally; this is
  // declarative metadata, not a render hook.
  configComponent?: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  {
    id: 'fullscreen',
    displayName: 'Fullscreen',
    component: FullscreenFaceComponent,
    configComponent: FullscreenConfigComponent,
  },
  { id: 'world-cards', displayName: 'World Cards', component: WorldCardsFaceComponent },
  { id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
```

- [ ] **Step 2: Update the app shell template**

In `apps/web/src/app/app.component.html`:

Change the Adjust-button guard from face-id to `configComponent`:

```html
  @if (activeFace().configComponent) {
    <app-adjust-button (open)="openAdjust()" />
  }
```

Add the overlay as a sibling of `<main class="face-host">` and `.controls-bar` (place it right after the closing `</main>`):

```html
<app-face-overlay [sheetOpen]="sheetOpen()" />
```

- [ ] **Step 3: Register the overlay in the app component**

In `apps/web/src/app/app.component.ts`, add the import and include it in `imports`:

```ts
import { FaceOverlayComponent } from './controls/face-overlay/face-overlay.component';
```

Add `FaceOverlayComponent` to the `imports` array of the `@Component` decorator (alongside `ConfigureButtonComponent`, `AdjustButtonComponent`, etc.).

- [ ] **Step 4: Run the full suite + build**

Run: `npm run test:web`
Expected: PASS — full suite green.

Run: `npm run build:web`
Expected: build succeeds.

- [ ] **Step 5: Visual verification across dimensions**

Serve and eyeball the overlays on the fullscreen face and at least one other face (World Cards), at a wide ratio (e.g. ~840×400) and a portrait ratio:

Run: `npm run start:web` (then open the served URL)
Expected:
- Top-left shows `W × H · BAND` (e.g. `840 × 400 · MINI`) on every face.
- Top-right shows green `LIVE`; after scrubbing the Time Machine, amber `MOCK`.
- Both fade out after ~4s of no pointer/key activity and reappear on movement.
- The label and chip are legible on the dark fullscreen face and on lighter faces.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/faces/face-registry.ts apps/web/src/app/app.component.ts apps/web/src/app/app.component.html
git commit -m "$(printf 'feat(web): mount app-wide face overlay and gate Adjust via configComponent\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification

- [ ] **Step 1: Full suite green**

Run: `npm run test:web`
Expected: all specs pass (including the new `DimensionRegistry`, `BandConfigStore`, `FaceOverlayComponent`, and the rewritten fullscreen specs).

- [ ] **Step 2: Production build clean**

Run: `npm run build:web`
Expected: build succeeds with no component-style budget errors.

- [ ] **Step 3: Manual cross-face/cross-ratio pass** (per the spec's "faces look great in any dimension" rule): confirm the overlays render correctly on fullscreen, World Cards, and Daily Schedule at wide and portrait ratios, and inside the face-picker preview the overlays do not appear (they live in the app shell, not the preview).
