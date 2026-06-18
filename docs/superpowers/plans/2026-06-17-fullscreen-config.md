# Fullscreen Face Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ratio-keyed preset system + configuration sheet to the Fullscreen clock face, so its Editorial look is tuned per screen ratio (auto-selected, manually pinnable) with per-section knobs and preset add/delete.

**Architecture:** A signal-based `FullscreenConfigStore` holds presets (each a ratio band + per-section style) and the pin. The face reads its container ratio via the existing `[appContainerSize]` directive, resolves the active preset (pin or band match), and applies it as CSS custom properties to a sectioned Editorial template. A config sheet (`<app-sheet>` + nav/icon-button primitives) edits the store live; close = apply.

**Tech Stack:** Angular 21 standalone + signals (zoneless), SCSS with `@use 'tokens'`, Vitest (`@angular/build:unit-test`), localStorage. Run from repo root: `npm run test:web`, `npm run build:web`.

**Spec:** `docs/superpowers/specs/2026-06-17-fullscreen-config-design.md`.

---

## File Structure

Created:
- `apps/web/src/app/faces/fullscreen/fullscreen-preset.ts` — types + constants (`SectionStyle`, `BarStyle`, `SectionBase`, `FullscreenPreset`, `FullscreenConfigState`, storage keys, `STATE_VERSION`).
- `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts` — built-in presets (the 7 ratio bands seeded from the tuned Editorial buckets) + `buildDefaultState()`.
- `apps/web/src/app/faces/fullscreen/device-ratios.ts` — `DEVICE_RATIOS` table + `searchDevices()`.
- `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts` — signal-based store (CRUD, resolve, pin, persist, migrate).
- `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.{ts,html,scss}` — the config sheet.
- Matching `*.spec.ts` for the store, the formatter additions, the face, and the config component.

Modified:
- `apps/web/src/app/faces/fullscreen/clock-formatter.ts` — add `minuteFraction(date)` and split date parts.
- `apps/web/src/app/faces/fullscreen/fullscreen-face.component.{ts,html,scss}` — sectioned template, CSS-var application, ratio→preset selection, gear trigger, bar modes.

Reused (do not modify): `ui/sheet`, `ui/nav-header`, `ui/icon-button`, `ui/icon`, `ui/container-size`, `ui/tokens.scss`, `services/clock.service.ts`, `services/face-config.service.ts`.

---

# PHASE 1 — Model, store, device table

### Task 1: Preset & state types

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-preset.ts`

- [ ] **Step 1: Write the types file**

```ts
// Section style knobs (time + each date part). `sizeScale` multiplies the
// preset's responsive base for that section group.
export interface SectionStyle {
  visible: boolean;
  sizeScale: number; // 0.5–2.0, default 1.0
  weight: number;    // 100–700
  opacity: number;   // 0.2–1.0
}

export type BarMode = 'progress' | 'divider' | 'hidden';

export interface BarStyle {
  mode: BarMode;
  sizeScale: number; // scales bar width base, default 1.0
  opacity: number;
}

// Responsive base for a section group, used as `min(cqw·1cqw, cqh·1cqh)`.
export interface SectionBase {
  cqw: number;
  cqh: number;
}

export interface FullscreenPreset {
  id: string;
  name: string;
  minRatio: number;          // inclusive (ratio = width / height)
  maxRatio: number;          // exclusive; top band uses Infinity
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
  builtIn: boolean;
}

export interface FullscreenConfigState {
  version: number;
  presets: FullscreenPreset[]; // contiguous, non-overlapping, sorted by minRatio asc
  pinnedPresetId: string | null;
}

export type SectionKey = 'time' | 'weekday' | 'month' | 'day' | 'gmt';
export const DATE_SECTION_KEYS: SectionKey[] = ['weekday', 'month', 'day', 'gmt'];

export const STATE_VERSION = 1;
export const PRESETS_KEY = 'allyclock.fullscreen.presets';
export const PIN_KEY = 'allyclock.fullscreen.pin';

// Base cq value for the inter-section gap (multiplied by each gap scale).
export const GAP_BASE_CQ = 2; // → calc(min(GAP_BASE_CQ·cqw, ...)) handled in face CSS
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build:web`
Expected: bundle generation complete, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-preset.ts
git commit -m "feat(web): fullscreen preset + config state types"
```

---

### Task 2: Built-in presets (ratio bands)

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-presets.data.spec.ts`

The three base regimes (seeded from the locked Editorial tuning). Date `weight:300, opacity:0.6`; time `weight:200, opacity:1`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, buildDefaultState } from './fullscreen-presets.data';

describe('built-in fullscreen presets', () => {
  it('has seven bands covering the full ratio range contiguously', () => {
    const sorted = [...BUILT_IN_PRESETS].sort((a, b) => a.minRatio - b.minRatio);
    expect(sorted).toHaveLength(7);
    expect(sorted[0].minRatio).toBe(0);
    expect(sorted[sorted.length - 1].maxRatio).toBe(Infinity);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].minRatio).toBe(sorted[i - 1].maxRatio); // contiguous, no gaps/overlap
    }
  });

  it('every built-in is flagged builtIn and has all sections visible by default', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.builtIn).toBe(true);
      expect(p.sections.time.visible).toBe(true);
      expect(p.bar.mode).toBe('divider');
    }
  });

  it('buildDefaultState seeds version, presets, and null pin', () => {
    const s = buildDefaultState();
    expect(s.version).toBeGreaterThan(0);
    expect(s.presets.length).toBe(7);
    expect(s.pinnedPresetId).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module './fullscreen-presets.data'`).

Run: `npm run test:web`

- [ ] **Step 3: Implement the data file**

```ts
import {
  STATE_VERSION,
  type FullscreenConfigState,
  type FullscreenPreset,
  type SectionBase,
  type SectionStyle,
} from './fullscreen-preset';

const timeStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 200, opacity: 1 });
const dateStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 300, opacity: 0.6 });

// Base regimes (verbatim from the locked editorial-devices tuning).
const LANDSCAPE = {
  time: { cqw: 120, cqh: 68 } as SectionBase, // cqh binds in landscape
  date: { cqw: 8, cqh: 5 } as SectionBase,
  bar: { cqw: 120, cqh: 56 } as SectionBase,
};
const NEAR_SQUARE = {
  time: { cqw: 38, cqh: 64 } as SectionBase, // cqw binds near square
  date: { cqw: 3.4, cqh: 4 } as SectionBase,
  bar: { cqw: 58, cqh: 62 } as SectionBase,
};
const PHONE = {
  time: { cqw: 24, cqh: 200 } as SectionBase, // cqw binds in portrait
  date: { cqw: 3.4, cqh: 200 } as SectionBase,
  bar: { cqw: 60, cqh: 200 } as SectionBase,
};

function preset(
  id: string,
  name: string,
  minRatio: number,
  maxRatio: number,
  bases: FullscreenPreset['bases'],
): FullscreenPreset {
  return {
    id,
    name,
    minRatio,
    maxRatio,
    bar: { mode: 'divider', sizeScale: 1, opacity: 0.34 },
    sections: {
      time: timeStyle(),
      weekday: dateStyle(),
      month: dateStyle(),
      day: dateStyle(),
      gmt: dateStyle(),
    },
    bases,
    gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
    builtIn: true,
  };
}

export const BUILT_IN_PRESETS: FullscreenPreset[] = [
  preset('phone', 'PHONE', 0, 0.62, PHONE),
  preset('tablet-portrait', 'TABLET PORTRAIT', 0.62, 0.87, NEAR_SQUARE),
  preset('square', 'SQUARE', 0.87, 1.15, NEAR_SQUARE),
  preset('tablet-43', 'TABLET 4:3', 1.15, 1.45, NEAR_SQUARE),
  preset('laptop', 'LAPTOP / SMART DISPLAY', 1.45, 1.7, LANDSCAPE),
  preset('widescreen', 'WIDESCREEN / TV', 1.7, 1.95, LANDSCAPE),
  preset('ultrawide', 'ULTRAWIDE', 1.95, Infinity, LANDSCAPE),
];

export function buildDefaultState(): FullscreenConfigState {
  return {
    version: STATE_VERSION,
    // deep clone so callers can mutate freely
    presets: BUILT_IN_PRESETS.map((p) => structuredClone(p)),
    pinnedPresetId: null,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS.** Run: `npm run test:web`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-presets.data.ts apps/web/src/app/faces/fullscreen/fullscreen-presets.data.spec.ts
git commit -m "feat(web): built-in fullscreen ratio-band presets"
```

---

### Task 3: Device → ratio table

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/device-ratios.ts`
- Test: `apps/web/src/app/faces/fullscreen/device-ratios.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEVICE_RATIOS, searchDevices } from './device-ratios';

describe('device ratios', () => {
  it('stores ratio = width / height', () => {
    const tv = DEVICE_RATIOS.find((d) => d.name.includes('1080p'));
    expect(tv && Math.abs(tv.ratio - 16 / 9) < 0.01).toBe(true);
  });

  it('searchDevices is case-insensitive substring match', () => {
    const r = searchDevices('iphone 16');
    expect(r.some((d) => d.name.toLowerCase().includes('iphone 16'))).toBe(true);
    expect(searchDevices('')).toEqual(DEVICE_RATIOS); // empty query returns all
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement**

```ts
export type DeviceCategory =
  | 'phone' | 'tablet' | 'laptop' | 'desktop' | 'tv' | 'console' | 'handheld' | 'display';

export interface DeviceRatio {
  name: string;
  ratio: number; // width / height (landscape orientation unless name says portrait)
  category: DeviceCategory;
}

const r = (w: number, h: number) => w / h;

export const DEVICE_RATIOS: DeviceRatio[] = [
  { name: 'Samsung mini display 840×400', ratio: r(840, 400), category: 'display' },
  { name: 'Desktop / TV 1080p (16:9)', ratio: r(1920, 1080), category: 'tv' },
  { name: 'Ultrawide monitor (21:9)', ratio: r(21, 9), category: 'desktop' },
  { name: 'MacBook / laptop (16:10)', ratio: r(16, 10), category: 'laptop' },
  { name: 'Steam Deck', ratio: r(1280, 800), category: 'handheld' },
  { name: 'Nintendo Switch (docked)', ratio: r(1280, 720), category: 'console' },
  { name: 'PS5 (TV 16:9)', ratio: r(1920, 1080), category: 'console' },
  { name: 'iPad Pro 11" landscape', ratio: r(1668, 1194), category: 'tablet' },
  { name: 'iPad Pro 11" portrait', ratio: r(1194, 1668), category: 'tablet' },
  { name: 'Surface Pro 7 (3:2)', ratio: r(3, 2), category: 'tablet' },
  { name: 'Google Nest Hub', ratio: r(1024, 600), category: 'display' },
  { name: 'Amazon Echo Show 8', ratio: r(1280, 800), category: 'display' },
  { name: 'iPhone 16 Pro Max portrait', ratio: r(1320, 2868), category: 'phone' },
  { name: 'iPhone 16 Pro Max landscape', ratio: r(2868, 1320), category: 'phone' },
  { name: 'iPhone SE portrait', ratio: r(750, 1334), category: 'phone' },
  { name: 'Samsung Galaxy S24 portrait', ratio: r(1080, 2340), category: 'phone' },
];

export function searchDevices(query: string): DeviceRatio[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEVICE_RATIOS;
  return DEVICE_RATIOS.filter((d) => d.name.toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/device-ratios.ts apps/web/src/app/faces/fullscreen/device-ratios.spec.ts
git commit -m "feat(web): device-name to screen-ratio lookup table"
```

---

### Task 4: `FullscreenConfigStore` (signal-based)

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.spec.ts`

Signal-based so the face and config sheet share one reactive source. Persists on every mutation.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { PRESETS_KEY, PIN_KEY } from './fullscreen-preset';

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

  it('seeds the 7 built-ins on first load and persists them', () => {
    expect(store.state().presets).toHaveLength(7);
    expect(JSON.parse(mem[PRESETS_KEY]).presets).toHaveLength(7);
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(store.resolveForRatio(2.1).name).toBe('ULTRAWIDE');
    expect(store.resolveForRatio(1.78).name).toBe('WIDESCREEN / TV');
    expect(store.resolveForRatio(0.46).name).toBe('PHONE');
    // boundary: maxRatio is exclusive
    expect(store.resolveForRatio(0.62).id).toBe('tablet-portrait');
  });

  it('pin overrides ratio resolution', () => {
    store.setPin('phone');
    expect(store.activeFor(2.1).id).toBe('phone');
    store.setPin(null);
    expect(store.activeFor(2.1).id).toBe('ultrawide');
  });

  it('addPreset inserts a band cloned from the nearest preset and stays sorted', () => {
    const before = store.state().presets.length;
    const id = store.addPreset({ name: 'CUSTOM', minRatio: 1.0, maxRatio: 1.1 });
    expect(store.state().presets.length).toBe(before + 1);
    const minRatios = store.state().presets.map((p) => p.minRatio);
    expect([...minRatios]).toEqual([...minRatios].sort((a, b) => a - b));
    expect(store.state().presets.find((p) => p.id === id)!.builtIn).toBe(false);
  });

  it('deletePreset keeps at least one and clears a dangling pin', () => {
    store.setPin('phone');
    store.deletePreset('phone');
    expect(store.state().presets.find((p) => p.id === 'phone')).toBeUndefined();
    expect(store.state().pinnedPresetId).toBeNull();
  });

  it('updateSection merges a partial and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5, visible: false });
    const t = store.state().presets.find((p) => p.id === 'phone')!.sections.time;
    expect(t.sizeScale).toBe(1.5);
    expect(t.visible).toBe(false);
    expect(JSON.parse(mem[PRESETS_KEY]).presets.find((p: any) => p.id === 'phone').sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right preset', () => {
    store.updateBar('ultrawide', { mode: 'progress' });
    expect(store.state().presets.find((p) => p.id === 'ultrawide')!.bar.mode).toBe('progress');
    store.updateGap('ultrawide', 'timeToBar', 1.4);
    expect(store.state().presets.find((p) => p.id === 'ultrawide')!.gaps.timeToBar).toBe(1.4);
  });

  it('resolveDevice maps a device name to its ratio', () => {
    expect(store.resolveDevice('iPhone SE portrait')).toBeCloseTo(750 / 1334, 3);
    expect(store.resolveDevice('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module './fullscreen-config-store.service'`).

- [ ] **Step 3: Implement the store**

```ts
import { Injectable, computed, signal } from '@angular/core';
import {
  PIN_KEY,
  PRESETS_KEY,
  STATE_VERSION,
  type FullscreenConfigState,
  type FullscreenPreset,
  type SectionKey,
  type SectionStyle,
  type BarStyle,
} from './fullscreen-preset';
import { buildDefaultState } from './fullscreen-presets.data';
import { DEVICE_RATIOS } from './device-ratios';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Math.floor(performance.now() * 1000).toString(36)}`;
}

@Injectable({ providedIn: 'root' })
export class FullscreenConfigStore {
  private readonly _state = signal<FullscreenConfigState>(this.load());
  readonly state = this._state.asReadonly();

  // ---- selection -----------------------------------------------------------
  resolveForRatio(ratio: number): FullscreenPreset {
    const presets = this._state().presets;
    return (
      presets.find((p) => ratio >= p.minRatio && ratio < p.maxRatio) ??
      // nearest band by clamped distance, as a safety net
      [...presets].sort(
        (a, b) => bandDistance(a, ratio) - bandDistance(b, ratio),
      )[0]
    );
  }

  activeFor(ratio: number): FullscreenPreset {
    const pin = this._state().pinnedPresetId;
    if (pin) {
      const pinned = this._state().presets.find((p) => p.id === pin);
      if (pinned) return pinned;
    }
    return this.resolveForRatio(ratio);
  }

  resolveDevice(name: string): number | null {
    return DEVICE_RATIOS.find((d) => d.name === name)?.ratio ?? null;
  }

  // ---- mutations -----------------------------------------------------------
  setPin(id: string | null): void {
    this.commit({ ...this._state(), pinnedPresetId: id });
  }

  addPreset(seed: { name: string; minRatio: number; maxRatio: number }): string {
    const id = newId();
    const mid = (seed.minRatio + Math.min(seed.maxRatio, seed.minRatio + 2)) / 2;
    const base = this.resolveForRatio(mid);
    const clone = structuredClone(base);
    const next: FullscreenPreset = { ...clone, id, name: seed.name, minRatio: seed.minRatio, maxRatio: seed.maxRatio, builtIn: false };
    const presets = [...this._state().presets, next].sort((a, b) => a.minRatio - b.minRatio);
    this.commit({ ...this._state(), presets });
    return id;
  }

  deletePreset(id: string): void {
    const s = this._state();
    if (s.presets.length <= 1) return;
    const presets = s.presets.filter((p) => p.id !== id);
    const pinnedPresetId = s.pinnedPresetId === id ? null : s.pinnedPresetId;
    this.commit({ ...s, presets, pinnedPresetId });
  }

  renamePreset(id: string, name: string): void {
    this.patchPreset(id, (p) => ({ ...p, name }));
  }

  duplicatePreset(id: string): string {
    const src = this._state().presets.find((p) => p.id === id);
    if (!src) return id;
    const copyId = newId();
    const copy: FullscreenPreset = { ...structuredClone(src), id: copyId, name: `${src.name} 2`, builtIn: false };
    const presets = [...this._state().presets, copy].sort((a, b) => a.minRatio - b.minRatio);
    this.commit({ ...this._state(), presets });
    return copyId;
  }

  updateSection(id: string, key: SectionKey, partial: Partial<SectionStyle>): void {
    this.patchPreset(id, (p) => ({
      ...p,
      sections: { ...p.sections, [key]: { ...p.sections[key], ...partial } },
    }));
  }

  updateBar(id: string, partial: Partial<BarStyle>): void {
    this.patchPreset(id, (p) => ({ ...p, bar: { ...p.bar, ...partial } }));
  }

  updateGap(id: string, key: keyof FullscreenPreset['gaps'], value: number): void {
    this.patchPreset(id, (p) => ({ ...p, gaps: { ...p.gaps, [key]: value } }));
  }

  // ---- internals -----------------------------------------------------------
  private patchPreset(id: string, fn: (p: FullscreenPreset) => FullscreenPreset): void {
    const presets = this._state().presets.map((p) => (p.id === id ? fn(p) : p));
    this.commit({ ...this._state(), presets });
  }

  private commit(state: FullscreenConfigState): void {
    this._state.set(state);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(state));
      localStorage.setItem(PIN_KEY, state.pinnedPresetId ?? '');
    } catch {
      // quota/unavailable — in-memory only
    }
  }

  private load(): FullscreenConfigState {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FullscreenConfigState;
        if (parsed?.presets?.length) return this.migrate(parsed);
      }
    } catch {
      // fall through to seed
    }
    const seeded = buildDefaultState();
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(seeded));
    } catch { /* ignore */ }
    return seeded;
  }

  // Additive migration: future versions merge in new built-ins without clobbering
  // user edits to existing presets.
  private migrate(state: FullscreenConfigState): FullscreenConfigState {
    if (state.version >= STATE_VERSION) return state;
    return { ...state, version: STATE_VERSION };
  }
}

function bandDistance(p: FullscreenPreset, ratio: number): number {
  if (ratio < p.minRatio) return p.minRatio - ratio;
  if (ratio >= p.maxRatio) return ratio - p.maxRatio;
  return 0;
}
```

- [ ] **Step 4: Run tests — expect PASS.** Run: `npm run test:web`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.spec.ts
git commit -m "feat(web): signal-based fullscreen config store"
```

---

# PHASE 2 — Face runtime (sectioned template, ratio selection, bar modes)

### Task 5: Formatter — minute fraction + split date parts

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/clock-formatter.ts`
- Test: `apps/web/src/app/faces/fullscreen/clock-formatter.spec.ts`

- [ ] **Step 1: Add failing tests** (append to the existing spec)

```ts
import { minuteFraction, dateParts } from './clock-formatter';

describe('minuteFraction', () => {
  it('is seconds(+ms)/60 of the current minute', () => {
    expect(minuteFraction(new Date('2026-06-17T09:41:30.000Z'))).toBeCloseTo(0.5, 3);
    expect(minuteFraction(new Date('2026-06-17T09:41:00.000Z'))).toBeCloseTo(0, 3);
  });
});

describe('dateParts', () => {
  it('returns weekday, month, day, gmt for a zone', () => {
    const p = dateParts(new Date('2026-06-17T16:41:00Z'), 'en-US', 'America/Los_Angeles');
    expect(p.weekday).toBe('Wed');
    expect(p.month).toBe('Jun');
    expect(p.day).toBe('17');
    expect(p.gmt).toBe('GMT−07:00');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** (add to `clock-formatter.ts`, reuse the existing `gmtOffset`)

```ts
export function minuteFraction(date: Date): number {
  return (date.getSeconds() + date.getMilliseconds() / 1000) / 60;
}

export interface DateParts { weekday: string; month: string; day: string; gmt: string; }

export function dateParts(date: Date, locale: string, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'short', month: 'short', day: 'numeric', timeZone,
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return { weekday: get('weekday'), month: get('month'), day: get('day'), gmt: gmtOffset(date, timeZone) };
}
```

- [ ] **Step 4: Run tests — expect PASS.** (`getSeconds`/`getMilliseconds` use local time, which is fine for the fraction.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/clock-formatter.ts apps/web/src/app/faces/fullscreen/clock-formatter.spec.ts
git commit -m "feat(web): minute-fraction + split date parts for fullscreen"
```

---

### Task 6: Sectioned template + CSS-variable application

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.ts`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.html`
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.scss`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.spec.ts`

The component computes the active preset from the container ratio (via `[appContainerSize]` host directive) and exposes a `styleVars` map applied to the host with `[style]`. The template renders sections reading those vars.

- [ ] **Step 1: Write a failing test** (active preset selection by ratio)

```ts
// In the spec, define the host's clientWidth/clientHeight, then assert the
// computed active preset name. Example assertion:
it('selects the ULTRAWIDE preset for a 2.1 ratio host', () => {
  const fixture = TestBed.createComponent(FullscreenFaceComponent);
  const host = fixture.nativeElement as HTMLElement;
  Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
  Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
  fixture.detectChanges();
  expect(fixture.componentInstance.activePreset().name).toBe('ULTRAWIDE');
});
```

- [ ] **Step 2: Run — expect FAIL** (no `activePreset`).

- [ ] **Step 3: Implement the component logic**

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { bigTime, dateParts, minuteFraction } from './clock-formatter';
import type { FullscreenPreset, SectionKey } from './fullscreen-preset';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
})
export class FullscreenFaceComponent {
  private readonly clock = inject(ClockService);
  private readonly size = inject(ContainerSizeDirective);
  private readonly store = inject(FullscreenConfigStore);
  private readonly locale = navigator.language || 'en-US';

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activePreset = computed(() => this.store.activeFor(this.ratio()));

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly barFill = computed(() => minuteFraction(this.clock.now()));

  // Map the active preset to CSS custom properties on the host.
  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activePreset()));
}

function base(b: { cqw: number; cqh: number }): string {
  return `min(${b.cqw}cqw, ${b.cqh}cqh)`;
}
function varsFor(p: FullscreenPreset): Record<string, string> {
  const v: Record<string, string> = {
    '--time-base': base(p.bases.time),
    '--date-base': base(p.bases.date),
    '--bar-base': base(p.bases.bar),
    '--gap-time-bar': `calc(${p.gaps.timeToBar} * min(2cqw, 3cqh))`,
    '--gap-bar-date': `calc(${p.gaps.barToDate} * min(2cqw, 3cqh))`,
    '--gap-date-parts': `${p.gaps.betweenDateParts * 0.5}em`,
  };
  v['--time-scale'] = `${p.sections.time.sizeScale}`;
  v['--time-weight'] = `${p.sections.time.weight}`;
  v['--time-opacity'] = `${p.sections.time.opacity}`;
  (['weekday', 'month', 'day', 'gmt'] as SectionKey[]).forEach((k) => {
    v[`--${k}-scale`] = `${p.sections[k].sizeScale}`;
    v[`--${k}-weight`] = `${p.sections[k].weight}`;
    v[`--${k}-opacity`] = `${p.sections[k].opacity}`;
    v[`--${k}-display`] = p.sections[k].visible ? 'inline' : 'none';
  });
  v['--bar-opacity'] = `${p.bar.opacity}`;
  v['--bar-scale'] = `${p.bar.sizeScale}`;
  return v;
}
```

- [ ] **Step 4: Write the template** (`fullscreen-face.component.html`)

```html
<div class="clock" [style]="styleVars()">
  <div class="time">
    <span class="digits">{{ big().digits }}</span>
    @if (big().ampm; as ampm) { <span class="ampm">{{ ampm }}</span> }
  </div>

  @switch (activePreset().bar.mode) {
    @case ('progress') { <div class="bar"><i [style.width.%]="barFill() * 100"></i></div> }
    @case ('divider') { <div class="bar divider"></div> }
  }

  <div class="date">
    <span class="weekday">{{ parts().weekday }}</span>
    <span class="sep">·</span>
    <span class="month">{{ parts().month }}</span>
    <span class="day">{{ parts().day }}</span>
    <span class="sep">·</span>
    <span class="gmt">{{ parts().gmt }}</span>
  </div>
</div>
```

- [ ] **Step 5: Write the SCSS** (`fullscreen-face.component.scss`) — keep `:host` `container-type: size` and the Editorial look; drive sizes from the vars.

```scss
:host {
  display: flex; width: 100%; height: 100%;
  align-items: center; justify-content: center;
  background: #050505; color: #fafafa;
  container-type: size;
}
.clock { display: flex; flex-direction: column; align-items: center; }
.time {
  display: flex; align-items: flex-start; gap: 0.04em;
  font-variant-numeric: tabular-nums; line-height: 0.9; letter-spacing: -0.01em;
  font-size: calc(var(--time-base) * var(--time-scale, 1));
  font-weight: var(--time-weight, 200);
  opacity: var(--time-opacity, 1);
  margin-bottom: var(--gap-time-bar, 0.5rem);
}
.ampm { font-size: 0.15em; font-weight: 300; letter-spacing: 0.18em; opacity: 0.85; align-self: flex-start; margin-top: 0.55em; }
.bar { width: calc(var(--bar-base) * var(--bar-scale, 1)); height: 1.5px; opacity: var(--bar-opacity, 0.34); margin-bottom: var(--gap-bar-date, 0.5rem); }
.bar.divider { background: currentColor; }
.bar:not(.divider) { background: rgba(250, 250, 250, 0.16); border-radius: 999px; overflow: hidden; }
.bar > i { display: block; height: 100%; background: #fafafa; border-radius: 999px; }
.date { display: flex; align-items: baseline; gap: var(--gap-date-parts, 0.5em); text-transform: uppercase; letter-spacing: 0.32em; }
.date .sep { opacity: 0.4; }
.weekday { display: var(--weekday-display, inline); font-size: calc(var(--date-base) * var(--weekday-scale, 1)); font-weight: var(--weekday-weight, 300); opacity: var(--weekday-opacity, 0.6); }
.month { display: var(--month-display, inline); font-size: calc(var(--date-base) * var(--month-scale, 1)); font-weight: var(--month-weight, 300); opacity: var(--month-opacity, 0.6); }
.day { display: var(--day-display, inline); font-size: calc(var(--date-base) * var(--day-scale, 1)); font-weight: var(--day-weight, 300); opacity: var(--day-opacity, 0.6); }
.gmt { display: var(--gmt-display, inline); font-size: calc(var(--date-base) * var(--gmt-scale, 1)); font-weight: var(--gmt-weight, 300); opacity: var(--gmt-opacity, 0.6); }
```

- [ ] **Step 6: Run tests + build — expect PASS.** Run: `npm run test:web && npm run build:web`. Manually verify the face matches the locked Editorial look at a few sizes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/
git commit -m "feat(web): fullscreen face renders ratio-selected preset via CSS vars"
```

---

# PHASE 3 — Config sheet UI

### Task 7: Gear trigger + config sheet shell

**Files:**
- Modify: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.{ts,html,scss}` (add gear, open state, render `<app-fullscreen-config>` when open; reuse the Daily Schedule gear/auto-hide pattern and `FaceConfigService`).
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.{ts,html,scss}`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-config/fullscreen-config.component.spec.ts`

Mirror `ScheduleFaceComponent`'s gear (`gearVisible` + auto-hide timer, `FaceConfigService.open`) and `ScheduleConfigComponent`'s sheet shell (`<app-sheet>` + `<app-nav-header>` with a single `closed` output; close = apply).

- [ ] **Step 1: Failing test** — config emits `closed` on the X (`button[aria-label="Close"]`) after `SHEET_ANIMATION_MS` (copy the pattern from `schedule-config.component.spec.ts`).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** the config component shell:

```ts
import { ChangeDetectionStrategy, Component, inject, output, viewChild } from '@angular/core';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SheetComponent } from '../../../ui/sheet/sheet.component';
import { NavHeaderComponent } from '../../../ui/nav-header/nav-header.component';
import { IconButtonComponent } from '../../../ui/icon-button/icon-button.component';

@Component({
  selector: 'app-fullscreen-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent],
  templateUrl: './fullscreen-config.component.html',
  styleUrl: './fullscreen-config.component.scss',
})
export class FullscreenConfigComponent {
  protected readonly store = inject(FullscreenConfigStore);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);
  close(): void { this.sheet()?.close(); }
  onSheetClosed(): void { this.closed.emit(); }
}
```

Template shell:

```html
<app-sheet [fullHeight]="true" sheetLabel="Fullscreen" (closed)="onSheetClosed()">
  <div class="cfg">
    <app-nav-header title="Fullscreen">
      <app-icon-button navLeading icon="xmark" label="Close" (click)="close()" />
    </app-nav-header>
    <!-- preview, preset row, knobs added in later tasks -->
  </div>
</app-sheet>
```

In the face: add a gear button (`<app-icon name="gearshape">`) that sets `configOpen`, render `@if (configOpen()) { <app-fullscreen-config (closed)="onConfigClosed()" /> }`, and on close just reset flags (store already applied live).

- [ ] **Step 4: Run tests + build — expect PASS.**
- [ ] **Step 5: Commit** `feat(web): fullscreen config sheet shell + gear trigger`.

---

### Task 8: Preset cards (CRUD) + live preview

**Files:** Modify the config component `{ts,html,scss}` + spec.

- [ ] **Step 1: Failing tests** — clicking a preset card calls `store.setPin`? No: selecting a card sets the *edited* preset (a local `editingId` signal, default = active for current ratio). `+` calls `store.addPreset`, `×` calls `store.deletePreset` (guarded), title edit calls `store.renamePreset`. Assert store side-effects.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — a horizontally scrollable `.preset-row` of cards built like `schedule-config.component.html` (active = `editingId()`, `.preset-delete` with `<app-icon name="xmark">` guarded by `store.state().presets.length > 1`, a trailing `.add-preset-card` with `<app-icon name="plus">`). Add a live preview block that reuses the face's section markup driven by the edited preset's vars (extract a small `varsFor` shared helper or import it from a new `fullscreen-style.ts` used by both the face and preview to stay DRY). The preview reads the edited preset so knob changes show instantly.
- [ ] **Step 4: Run tests + build — expect PASS.**
- [ ] **Step 5: Commit** `feat(web): fullscreen preset cards with add/delete/rename + live preview`.

---

### Task 9: Section knobs, gaps, bar mode, pin

**Files:** Modify the config component `{ts,html,scss}` + spec.

- [ ] **Step 1: Failing tests** — moving the time size slider calls `store.updateSection(editingId, 'time', { sizeScale })`; a show/hide toggle flips `visible`; the bar segmented control calls `store.updateBar(editingId, { mode })`; a gap slider calls `store.updateGap`; the pin toggle calls `store.setPin(editingId | null)`. Assert each store mutation.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — for each section (Time, Bar, Weekday, Month, Day, GMT) render a row: a show/hide toggle (iOS switch), a size `range` slider (0.5–2.0 step 0.05) bound to `sizeScale`, a weight control, an opacity slider; the Bar row adds a 3-way segmented control (`progress | divider | hidden`). Add the three gap sliders and a pin toggle (Auto ↔ Pinned). Reuse the iOS slider styling from `time-machine.component.scss` (copy the `input[type=range]` rules, or extract a shared `_slider.scss` partial under `ui/` and `@use` it in both — preferred for DRY). All handlers call the store; the live preview + face update reactively.
- [ ] **Step 4: Run tests + build — expect PASS.**
- [ ] **Step 5: Commit** `feat(web): fullscreen section knobs, gaps, bar mode, pin`.

---

# PHASE 4 — Device search

### Task 10: Device search combobox

**Files:** Modify the config component `{ts,html,scss}` + spec.

- [ ] **Step 1: Failing tests** — typing in the search filters via `searchDevices`; clicking a result resolves its ratio and selects the matching preset for editing (`store.resolveForRatio(ratio)` → set `editingId`); if no band is a good match, offer to `store.addPreset` a band around that ratio. Assert filtering + selection.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — a searchable combobox mirroring the Time Machine timezone picker (`tzQuery`/`filteredZones`/`pickTimeZone` pattern in `time-machine.component.ts`): a text input bound to a `deviceQuery` signal, a filtered list from `searchDevices(deviceQuery())`, each result showing name + ratio; clicking sets `editingId` to `store.resolveForRatio(device.ratio).id` (and, when the nearest band's range doesn't contain the ratio, shows an "Add preset for this ratio" action calling `store.addPreset`).
- [ ] **Step 4: Run tests + build — expect PASS.**
- [ ] **Step 5: Commit** `feat(web): device-name search resolving to a ratio preset`.

---

### Task 11: Final review + branch finish

- [ ] Run the full suite + build: `npm run test:web && npm run build:web`.
- [ ] Manually verify at 840×400, 16:9, 4:3, square, and phone portrait that the face auto-selects the right preset, knobs apply live, pin works, and presets persist across refresh.
- [ ] Use **superpowers:finishing-a-development-branch** to wrap up (PR or merge per the user's call).

---

## Notes for the implementer

- **DRY the style mapping:** extract `varsFor(preset)` into `fullscreen-style.ts` and import it from both the face and the config preview (don't duplicate).
- **Close = apply** is the app-wide sheet model (see `[[sheets-apply-on-close]]` behavior in the Time Machine + Daily Schedule sheets): the X / backdrop / Escape all emit `closed`; there is no confirm button. The store mutates live, so closing simply unmounts.
- **Icons** must use the `<app-icon>` SF-Symbol layer (`gearshape`, `xmark`, `plus`, `checkmark`), never emoji/ad-hoc glyphs.
- **Determinism:** use fixed `Date` values in any time-dependent test.
- Keep each face/sheet looking great in **every** dimension — validate against the locked `editorial-devices` showcase.
