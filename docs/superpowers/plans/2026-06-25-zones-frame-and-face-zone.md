# Time Zones: Frame + Per-Face Zone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Time Machine's date/time zone-aware (with a Move/Freeze zone-change choice), extract a shared zone catalog + searchable picker, and add a per-face display zone to the Fullscreen face.

**Architecture:** Two pure `core/` modules (`zone-catalog` data + service, `zone-time` wall-clock↔instant math), a `shared/ui/zone-picker` widget, then the Time Machine and the Fullscreen Settings panel consume them. Each task ends with build + tests green.

**Tech Stack:** Angular 21 standalone + signals (zoneless), Vitest, SCSS `@use 'tokens'`, native `Intl.DateTimeFormat`.

**Conventions for every task:**
- Run all commands from repo root `/Volumes/AllyDrive/Storage/Repos/allyclock`.
- Gate: `npm run test:web` AND `npm run build:web` both green before committing. Lint must pass too — prefer `readonly T[]` over `ReadonlyArray<T>` (eslint `array-type`).
- Two-space indent, single quotes, final newline. Use the U+2212 minus (`−`) in offset strings, matching the app.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- If a stale `.git/index.lock` exists with no running git process, `rm -f .git/index.lock` and retry.
- Spec: `docs/superpowers/specs/2026-06-25-zones-frame-and-face-zone-design.md`.

---

## Task 1: `core/zone-catalog` (data + service) + LocationService dedup

**Files:**
- Create: `apps/web/src/app/core/zone-catalog.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/core/location.service.ts` (+ `.spec.ts` only if it asserts the parse)

- [ ] **Step 1: Create the catalog module**

`apps/web/src/app/core/zone-catalog.ts` (helpers lifted verbatim from `time-machine.component.ts`, plus a caching service):

```ts
import { Injectable } from '@angular/core';

export interface TimeZoneOption {
  id: string;
  label: string;
  offset: number; // minutes east of UTC, for sorting
}

// Curated zones for the rare runtime without Intl.supportedValuesOf.
const FALLBACK_TIME_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function buildTimeZones(localZone: string): string[] {
  const base =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES;
  return base.includes(localZone) ? base : [localZone, ...base];
}

// Current UTC offset (minutes east of UTC) for a zone, parsed from Intl longOffset.
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0; // bare "GMT" === UTC
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// "+09:00" / "−07:00" (U+2212 minus, matching the rest of the app).
export function formatOffset(min: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = min < 0 ? '−' : '+';
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Picker options: each zone labelled with its current GMT offset, sorted by
// offset then zone name.
export function buildTimeZoneOptions(localZone: string, at: Date): TimeZoneOption[] {
  return buildTimeZones(localZone)
    .map((id) => {
      const offset = zoneOffsetMinutes(id, at);
      return { id, offset, label: `${id}  ${formatOffset(offset)}` };
    })
    .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id));
}

// App-wide cached zone catalog: the full-IANA scan runs once. Consumers (Time
// Machine, Settings picker) read the same list.
@Injectable({ providedIn: 'root' })
export class ZoneCatalog {
  private cached: TimeZoneOption[] | null = null;

  options(): TimeZoneOption[] {
    if (!this.cached) {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.cached = buildTimeZoneOptions(local, new Date());
    }
    return this.cached;
  }
}
```

- [ ] **Step 2: Write the catalog spec**

`apps/web/src/app/core/zone-catalog.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTimeZoneOptions, formatOffset, zoneOffsetMinutes } from './zone-catalog';

describe('zone-catalog', () => {
  it('formatOffset uses the U+2212 minus for negative offsets', () => {
    expect(formatOffset(540)).toBe('+09:00');
    expect(formatOffset(-420)).toBe('−07:00'); // U+2212, not ASCII -
  });

  it('zoneOffsetMinutes returns minutes east of UTC', () => {
    const at = new Date('2026-06-25T00:00:00Z');
    expect(zoneOffsetMinutes('UTC', at)).toBe(0);
    expect(zoneOffsetMinutes('Asia/Seoul', at)).toBe(540);
  });

  it('buildTimeZoneOptions labels "id  ±hh:mm" and sorts by offset then id', () => {
    const opts = buildTimeZoneOptions('UTC', new Date('2026-06-25T00:00:00Z'));
    expect(opts.length).toBeGreaterThan(0);
    const seoul = opts.find((o) => o.id === 'Asia/Seoul')!;
    expect(seoul.label).toBe('Asia/Seoul  +09:00');
    for (let i = 1; i < opts.length; i++) {
      const prev = opts[i - 1];
      const cur = opts[i];
      expect(prev.offset < cur.offset || (prev.offset === cur.offset && prev.id <= cur.id)).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run the spec to confirm it passes**

Run: `npm run test:web` → the catalog tests pass (the module is standalone).

- [ ] **Step 4: Dedup LocationService's offset parse**

Read `apps/web/src/app/core/location.service.ts`. Its private `offsetOf` re-implements the Intl `longOffset` parse. Replace its body to reuse `zoneOffsetMinutes`, **preserving the current ASCII output** (`+hh:mm` / `-hh:mm`) so World Cards display doesn't change:

```ts
import { zoneOffsetMinutes } from './zone-catalog';

// …inside the file, replace the bottom helper:
function offsetOf(timeZone: string, date: Date): string {
  const min = zoneOffsetMinutes(timeZone, date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = min < 0 ? '-' : '+'; // ASCII minus — preserves existing output
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
```

(If `location.service.spec.ts` exists, run it — outputs must be unchanged. The Time Machine keeps its own copies of these helpers for now; they're removed in Task 4.)

- [ ] **Step 5: Verify + commit**

Run: `npm run test:web` (green) and `npm run build:web` (success).

```bash
git add apps/web/src/app/core/zone-catalog.ts apps/web/src/app/core/zone-catalog.spec.ts apps/web/src/app/core/location.service.ts
git commit -m "$(printf 'feat(web): add core ZoneCatalog; dedupe LocationService offset parse\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `core/zone-time` (wall-clock ↔ instant math)

**Files:**
- Create: `apps/web/src/app/core/zone-time.ts` (+ `.spec.ts`)

- [ ] **Step 1: Write the failing spec (incl. a DST boundary)**

`apps/web/src/app/core/zone-time.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { instantFromWallClock, wallClockInZone, inputToWallClock, wallClockToInput } from './zone-time';

describe('zone-time', () => {
  it('instantFromWallClock interprets fields in the given zone', () => {
    // 12:00 in Seoul (+09:00) is 03:00 UTC.
    const seoul = instantFromWallClock({ year: 2026, month: 6, day: 25, hour: 12, minute: 0 }, 'Asia/Seoul');
    expect(seoul.toISOString()).toBe('2026-06-25T03:00:00.000Z');
    // 12:00 in LA (PDT -07:00 in June) is 19:00 UTC.
    const la = instantFromWallClock({ year: 2026, month: 6, day: 25, hour: 12, minute: 0 }, 'America/Los_Angeles');
    expect(la.toISOString()).toBe('2026-06-25T19:00:00.000Z');
  });

  it('handles a DST spring-forward boundary (New York, 2026-03-08)', () => {
    // After spring-forward, NY is EDT (-04:00); 10:00 EDT = 14:00 UTC.
    const ny = instantFromWallClock({ year: 2026, month: 3, day: 8, hour: 10, minute: 0 }, 'America/New_York');
    expect(ny.toISOString()).toBe('2026-03-08T14:00:00.000Z');
  });

  it('wallClockInZone is the inverse of instantFromWallClock', () => {
    const w = { year: 2026, month: 1, day: 1, hour: 23, minute: 30 };
    const inst = instantFromWallClock(w, 'Europe/Paris');
    expect(wallClockInZone(inst, 'Europe/Paris')).toEqual(w);
  });

  it('input string round-trips', () => {
    const w = { year: 2026, month: 6, day: 25, hour: 9, minute: 5 };
    expect(inputToWallClock(wallClockToInput(w))).toEqual(w);
    expect(wallClockToInput(w)).toBe('2026-06-25T09:05');
    expect(inputToWallClock('')).toBeNull();
    expect(inputToWallClock('garbage')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run test:web` → FAIL (module not found).

- [ ] **Step 3: Implement `zone-time.ts`**

```ts
import { zoneOffsetMinutes } from './zone-catalog';

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

// Instant → the wall-clock read off a clock in `zone` (minute precision, h23).
export function wallClockInZone(instant: Date, zone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: zone,
  }).formatToParts(instant);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

// Wall-clock + zone → the absolute instant (2-pass; single DST re-evaluation).
export function instantFromWallClock(w: WallClock, zone: string): Date {
  const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  const off = zoneOffsetMinutes(zone, new Date(guess));
  let inst = guess - off * 60000;
  const off2 = zoneOffsetMinutes(zone, new Date(inst));
  if (off2 !== off) inst = guess - off2 * 60000;
  return new Date(inst);
}

const pad = (n: number) => String(n).padStart(2, '0');

// WallClock → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
export function wallClockToInput(w: WallClock): string {
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

// "YYYY-MM-DDTHH:mm" → WallClock, or null if malformed.
export function inputToWallClock(value: string): WallClock | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}
```

- [ ] **Step 4: Run to confirm green**

Run: `npm run test:web` → all `zone-time` tests pass (incl. the DST case).

- [ ] **Step 5: Build + commit**

Run: `npm run build:web` (success).

```bash
git add apps/web/src/app/core/zone-time.ts apps/web/src/app/core/zone-time.spec.ts
git commit -m "$(printf 'feat(web): add zone-aware wall-clock<->instant helpers (zone-time)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `shared/ui/zone-picker` (searchable widget)

**Files:**
- Create: `apps/web/src/app/shared/ui/zone-picker/zone-picker.component.{ts,html,scss}` (+ `.spec.ts`)

- [ ] **Step 1: Write the failing spec**

`apps/web/src/app/shared/ui/zone-picker/zone-picker.component.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ZonePickerComponent } from './zone-picker.component';
import type { TimeZoneOption } from '@core/zone-catalog';

const OPTIONS: TimeZoneOption[] = [
  { id: '', label: 'Follow Time Machine', offset: -10000 },
  { id: 'Asia/Seoul', label: 'Asia/Seoul  +09:00', offset: 540 },
  { id: 'Asia/Tokyo', label: 'Asia/Tokyo  +09:00', offset: 540 },
];

function make(selectedId = '') {
  const fixture = TestBed.createComponent(ZonePickerComponent);
  fixture.componentRef.setInput('options', OPTIONS);
  fixture.componentRef.setInput('selectedId', selectedId);
  fixture.detectChanges();
  return fixture;
}

describe('ZonePickerComponent', () => {
  it('renders all options and marks the selected one active', () => {
    const fixture = make('Asia/Seoul');
    const active = fixture.nativeElement.querySelector('.zp-option.active') as HTMLElement;
    expect(active.textContent).toContain('Asia/Seoul');
  });

  it('filters by the full label (name + offset)', () => {
    const fixture = make();
    fixture.componentInstance.query.set('tokyo');
    fixture.detectChanges();
    const opts = fixture.nativeElement.querySelectorAll('.zp-option');
    expect(opts.length).toBe(1);
    expect((opts[0] as HTMLElement).textContent).toContain('Asia/Tokyo');
  });

  it('emits picked on tap', () => {
    const fixture = make();
    let picked = '';
    fixture.componentInstance.picked.subscribe((id: string) => (picked = id));
    (fixture.nativeElement.querySelector('[data-id="Asia/Seoul"]') as HTMLButtonElement).click();
    expect(picked).toBe('Asia/Seoul');
  });

  it('shows the empty state when nothing matches', () => {
    const fixture = make();
    fixture.componentInstance.query.set('zzz');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.zp-empty')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run test:web` → FAIL (module not found).

- [ ] **Step 3: Implement the component**

`zone-picker.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { TimeZoneOption } from '@core/zone-catalog';

// Searchable zone list: a search box over a scrollable, filtered list. Live-apply
// on tap (emits picked immediately — no draft/commit). Hosts supply the options
// (incl. any synthetic leading entry like "Follow Time Machine") and the selected
// id, and place this inside their own sheet/sub-view with a back/cancel control.
@Component({
  selector: 'app-zone-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-picker.component.html',
  styleUrl: './zone-picker.component.scss',
})
export class ZonePickerComponent {
  readonly options = input.required<TimeZoneOption[]>();
  readonly selectedId = input<string>('');
  readonly picked = output<string>();

  readonly query = signal('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.options();
    return q ? all.filter((z) => z.label.toLowerCase().includes(q)) : all;
  });

  pick(id: string): void {
    this.picked.emit(id);
  }
}
```

`zone-picker.component.html`:

```html
<input
  class="zp-search"
  type="text"
  [value]="query()"
  (input)="query.set($any($event.target).value)"
  placeholder="Search time zone"
  aria-label="Search time zone"
/>
<div class="zp-list">
  @for (z of filtered(); track z.id) {
    <button
      type="button"
      class="zp-option"
      [class.active]="z.id === selectedId()"
      [attr.data-id]="z.id"
      (click)="pick(z.id)"
    >
      {{ z.label }}
    </button>
  } @empty {
    <p class="zp-empty">No matching time zone</p>
  }
</div>
```

`zone-picker.component.scss` (lifted from the TM picker styles, renamed `tm-tz-*` → `zp-*`):

```scss
@use 'tokens' as t;

:host {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.zp-search {
  appearance: none;
  width: 100%;
  box-sizing: border-box;
  background: t.$secondary-surface;
  border: none;
  border-radius: 8px;
  color: t.$label;
  font-size: 0.95rem;
  padding: 0.5rem 0.75rem;

  &::placeholder {
    color: t.$secondary-label;
  }
}

.zp-list {
  display: flex;
  flex-direction: column;
  max-height: 45vh;
  overflow-y: auto;
  border-radius: 8px;
}

.zp-option {
  background: none;
  border: none;
  color: t.$label;
  font-size: 0.95rem;
  text-align: left;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: rgba(118, 118, 128, 0.18);
  }

  &.active {
    color: t.$tint;
    font-weight: 600;
  }
}

.zp-empty {
  color: t.$secondary-label;
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem 0;
  margin: 0;
}
```

- [ ] **Step 4: Run to confirm green**

Run: `npm run test:web` → all `ZonePickerComponent` tests pass.

- [ ] **Step 5: Build + commit**

Run: `npm run build:web` (success).

```bash
git add apps/web/src/app/shared/ui/zone-picker
git commit -m "$(printf 'feat(web): add shared searchable ZonePicker widget\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: Time Machine — zone-aware date math + Move/Freeze + shared picker

**Files:**
- Modify: `apps/web/src/app/layout/time-machine/time-machine.component.{ts,html,scss}` (+ `.spec.ts`)

This is the largest task. The component switches its date math from browser-local to TM-zone-aware, adds the Move/Freeze control, and consumes `ZoneCatalog` + `<app-zone-picker>`.

- [ ] **Step 1: Rewrite the component class**

Replace `apps/web/src/app/layout/time-machine/time-machine.component.ts` with (the module-level zone helpers are gone — now imported from `zone-catalog`; date math uses `zone-time`):

```ts
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ClockService } from '@core/clock.service';
import { ZoneCatalog, type TimeZoneOption } from '@core/zone-catalog';
import {
  instantFromWallClock,
  wallClockInZone,
  wallClockToInput,
  inputToWallClock,
  type WallClock,
} from '@core/zone-time';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';

const MS_PER_DAY = 86400000;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// 1-based day of the year from a WallClock (Jan 1 === 1).
function dayOfYearOf(w: WallClock): number {
  const start = Date.UTC(w.year, 0, 0);
  const at = Date.UTC(w.year, w.month - 1, w.day);
  return Math.round((at - start) / MS_PER_DAY);
}

@Component({
  selector: 'app-time-machine',
  imports: [
    AutoHideDirective,
    IconButtonComponent,
    IconComponent,
    NavHeaderComponent,
    SheetComponent,
    ZonePickerComponent,
  ],
  templateUrl: './time-machine.component.html',
  styleUrl: './time-machine.component.scss',
})
export class TimeMachineComponent {
  private readonly clock = inject(ClockService);
  private readonly catalog = inject(ZoneCatalog);

  readonly isMocked = this.clock.isMocked;
  readonly panelOpen = signal(false);

  private readonly sheet = viewChild(SheetComponent);

  readonly zoneOptions = this.catalog.options();

  // datetime-local draft, held as the wall-clock string IN the TM zone.
  readonly draft = signal('');

  // Searchable Time Zone picker (a sub-view that replaces the controls).
  readonly tzPickerOpen = signal(false);

  // On-zone-change behaviour: 'move' keeps the typed digits and moves the
  // instant; 'freeze' keeps the instant and relabels. Session-only.
  readonly zoneChangeMode = signal<'move' | 'freeze'>('move');

  readonly activeZoneLabel = computed(
    () => this.zoneOptions.find((z) => z.id === this.clock.timeZone())?.label ?? this.clock.timeZone(),
  );

  // The draft as a WallClock (TM zone). Falls back to "now" if the field is
  // mid-edit/invalid.
  private readonly wall = computed<WallClock>(
    () => inputToWallClock(this.draft()) ?? wallClockInZone(this.clock.now(), this.clock.timeZone()),
  );

  readonly dayOfYear = computed(() => dayOfYearOf(this.wall()));
  readonly maxDayOfYear = computed(() => (isLeapYear(this.wall().year) ? 366 : 365));
  readonly minuteOfDay = computed(() => this.wall().hour * 60 + this.wall().minute);
  readonly dayLabel = computed(() => {
    const w = this.wall();
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: this.clock.timeZone(),
    }).format(instantFromWallClock(w, this.clock.timeZone()));
  });
  readonly timeLabel = computed(() => {
    const w = this.wall();
    return `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`;
  });

  readonly dayFillPercent = computed(() => {
    const max = this.maxDayOfYear();
    return max > 1 ? ((this.dayOfYear() - 1) / (max - 1)) * 100 : 0;
  });
  readonly timeFillPercent = computed(() => (this.minuteOfDay() / 1439) * 100);

  togglePanel(): void {
    if (this.panelOpen()) {
      this.cancel();
      return;
    }
    this.seedDraft();
    this.tzPickerOpen.set(false);
    this.panelOpen.set(true);
  }

  cancel(): void {
    this.sheet()?.close();
  }

  onDaySlider(value: string): void {
    const w = this.wall();
    const dayNum = Number(value);
    // Recompute month/day for the chosen day-of-year, same year/time.
    const date = new Date(Date.UTC(w.year, 0, dayNum));
    this.scrubTo(instantFromWallClock(
      { year: w.year, month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: w.hour, minute: w.minute },
      this.clock.timeZone(),
    ));
  }

  onTimeSlider(value: string): void {
    const w = this.wall();
    const minutes = Number(value);
    this.scrubTo(instantFromWallClock(
      { ...w, hour: Math.floor(minutes / 60), minute: minutes % 60 },
      this.clock.timeZone(),
    ));
  }

  onDateTime(value: string): void {
    const w = inputToWallClock(value);
    if (w) this.scrubTo(instantFromWallClock(w, this.clock.timeZone()));
    else this.draft.set(value);
  }

  // Pick a zone: live-apply per the zone-change mode.
  onTimeZone(tz: string): void {
    if (this.zoneChangeMode() === 'freeze') {
      // Keep the instant (pin "now" if live); relabel the draft into the new zone.
      this.clock.setMock(this.clock.now());
      this.clock.setTimeZone(tz);
    } else {
      // Keep the typed wall-clock; recompute the instant in the new zone.
      this.clock.setMock(instantFromWallClock(this.wall(), tz));
      this.clock.setTimeZone(tz);
    }
    this.seedDraft();
  }

  openTzPicker(): void {
    this.tzPickerOpen.set(true);
  }

  closeTzPicker(): void {
    this.tzPickerOpen.set(false);
  }

  toggleLive(): void {
    if (this.clock.isMocked()) {
      this.clock.clearMock();
      this.clock.clearTimeZone();
    } else {
      this.clock.setMock(this.clock.now());
    }
    this.seedDraft();
  }

  // Re-seed the datetime draft from the clock's instant, in the TM zone.
  private seedDraft(): void {
    this.draft.set(wallClockToInput(wallClockInZone(this.clock.now(), this.clock.timeZone())));
  }

  private scrubTo(instant: Date): void {
    this.clock.setMock(instant);
    this.seedDraft();
  }
}
```

- [ ] **Step 2: Update the template**

In `time-machine.component.html`, (a) replace the inline `@if (tzPickerOpen())` picker block with `<app-zone-picker>`, and (b) add the Move/Freeze control to `.tm-controls`. Replace the whole `@if (tzPickerOpen()) { … } @else { … }` region with:

```html
      @if (tzPickerOpen()) {
        <div class="tm-tzpicker">
          <app-zone-picker
            [options]="zoneOptions"
            [selectedId]="clock.timeZone()"
            (picked)="onTimeZone($event); closeTzPicker()"
          />
          <button type="button" class="tm-tz-back" (click)="closeTzPicker()">Cancel</button>
        </div>
      } @else {
        <div class="tm-controls">
          <div class="tm-field tm-field-datetime">
            <span class="tm-field-label">Date &amp; Time</span>
            <input
              class="tm-datetime"
              type="datetime-local"
              [value]="draft()"
              (input)="onDateTime($any($event.target).value)"
            />
          </div>
          <div class="tm-field tm-field-slider">
            <div class="tm-field-head">
              <span class="tm-field-label">Day</span>
              <span class="tm-field-value">{{ dayLabel() }}</span>
            </div>
            <input
              type="range"
              min="1"
              [max]="maxDayOfYear()"
              [value]="dayOfYear()"
              [style.--fill.%]="dayFillPercent()"
              (input)="onDaySlider($any($event.target).value)"
            />
          </div>
          <div class="tm-field tm-field-slider">
            <div class="tm-field-head">
              <span class="tm-field-label">Time</span>
              <span class="tm-field-value">{{ timeLabel() }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1439"
              [value]="minuteOfDay()"
              [style.--fill.%]="timeFillPercent()"
              (input)="onTimeSlider($any($event.target).value)"
            />
          </div>
          <div class="tm-field tm-field-tz">
            <span class="tm-field-label">Time Zone</span>
            <button type="button" class="tm-tz" (click)="openTzPicker()">{{ activeZoneLabel() }}</button>
          </div>
          <div class="tm-field tm-field-zonemode">
            <span class="tm-field-label">On zone change</span>
            <div class="tm-segment" role="radiogroup" aria-label="On zone change">
              <button
                type="button"
                role="radio"
                class="tm-segment-btn"
                [class.on]="zoneChangeMode() === 'move'"
                [attr.aria-checked]="zoneChangeMode() === 'move'"
                (click)="zoneChangeMode.set('move')"
              >Move moment</button>
              <button
                type="button"
                role="radio"
                class="tm-segment-btn"
                [class.on]="zoneChangeMode() === 'freeze'"
                [attr.aria-checked]="zoneChangeMode() === 'freeze'"
                (click)="zoneChangeMode.set('freeze')"
              >Freeze moment</button>
            </div>
          </div>
        </div>
      }
```

(`clock` must be reachable from the template — change `private readonly clock` to `protected readonly clock` in the class.)

- [ ] **Step 3: Update the SCSS**

In `time-machine.component.scss`: the `.tm-tz-search`/`.tm-tz-list`/`.tm-tz-option`/`.tm-tz-empty` rules now live in the shared picker — **delete** them. Keep `.tm-tzpicker` (the sub-view wrapper) and `.tm-tz-back`. Append a small segmented control (same shape as the fullscreen Bar control):

```scss
.tm-segment {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: t.$secondary-surface;
  border-radius: 9px;
}

.tm-segment-btn {
  flex: 1 1 0;
  border: none;
  background: transparent;
  color: t.$secondary-label;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.4rem 0;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &.on {
    background: t.$tint;
    color: #fff;
  }
}
```

- [ ] **Step 4: Update the spec**

Rewrite `time-machine.component.spec.ts` to cover the new behavior (use the `ClockService` to assert instants). Key cases:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '@core/clock.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('TimeMachineComponent', () => {
  let clock: ClockService;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [TimeMachineComponent] }).compileComponents();
    clock = TestBed.inject(ClockService);
  });

  it('interprets the datetime field in the selected zone (UTC, not local)', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00');
    expect(clock.now().toISOString()).toBe('2026-06-25T12:00:00.000Z'); // 12:00 UTC, not 12:00 local
  });

  it('move mode keeps the typed time and moves the instant on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC
    c.zoneChangeMode.set('move');
    c.onTimeZone('Asia/Seoul');
    // digits stay 12:00, now in Seoul → 03:00 UTC instant
    expect(clock.now().toISOString()).toBe('2026-06-25T03:00:00.000Z');
  });

  it('freeze mode keeps the instant and relabels on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC instant
    const before = clock.now().toISOString();
    c.zoneChangeMode.set('freeze');
    c.onTimeZone('Asia/Seoul');
    expect(clock.now().toISOString()).toBe(before); // instant unchanged
    expect(c.draft()).toBe('2026-06-25T21:00'); // 12:00 UTC = 21:00 Seoul
  });
});
```

- [ ] **Step 5: Verify**

Run: `npm run test:web` → green (incl. the new TM cases). Run: `npm run build:web` → success. Run `npx --prefix apps/web eslint src/app/layout/time-machine` (or `npm --prefix apps/web run lint`) → clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/layout/time-machine
git commit -m "$(printf 'feat(web): zone-aware Time Machine date/time + Move/Freeze; shared picker\n\nInterprets the typed date/time in the selected zone (fixes the "+00:00 shows\nlocal" bug); adds a Move/Freeze zone-change control; consumes ZoneCatalog +\nthe shared ZonePicker.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: Fullscreen face — per-face display zone

**Files:**
- Modify: `fullscreen-preset.ts`, `fullscreen-presets.data.ts` (+ `.spec.ts`), `fullscreen-config-store.service.ts` (+ `.spec.ts`), `fullscreen-face.component.ts` (+ `.spec.ts`), `fullscreen-toggles/fullscreen-toggles.component.{ts,html,scss}` (+ `.spec.ts`)

All paths under `apps/web/src/app/features/faces/fullscreen/`.

- [ ] **Step 1: Model + defaults**

`fullscreen-preset.ts` — add `timeZone` to `FullscreenFields` (after `secondsVisible`):

```ts
export interface FullscreenFields {
  bar: BarStyle;
  secondsVisible: boolean;
  timeZone: string; // '' = follow the global clock zone
  sections: { /* unchanged */ };
  bases: { /* unchanged */ };
  gaps: { /* unchanged */ };
}
```

`fullscreen-presets.data.ts` — in `fields()`, add `timeZone: ''` (next to `secondsVisible: true`).

- [ ] **Step 2: Store — `fullscreen-config-store.service.ts`**

Bump version to 3; add `setTimeZoneAll`; extend `mergeBand`.

```ts
  protected version(): number { return 3; }

  setTimeZoneAll(timeZone: string): void {
    this.patchAll((f) => ({ ...f, timeZone }));
  }
```

In the `mergeBand` override's returned object, add:

```ts
      secondsVisible: persisted.secondsVisible ?? defaults.secondsVisible,
      timeZone: persisted.timeZone ?? defaults.timeZone,
```

- [ ] **Step 3: Face render — `fullscreen-face.component.ts`**

Add `displayZone` and swap the two call sites:

```ts
  readonly displayZone = computed(() => this.activeFields().timeZone || this.clock.timeZone());

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.displayZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.displayZone()));
```

(`activeFields().timeZone` is `''` by default → falls back to `clock.timeZone()`; `''` is never passed to `Intl`.)

- [ ] **Step 4: Settings panel — `fullscreen-toggles.component.ts`**

Add the zone picker sub-view state + options + read/write:

```ts
import { ZoneCatalog, type TimeZoneOption } from '@core/zone-catalog';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';
// add to imports: [..., ZonePickerComponent]

  private readonly catalog = inject(ZoneCatalog);

  readonly zonePickerOpen = signal(false);
  readonly faceZone = computed(() => this.store.sample().timeZone);
  // "Follow Time Machine" synthetic entry prepended; '' never reaches Intl.
  readonly zoneOptions: TimeZoneOption[] = [
    { id: '', label: 'Follow Time Machine', offset: -100000 },
    ...this.catalog.options(),
  ];
  readonly faceZoneLabel = computed(
    () => this.zoneOptions.find((z) => z.id === this.faceZone())?.label ?? this.faceZone(),
  );

  openZonePicker(): void { this.zonePickerOpen.set(true); }
  closeZonePicker(): void { this.zonePickerOpen.set(false); }
  pickZone(id: string): void {
    this.store.setTimeZoneAll(id);
    this.zonePickerOpen.set(false);
  }
```

(Add `signal`, `inject` to the `@angular/core` import if not present.)

- [ ] **Step 5: Settings template — `fullscreen-toggles.component.html`**

Gate the panel behind `@if (!zonePickerOpen())` and add the picker `@else`; add a Time Zone card. Wrap the existing `.knobs-panel` div:

```html
    @if (!zonePickerOpen()) {
    <!-- ── Toggles panel ───────────────────────────────────────────────── -->
    <div class="knobs-panel">
      <!-- … existing Seconds / Weekday / GMT / Bar sections unchanged … -->

      <!-- Time Zone -->
      <div class="knobs-section">
        <div class="knobs-toggle-row">
          <span class="knobs-section-label">Time Zone</span>
          <button type="button" class="knobs-tz" data-knob="time-zone" (click)="openZonePicker()">
            {{ faceZoneLabel() }}
          </button>
        </div>
      </div>
    </div>
    } @else {
      <div class="knobs-zonepicker">
        <app-zone-picker [options]="zoneOptions" [selectedId]="faceZone()" (picked)="pickZone($event)" />
        <button type="button" class="knobs-tz-back" (click)="closeZonePicker()">Cancel</button>
      </div>
    }
```

- [ ] **Step 6: Settings SCSS — `fullscreen-toggles.component.scss`**

Append:

```scss
.knobs-tz {
  background: t.$secondary-surface;
  border: none;
  border-radius: 8px;
  color: t.$tint;
  font-size: 0.82rem;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover { background: t.$secondary-surface-hover; }
}

.knobs-zonepicker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.knobs-tz-back {
  align-self: center;
  background: none;
  border: none;
  color: t.$tint;
  font-size: 0.95rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
```

- [ ] **Step 7: Specs**

- `fullscreen-presets.data.spec.ts` — assert default `timeZone: ''` on every band (alongside the existing `secondsVisible`/`bar.mode` asserts).
- `fullscreen-config-store.service.spec.ts` — `setTimeZoneAll('Asia/Seoul')` broadcasts to every band; extend (or add) a migration test so a persisted band missing `timeZone` gets `''` after load (v2→v3).
- `fullscreen-face.component.spec.ts` — `displayZone` precedence:

```ts
  it('renders in the face zone when set, else follows the clock zone', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    // default '' → follows clock.timeZone()
    expect(fixture.componentInstance.displayZone()).toBe(TestBed.inject(ClockService).timeZone());
    store.setTimeZoneAll('Asia/Seoul');
    fixture.detectChanges();
    expect(fixture.componentInstance.displayZone()).toBe('Asia/Seoul');
  });
```

- `fullscreen-toggles.component.spec.ts` — the Time Zone card opens the picker sub-view; picking a zone calls `setTimeZoneAll` and broadcasts; "Follow Time Machine" (`''`) resets:

```ts
  it('picking a zone broadcasts it to every band; Follow resets to ""', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-knob="time-zone"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.componentInstance.pickZone('Asia/Seoul');
    fixture.detectChanges();
    for (const f of Object.values(store.state().byBand)) expect(f.timeZone).toBe('Asia/Seoul');
    fixture.componentInstance['openZonePicker']();
    fixture.componentInstance.pickZone('');
    for (const f of Object.values(store.state().byBand)) expect(f.timeZone).toBe('');
  });
```

- [ ] **Step 8: Verify + commit**

Run: `npm run test:web` (green) + `npm run build:web` (success) + lint clean.

```bash
git add apps/web/src/app/features/faces/fullscreen
git commit -m "$(printf 'feat(web): per-face display zone on the Fullscreen face (Settings picker)\n\nRenders the clock instant in the face zone (faceZone ?? clock.timeZone),\nstored on FullscreenFields (setTimeZoneAll, v2->v3); Settings Time Zone card\nopens the shared ZonePicker with a Follow Time Machine reset. LIVE/MOCK\nuntouched.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification

- [ ] **Step 1:** `npm run test:web` — full suite green (incl. zone-catalog, zone-time DST, zone-picker, TM move/freeze + zone-aware, fullscreen displayZone + store migration + toggles picker).
- [ ] **Step 2:** `npm run build:web` — clean, no component-style budget errors; `npm --prefix apps/web run lint` — clean.
- [ ] **Step 3: Manual smoke** (`npm run start:web`):
  - Time Machine: set zone to UTC → the date/time field shows/edits UTC wall-clock (the bug is gone). Move mode: change zone → typed time stays, faces shift. Freeze mode: change zone → field relabels, the instant holds.
  - Fullscreen Settings → Time Zone → pick a zone → the face shows that zone live, LIVE chip stays green (not MOCK); change the Time Machine date/time → the face's time moves; "Follow Time Machine" resets.
  - Across a wide (840×400) and portrait ratio; the Settings picker fits the panel.
