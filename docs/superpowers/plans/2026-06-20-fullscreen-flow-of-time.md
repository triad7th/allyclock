# Fullscreen "Flow of Time" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a whisper seconds readout (flanking the big time, opposite AM/PM) and a 3-state Bar mode (Off / Divider / minute Progress) to the Fullscreen face, controlled from the Display panel.

**Architecture:** Reuse the per-band `FullscreenFields` config + `patchAll` broadcast + the Display panel. A small seam is added to the generic `BandConfigStore` so a field-shape migration (`bar.visible` → `bar.mode`, new `secondsVisible`) preserves per-band tuning. Seconds come from `bigTime()`; minute progress is a per-frame face binding (not `varsFor`).

**Tech Stack:** Angular 21 standalone + signals (zoneless), Vitest, SCSS with `@use 'tokens'`.

**Conventions for every task:**
- Run all commands from repo root `/Volumes/AllyDrive/Storage/Repos/allyclock`.
- Gate: `npm run test:web` AND `npm run build:web` both green before committing each task.
- Two-space indent, single quotes, final newline.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Spec: `docs/superpowers/specs/2026-06-20-fullscreen-flow-of-time-design.md`.

---

## Task 1: `BandConfigStore.mergeBand` seam (no behavior change)

**Files:**
- Modify: `apps/web/src/app/core/dimensions/band-config-store.ts`
- Test: `apps/web/src/app/core/dimensions/band-config-store.spec.ts`

Make `migrate()` `protected` and factor its per-band combine into an overridable `protected mergeBand(defaults, persisted)` hook whose default reproduces today's wholesale behavior. Other stores (none today besides Fullscreen) are unaffected.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/app/core/dimensions/band-config-store.spec.ts` (inside the existing `describe`):

```ts
  it('mergeBand override is applied to persisted bands on load (field-level migration)', () => {
    // A subclass that fills a missing field from defaults rather than taking the
    // persisted band wholesale.
    class MergeStore extends BandConfigStore<{ a: number; b?: number }> {
      protected storageKey(): string { return 'test.merge'; }
      protected version(): number { return 2; }
      protected buildDefaults(): Record<string, { a: number; b?: number }> {
        return { x: { a: 1, b: 9 } };
      }
      protected override mergeBand(defaults: { a: number; b?: number }, persisted: { a: number; b?: number }) {
        return { ...defaults, ...persisted };
      }
      constructor() { super(); this.init(); }
    }
    mem['test.merge'] = JSON.stringify({ version: 1, byBand: { x: { a: 5 } } });
    const s = new MergeStore();
    expect(s.config('x')).toEqual({ a: 5, b: 9 }); // persisted a wins, default b filled
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:web`
Expected: FAIL — `mergeBand` is not a member / `migrate` not overridable.

- [ ] **Step 3: Add the seam**

In `apps/web/src/app/core/dimensions/band-config-store.ts`, replace the `migrate` method (lines ~58–70) with:

```ts
  // Combine one band's default with its persisted value. Default: take the
  // persisted band wholesale (band-id-level merge — historical behavior).
  // Override to do field-level migration (fill new fields, translate shapes).
  protected mergeBand(defaults: T, persisted: T): T {
    return persisted ?? defaults;
  }

  // Additive: every default band id is present; a persisted band is combined
  // with its default via mergeBand (so new fields can be filled). Never wipes.
  protected migrate(state: BandConfigState<T>): BandConfigState<T> {
    const defaults = this.buildDefaults();
    const byBand: Record<string, T> = {};
    for (const id of Object.keys(defaults)) {
      byBand[id] = id in state.byBand ? this.mergeBand(defaults[id], state.byBand[id]) : defaults[id];
    }
    // Carry any persisted band ids not in defaults (forward-compat), untouched.
    for (const id of Object.keys(state.byBand)) {
      if (!(id in byBand)) byBand[id] = state.byBand[id];
    }
    const migrated: BandConfigState<T> = { version: this.version(), byBand };
    if (
      state.version !== this.version() ||
      Object.keys(byBand).length !== Object.keys(state.byBand).length ||
      this.version() > state.version
    ) {
      this.persist(migrated);
    }
    return migrated;
  }
```

> Note: the default `mergeBand` returns `persisted ?? defaults`, so for an unchanged store the result equals the old `{ ...buildDefaults(), ...state.byBand }` (persisted wins per id, missing ids filled). Behavior preserved.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test:web`
Expected: PASS — the new test + all existing `BandConfigStore` tests green.

- [ ] **Step 5: Build + commit**

Run: `npm run build:web` (success).

```bash
git add apps/web/src/app/core/dimensions/band-config-store.ts apps/web/src/app/core/dimensions/band-config-store.spec.ts
git commit -m "$(printf 'feat(web): add mergeBand seam to BandConfigStore for field-level migration\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: Bar mode (Off / Divider / Progress) end-to-end

**Files:**
- Modify: `fullscreen-preset.ts`, `fullscreen-presets.data.ts`, `fullscreen-config-store.service.ts`, `fullscreen-face.component.{ts,html,scss}`, `fullscreen-toggles/fullscreen-toggles.component.{ts,html,scss}`
- Test: the four specs (`fullscreen-config-store.service.spec.ts`, `fullscreen-presets.data.spec.ts`, `fullscreen-toggles.component.spec.ts`, `fullscreen-config/fullscreen-config.component.spec.ts`, `fullscreen-face.component.spec.ts`)

This is the cohesive "swap `bar.visible` → `bar.mode`" change: the `BarStyle` type change ripples to every bar consumer, so they move together and the task ends green. (`secondsVisible` field is added here too so the model change is in one place; its rendering/toggle is Task 3.)

All paths below are under `apps/web/src/app/features/faces/fullscreen/`.

- [ ] **Step 1: Model — `fullscreen-preset.ts`**

Replace the `BarStyle` interface and add `secondsVisible` to `FullscreenFields`:

```ts
export type BarMode = 'off' | 'divider' | 'progress';

export interface BarStyle {
  mode: BarMode;     // 'off' subsumes the former visible:false
  sizeScale: number; // unchanged
  opacity: number;   // unchanged — drives divider line alpha
}
```

In `FullscreenFields`, add the field (after `bar`):

```ts
export interface FullscreenFields {
  bar: BarStyle;
  secondsVisible: boolean;
  sections: { /* unchanged */ };
  bases: { /* unchanged */ };
  gaps: { /* unchanged */ };
}
```

- [ ] **Step 2: Defaults — `fullscreen-presets.data.ts`**

In `fields()`, change the `bar` default and add `secondsVisible`:

```ts
  return {
    bar: { mode: 'progress', sizeScale: 1, opacity: 0.34 },
    secondsVisible: true,
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
```

- [ ] **Step 3: Store — `fullscreen-config-store.service.ts`**

Import `BarMode`; bump version to 2; replace `setBarVisibleAll` with `setBarModeAll`; add `setSecondsVisibleAll`; override `mergeBand` for the field migration.

Change the import line:

```ts
import { type FullscreenFields, type SectionKey, type BarMode } from './fullscreen-preset';
```

Change `version()`:

```ts
  protected version(): number { return 2; }
```

Replace `setBarVisibleAll(...)` with:

```ts
  setBarModeAll(mode: BarMode): void {
    this.patchAll((f) => ({ ...f, bar: { ...f.bar, mode } }));
  }

  setSecondsVisibleAll(visible: boolean): void {
    this.patchAll((f) => ({ ...f, secondsVisible: visible }));
  }
```

Add the migration override (translates legacy `bar.visible`, fills new fields from defaults):

```ts
  // Field-level migration: fill new fields (secondsVisible, bar.mode) from the
  // band's default while keeping persisted tuning; translate a legacy
  // bar.visible boolean into the new bar.mode.
  protected override mergeBand(defaults: FullscreenFields, persisted: FullscreenFields): FullscreenFields {
    const legacy = persisted.bar as Partial<FullscreenFields['bar']> & { visible?: boolean };
    const mode: BarMode =
      legacy.mode ?? (legacy.visible === false ? 'off' : legacy.visible === true ? 'divider' : defaults.bar.mode);
    return {
      ...defaults,
      ...persisted,
      bar: { mode, sizeScale: legacy.sizeScale ?? defaults.bar.sizeScale, opacity: legacy.opacity ?? defaults.bar.opacity },
      secondsVisible: persisted.secondsVisible ?? defaults.secondsVisible,
    };
  }
```

- [ ] **Step 4: Face render — `fullscreen-face.component.ts`**

Add a per-frame `minuteProgress` computed (do NOT route it through `varsFor`):

```ts
  // Fraction of the current minute elapsed, ~30fps from clock.now(); drives the
  // bar's progress fill. Seconds/ms are timezone-invariant, so local getters are
  // correct regardless of the active zone.
  readonly minuteProgress = computed(() => {
    const d = this.clock.now();
    return (d.getSeconds() + d.getMilliseconds() / 1000) / 60;
  });
```

- [ ] **Step 5: Face template — `fullscreen-face.component.html`**

Replace the bar line (`@if (activeFields().bar.visible) { <div class="bar divider"></div> }`) with a `@switch`:

```html
  @switch (activeFields().bar.mode) {
    @case ('divider') { <div class="bar divider"></div> }
    @case ('progress') {
      <div class="bar progress" [style.--minute-progress]="minuteProgress()">
        <span class="fill"></span>
      </div>
    }
  }
```

(`off` has no `@case`, so nothing renders — matching the old `visible:false`.)

- [ ] **Step 6: Face SCSS — `fullscreen-face.component.scss`**

Move the bar `opacity` off the base rule (so progress isn't dimmed) and add the progress track + fill. Replace the `.bar` / `.bar.divider` rules with:

```scss
.bar {
  // Length proportional to the time font size, using LAP's time:bar ratio.
  width: calc(var(--time-base) * var(--time-scale, 1) * 56 / 68);
  height: 1.5px;
  margin-bottom: var(--gap-bar-date, 0.5rem);
}
.bar.divider {
  background: currentColor;
  opacity: var(--bar-opacity, 0.34);
}
.bar.progress {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.bar.progress .fill {
  position: absolute;
  inset: 0;
  transform-origin: left;
  transform: scaleX(var(--minute-progress, 0));
  background: currentColor;
  opacity: 0.85;
}
```

- [ ] **Step 7: Display panel — `fullscreen-toggles.component.ts`**

Import `BarMode`; replace `showBar`/`toggleBar` with `barMode`/`setBarMode` + a `barModes` list:

```ts
import { type BarMode } from '../fullscreen-preset';
```

```ts
  readonly barMode = computed(() => this.store.sample().bar.mode);
  readonly barModes: ReadonlyArray<{ mode: BarMode; label: string }> = [
    { mode: 'off', label: 'Off' },
    { mode: 'divider', label: 'Divider' },
    { mode: 'progress', label: 'Progress' },
  ];

  setBarMode(mode: BarMode): void {
    this.store.setBarModeAll(mode);
  }
```

(Remove the old `showBar` computed and `toggleBar` method.)

- [ ] **Step 8: Display panel template — `fullscreen-toggles.component.html`**

Replace the entire `<!-- Bar -->` `.knobs-section` with the segmented control:

```html
      <!-- Bar -->
      <div class="knobs-section">
        <div class="knobs-segment-row">
          <span class="knobs-section-label">Bar</span>
          <div class="knobs-segment" role="radiogroup" data-knob="bar-mode" aria-label="Bar mode">
            @for (m of barModes; track m.mode) {
              <button
                type="button"
                role="radio"
                class="knobs-segment-btn"
                [class.on]="barMode() === m.mode"
                [attr.data-mode]="m.mode"
                [attr.aria-checked]="barMode() === m.mode"
                (click)="setBarMode(m.mode)"
              >{{ m.label }}</button>
            }
          </div>
        </div>
      </div>
```

- [ ] **Step 9: Display panel SCSS — `fullscreen-toggles.component.scss`**

Append the segmented-control styles:

```scss
// ── Segmented control (Bar mode) ───────────────────────────────────────────

.knobs-segment-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.knobs-segment {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: t.$secondary-surface;
  border-radius: 9px;
}

.knobs-segment-btn {
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

- [ ] **Step 10: Update the four affected specs**

`fullscreen-presets.data.spec.ts` — change the bar assertion (currently `bar.visible === true`) to:

```ts
      expect(fields.bar.mode).toBe('progress');
      expect(fields.secondsVisible).toBe(true);
```

`fullscreen-config-store.service.spec.ts` — replace the `setBarVisibleAll` test (compile break) with mode + migration tests:

```ts
  it('setBarModeAll writes the mode to every band', () => {
    store.setBarModeAll('off');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.mode).toBe('off');
    }
  });

  it('setSecondsVisibleAll writes seconds visibility to every band', () => {
    store.setSecondsVisibleAll(false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.secondsVisible).toBe(false);
    }
  });

  it('migrates a legacy v1 band (bar.visible, no secondsVisible), preserving tuning', () => {
    const legacy = {
      version: 1,
      byBand: {
        mini: {
          bar: { visible: true, sizeScale: 1, opacity: 0.5 },
          sections: { time: { visible: true, sizeScale: 1.4, weight: 200, opacity: 1 },
            weekday: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            month: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            day: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            gmt: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 } },
          bases: { time: { cqw: 120, cqh: 68 }, date: { cqw: 8, cqh: 5 }, bar: { cqw: 120, cqh: 56 } },
          gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
        },
      },
    };
    mem['allyclock.fullscreen.config'] = JSON.stringify(legacy);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(FullscreenConfigStore);
    const mini = fresh.config('mini');
    expect(mini.bar.mode).toBe('divider');           // visible:true → divider
    expect((mini.bar as { visible?: boolean }).visible).toBeUndefined(); // legacy key dropped
    expect(mini.bar.opacity).toBe(0.5);              // tuning preserved
    expect(mini.sections.time.sizeScale).toBe(1.4);  // tuning preserved
    expect(mini.secondsVisible).toBe(true);          // new field filled
  });
```

(Keep the existing seconds/section/`fieldsFor`/`sample` tests; only the `setBarVisibleAll` one is removed.)

`fullscreen-toggles.component.spec.ts` — replace the "toggling Bar" test with segment tests:

```ts
  it('renders the Bar segmented control with the active mode marked', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const on = fixture.nativeElement.querySelector('[data-knob="bar-mode"] [aria-checked="true"]') as HTMLElement;
    expect(on.getAttribute('data-mode')).toBe('progress'); // default
  });

  it('clicking a Bar segment broadcasts the mode to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-mode="off"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.mode).toBe('off');
    }
  });
```

`fullscreen-config/fullscreen-config.component.spec.ts` — the "toggles absent from the Adjust panel" guard currently asserts `[data-knob="bar-visible"]` is null; change that selector to `[data-knob="bar-mode"]`:

```ts
    expect(fixture.nativeElement.querySelector('[data-knob="bar-mode"]')).toBeNull();
```

`fullscreen-face.component.spec.ts` — add bar-mode + minute-progress coverage (inject `FullscreenConfigStore` and `ClockService` if not already imported):

```ts
  it('renders the bar per mode (divider / progress / nothing)', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });

    store.setBarModeAll('divider');
    fixture.detectChanges();
    expect(host.querySelector('.bar.divider')).toBeTruthy();
    expect(host.querySelector('.bar.progress')).toBeNull();

    store.setBarModeAll('progress');
    fixture.detectChanges();
    expect(host.querySelector('.bar.progress')).toBeTruthy();
    expect(host.querySelector('.bar.divider')).toBeNull();

    store.setBarModeAll('off');
    fixture.detectChanges();
    expect(host.querySelector('.bar')).toBeNull();
  });

  it('minuteProgress reflects the (mocked) instant within the minute', () => {
    // 22:50:30.000 → 30/60 = 0.5
    TestBed.inject(ClockService).setMock(new Date('2026-06-20T22:50:30.000-07:00'));
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.minuteProgress()).toBeCloseTo(0.5, 2);
  });
```

- [ ] **Step 11: Run tests + build**

Run: `npm run test:web` → full suite green.
Run: `npm run build:web` → success, no style-budget errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/app/features/faces/fullscreen apps/web/src/app/core/dimensions
git commit -m "$(printf 'feat(web): bar becomes a 3-state mode (off/divider/minute progress)\n\nReplaces bar.visible with bar.mode; progress fills across the minute via a\nper-frame --minute-progress binding. Display panel Bar control becomes a\n3-segment selector. Field-level migration maps legacy bar.visible.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: Whisper seconds

**Files:**
- Modify: `clock-formatter.ts`, `fullscreen-face.component.{html,scss}`, `fullscreen-toggles.component.{ts,html}`
- Test: `clock-formatter.spec.ts`, `fullscreen-face.component.spec.ts`, `fullscreen-toggles.component.spec.ts`

`secondsVisible` already exists on the model (Task 2). This task renders the seconds and adds the toggle.

All paths under `apps/web/src/app/features/faces/fullscreen/`.

- [ ] **Step 1: Formatter test (TDD)**

In `clock-formatter.spec.ts`, add (using a fixed `Date`):

```ts
  it('bigTime includes zero-padded seconds', () => {
    const d = new Date('2026-06-20T22:50:07-07:00');
    expect(bigTime(d, 'en-US', 'America/Los_Angeles').seconds).toBe('07');
  });
```

Run `npm run test:web` → FAIL (`seconds` undefined).

- [ ] **Step 2: Formatter — `clock-formatter.ts`**

Extend `BigTime` and `bigTime()`: add `second: '2-digit'` to the existing `Intl.DateTimeFormat` options, and extract the second part.

```ts
export interface BigTime {
  digits: string;
  ampm: string | null;
  seconds: string;
}

export function bigTime(date: Date, locale: string, timeZone: string): BigTime {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).formatToParts(date);

  const digits = parts
    .filter((part) => part.type === 'hour' || part.type === 'minute')
    .map((part) => part.value)
    .join(':');
  const ampm = parts.find((part) => part.type === 'dayPeriod')?.value ?? null;
  const seconds = parts.find((part) => part.type === 'second')?.value ?? '00';

  return { digits, ampm, seconds };
}
```

(The `digits` filter already excludes `'second'`, so the big readout is unchanged.)

Run `npm run test:web` → the formatter test passes.

- [ ] **Step 3: Face template — `fullscreen-face.component.html`**

Replace the `.time` block:

```html
  <div class="time">
    <span class="digits">{{ big().digits }}</span>
    <span class="flank">
      @if (big().ampm; as ampm) { <span class="ampm">{{ ampm }}</span> }
      @if (activeFields().secondsVisible) { <span class="seconds">{{ big().seconds }}</span> }
    </span>
  </div>
```

- [ ] **Step 4: Face SCSS — `fullscreen-face.component.scss`**

The `.time` keeps `align-items: flex-start`. Add the flank (full height of the digits) and move/keep the AM/PM nudge; seconds bottom-anchored via `margin-top: auto`. Replace the existing `.ampm` rule and add `.flank` / `.seconds`:

```scss
.flank {
  align-self: stretch;          // take the digits' full height
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.ampm {
  font-size: 0.15em;
  font-weight: 300;
  letter-spacing: 0.18em;
  opacity: 0.85;
  margin-top: 0.55em;           // load-bearing optical nudge (keep)
}
.seconds {
  margin-top: auto;             // bottom-anchor, with or without AM/PM
  font-size: 0.10em;
  font-weight: 300;
  letter-spacing: 0.05em;
  opacity: 0.28;                // whisper
}
```

(Remove the old `.ampm { align-self: flex-start; … }` — its positioning now lives in `.flank`.)

- [ ] **Step 5: Display panel — Seconds toggle**

`fullscreen-toggles.component.ts` — add:

```ts
  readonly showSeconds = computed(() => this.store.sample().secondsVisible);

  toggleSeconds(): void {
    this.store.setSecondsVisibleAll(!this.showSeconds());
  }
```

`fullscreen-toggles.component.html` — add a Seconds section (copy the Weekday switch pattern), placed first:

```html
      <!-- Seconds -->
      <div class="knobs-section">
        <div class="knobs-toggle-row">
          <span class="knobs-section-label">Seconds</span>
          <button
            type="button"
            class="knobs-toggle"
            [class.on]="showSeconds()"
            data-knob="seconds-visible"
            (click)="toggleSeconds()"
            [attr.aria-label]="showSeconds() ? 'Hide Seconds' : 'Show Seconds'"
          >
            <span class="knobs-toggle-thumb"></span>
          </button>
        </div>
      </div>
```

- [ ] **Step 6: Face + toggles specs**

`fullscreen-face.component.spec.ts` — add:

```ts
  it('renders the whisper seconds by default and hides them when toggled off', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time .seconds')).toBeTruthy();

    TestBed.inject(FullscreenConfigStore).setSecondsVisibleAll(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time .seconds')).toBeNull();
  });
```

(Import `FullscreenConfigStore` in the spec if not already present.)

`fullscreen-toggles.component.spec.ts` — add:

```ts
  it('toggling Seconds broadcasts visibility to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().secondsVisible;
    (fixture.nativeElement.querySelector('[data-knob="seconds-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.secondsVisible).toBe(!before);
    }
  });
```

- [ ] **Step 7: Run tests + build**

Run: `npm run test:web` → green.
Run: `npm run build:web` → success.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/features/faces/fullscreen
git commit -m "$(printf 'feat(web): whisper seconds flanking the fullscreen time (Display toggle)\n\nSmall faint seconds pinned bottom-right opposite AM/PM, from bigTime().\nToggle in the Display panel, default on.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification

- [ ] **Step 1:** `npm run test:web` — full suite green (incl. new formatter, store-migration, toggles, face specs).
- [ ] **Step 2:** `npm run build:web` — clean, no component-style budget errors.
- [ ] **Step 3: Manual smoke** (`npm run start:web`): on the Fullscreen face confirm —
  - whisper seconds tick bottom-right; AM/PM unchanged top-right; in a 24h locale the seconds still sit at the bottom.
  - Bar segmented control switches Off / Divider / Progress; Progress fills smoothly across the minute and resets on the turn.
  - Scrub the Time Machine: seconds + progress fill reflect and freeze at the mocked instant.
  - Looks correct at a wide (840×400) and a portrait ratio, and inside the face-picker preview (no half-content).
