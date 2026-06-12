# AllyClock Web Face Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the web app into a single-page app with two selectable clock faces (a fullscreen iOS-port face and the existing world-cards face), a self-hiding Configure button, a bottom-sheet face picker, and localStorage persistence.

**Architecture:** A face registry (`FaceDescriptor[]`) drives rendering (`NgComponentOutlet`), the picker sheet, and persistence. A single `ClockService` signal ticks for all faces. `moment-timezone` is replaced with native `Intl.DateTimeFormat`.

**Tech Stack:** Angular 21 standalone components, signals, zoneless change detection, Vitest (`@angular/build:unit-test`), SCSS, Bootstrap 5 (world-cards face only).

**Spec:** `docs/superpowers/specs/2026-06-11-web-face-refactor-design.md`

---

## Context for a zero-context engineer

- Run everything from the repo root: `/Volumes/AllyDrive/Storage/Repos/allyclock`.
- `npm run test:web` runs the Vitest suite once. `npm run build:web` builds. Both delegate to `apps/web`.
- The app is **zoneless** (`provideZonelessChangeDetection`): state must be signals; in tests call `fixture.detectChanges()` after changing state.
- Tests use Vitest globals imported explicitly (`import { describe, it, expect } from 'vitest'`) plus Angular `TestBed`. Follow the existing spec style.
- TypeScript style: two-space indent, single quotes, final newlines, no `any`.
- Time-related tests use fixed `Date` values and explicit timezone strings so they're deterministic anywhere.
- `Intl.DateTimeFormat(... timeZoneName: 'longOffset')` produces parts like `{type:'timeZoneName', value:'GMT-07:00'}` (plain ASCII hyphen); for UTC it yields exactly `GMT`. These exact behaviors were verified on this machine's Node and hold in evergreen browsers/jsdom.

## File structure (end state)

```text
apps/web/src/app/
├── app.component.ts/.html/.scss/.spec.ts   # Shell (rewritten)
├── app.config.ts                            # provideRouter removed
├── faces/
│   ├── face-registry.ts
│   ├── fullscreen/
│   │   ├── clock-formatter.ts/.spec.ts
│   │   └── fullscreen-face.component.ts/.html/.scss/.spec.ts
│   └── world-cards/
│       ├── world-cards-face.component.ts/.html/.scss/.spec.ts
│       └── card/card.component.ts/.html/.scss/.spec.ts   # moved from app/card
├── controls/
│   ├── configure-button/configure-button.component.ts/.html/.scss/.spec.ts
│   └── face-picker-sheet/face-picker-sheet.component.ts/.html/.scss/.spec.ts
└── services/
    ├── clock.service.ts/.spec.ts
    ├── face-preference.service.ts/.spec.ts
    └── location.service.ts/.spec.ts         # moment → Intl
```

Deleted: `app.routes.ts`. Removed dependency: `moment-timezone`.

**Layout contract:** every face component fills its container (`:host { width: 100%; height: 100% }`), never the viewport directly. The shell hosts the active face in a `position: fixed; inset: 0` container; the picker sheet hosts scaled-down live previews in small fixed-size containers. This is why faces must not use `100vh`.

---

### Task 1: ClockService — one shared ticking `now` signal

**Files:**
- Create: `apps/web/src/app/services/clock.service.ts`
- Test: `apps/web/src/app/services/clock.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClockService } from './clock.service';

describe('ClockService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the current time', () => {
    const service = TestBed.inject(ClockService);
    expect(service.now().toISOString()).toBe('2026-06-11T12:00:00.000Z');
  });

  it('ticks forward as time advances', () => {
    const service = TestBed.inject(ClockService);
    const start = service.now().getTime();
    vi.advanceTimersByTime(100);
    expect(service.now().getTime()).toBeGreaterThan(start);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./clock.service`.

- [ ] **Step 3: Write the implementation**

```ts
import { Injectable, OnDestroy, signal } from '@angular/core';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval

@Injectable({
  providedIn: 'root',
})
export class ClockService implements OnDestroy {
  readonly now = signal(new Date());

  private readonly intervalId = setInterval(() => this.now.set(new Date()), TICK_MS);

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/services/clock.service.ts apps/web/src/app/services/clock.service.spec.ts
git commit -m "feat(web): add shared ClockService tick signal"
```

---

### Task 2: clock-formatter — pure Intl-based formatting functions

Port of iOS `ClockFormatter` (`apps/ios/AllyClock/Time/ClockFormatter.swift`) semantics: big digits with optional AM/PM, precise `HH:mm:ss.hundredths`, long date + GMT offset with a real minus sign (U+2212).

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/clock-formatter.ts`
- Test: `apps/web/src/app/faces/fullscreen/clock-formatter.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { bigTime, dateTZ, gmtOffset, precise } from './clock-formatter';

// 2026-06-11T03:09:05.270Z = 8:09:05 PM June 10 in Los Angeles (PDT), 12:09 PM in Seoul.
const date = new Date('2026-06-11T03:09:05.270Z');

describe('bigTime', () => {
  it('formats 12-hour locales with an AM/PM marker', () => {
    expect(bigTime(date, 'en-US', 'America/Los_Angeles')).toEqual({
      digits: '8:09',
      ampm: 'PM',
    });
  });

  it('formats 24-hour locales without a marker', () => {
    expect(bigTime(date, 'en-GB', 'UTC')).toEqual({ digits: '3:09', ampm: null });
  });

  it('uses localized day-period symbols', () => {
    expect(bigTime(date, 'ko-KR', 'Asia/Seoul')).toEqual({
      digits: '12:09',
      ampm: '오후',
    });
  });
});

describe('precise', () => {
  it('formats 24h time with hundredths', () => {
    expect(precise(date, 'UTC')).toBe('03:09:05.27');
  });

  it('zero-pads hundredths', () => {
    expect(precise(new Date('2026-06-11T03:09:05.051Z'), 'UTC')).toBe('03:09:05.05');
  });
});

describe('gmtOffset', () => {
  it('renders negative offsets with a minus sign (U+2212)', () => {
    expect(gmtOffset(date, 'America/Los_Angeles')).toBe('GMT−07:00');
  });

  it('renders UTC as +00:00', () => {
    expect(gmtOffset(date, 'UTC')).toBe('GMT+00:00');
  });

  it('renders positive offsets', () => {
    expect(gmtOffset(date, 'Asia/Seoul')).toBe('GMT+09:00');
  });
});

describe('dateTZ', () => {
  it('joins the long date and offset with a middle dot', () => {
    expect(dateTZ(date, 'en-US', 'America/Los_Angeles')).toBe('June 10, 2026 · GMT−07:00');
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./clock-formatter`.

- [ ] **Step 3: Write the implementation**

```ts
export interface BigTime {
  digits: string;
  ampm: string | null;
}

export function bigTime(date: Date, locale: string, timeZone: string): BigTime {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).formatToParts(date);

  const digits = parts
    .filter((part) => part.type === 'hour' || part.type === 'minute')
    .map((part) => part.value)
    .join(':');
  const ampm = parts.find((part) => part.type === 'dayPeriod')?.value ?? null;

  return { digits, ampm };
}

export function precise(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';
  const hundredths = Math.min(99, Math.round(date.getMilliseconds() / 10));
  return `${get('hour')}:${get('minute')}:${get('second')}.${String(hundredths).padStart(2, '0')}`;
}

export function dateTZ(date: Date, locale: string, timeZone: string): string {
  const datePart = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone }).format(date);
  return `${datePart} · ${gmtOffset(date, timeZone)}`;
}

export function gmtOffset(date: Date, timeZone: string): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const normalized = name === 'GMT' ? 'GMT+00:00' : name;
  return normalized.replace('-', '−');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen/clock-formatter.ts apps/web/src/app/faces/fullscreen/clock-formatter.spec.ts
git commit -m "feat(web): add Intl-based clock formatter (iOS ClockFormatter port)"
```

---

### Task 3: LocationService — migrate moment-timezone to Intl

`getTimeZone` currently returns moment's `format('Z')`, e.g. `+09:00`, consumed by `DatePipe`'s timezone parameter. Preserve that exact output shape. Also fixes the old `default` branch that returned the invalid value `'PT'` — unknown ids now behave like `US`, matching `getFlag`'s fallback.

**Files:**
- Modify: `apps/web/src/app/services/location.service.ts`
- Test: `apps/web/src/app/services/location.service.spec.ts`

- [ ] **Step 1: Replace the spec with behavior-pinning tests**

Overwrite `location.service.spec.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

const summer = new Date('2026-06-11T12:00:00.000Z'); // PDT in Los Angeles
const winter = new Date('2026-01-15T12:00:00.000Z'); // PST in Los Angeles

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns the US offset with DST applied', () => {
    expect(service.getTimeZone('US', summer)).toBe('-07:00');
    expect(service.getTimeZone('US', winter)).toBe('-08:00');
  });

  it('returns UTC for UK', () => {
    expect(service.getTimeZone('UK', summer)).toBe('+00:00');
  });

  it('returns the Korea offset', () => {
    expect(service.getTimeZone('KR', summer)).toBe('+09:00');
  });

  it('falls back to the US offset for unknown ids', () => {
    expect(service.getTimeZone('XX', summer)).toBe('-07:00');
  });

  it('maps regions to flag URLs', () => {
    expect(service.getFlag('KR')).toContain('SOUTH_KOREA');
    expect(service.getFlag('UK')).toContain('GREAT_BRITAIN');
    expect(service.getFlag('US')).toContain('USA');
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — `getTimeZone('XX', ...)` returns `'PT'`, not `'-07:00'`. (The other offset tests pass against moment; that's fine — they pin behavior for the migration.)

- [ ] **Step 3: Rewrite the service without moment**

Overwrite `location.service.ts` with:

```ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  public getFlag(id: string): string {
    switch (id) {
      case 'US':
      case 'LA':
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/USA-128.png';
      case 'UK':
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/GREAT_BRITAIN-128.png';
      case 'KR':
        return 'https://cdn1.iconfinder.com/data/icons/rounded-square-national-flags/512/SOUTH_KOREA-128.png';
      default:
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/USA-128.png';
    }
  }

  public getTimeZone(id: string, targetDate: Date): string {
    switch (id) {
      case 'UK':
        return offsetOf('UTC', targetDate);
      case 'KR':
        return offsetOf('Asia/Seoul', targetDate);
      case 'US':
      case 'LA':
      default:
        return offsetOf('America/Los_Angeles', targetDate);
    }
  }
}

function offsetOf(timeZone: string, date: Date): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = name.match(/([+-]\d{2}:\d{2})$/);
  return match ? match[1] : '+00:00';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/services/location.service.ts apps/web/src/app/services/location.service.spec.ts
git commit -m "refactor(web): replace moment-timezone with Intl in LocationService"
```

---

### Task 4: FullscreenFaceComponent — the iOS-port face

**Files:**
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.ts`
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.html`
- Create: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.scss`
- Test: `apps/web/src/app/faces/fullscreen/fullscreen-face.component.spec.ts`

- [ ] **Step 1: Write the failing test**

The component uses the browser's real locale/timezone, so assert shapes, not exact strings (the formatter's exact outputs are covered in Task 2).

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenFaceComponent } from './fullscreen-face.component';

describe('FullscreenFaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenFaceComponent],
    }).compileComponents();
  });

  it('renders the big time, precise line, and date line', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.digits')?.textContent).toMatch(/\d{1,2}:\d{2}/);
    expect(el.querySelector('.precise')?.textContent).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{2}$/);
    expect(el.querySelector('.date-tz')?.textContent).toContain('GMT');
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./fullscreen-face.component`.

- [ ] **Step 3: Write the component**

`fullscreen-face.component.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { bigTime, dateTZ, precise } from './clock-formatter';

@Component({
  selector: 'app-fullscreen-face',
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
})
export class FullscreenFaceComponent {
  private readonly clock = inject(ClockService);
  private readonly locale = navigator.language || 'en-US';
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.timeZone));
  readonly preciseText = computed(() => precise(this.clock.now(), this.timeZone));
  readonly dateTZText = computed(() => dateTZ(this.clock.now(), this.locale, this.timeZone));
}
```

`fullscreen-face.component.html`:

```html
<div class="clock">
  <div class="big-time">
    <span class="digits">{{ big().digits }}</span>
    @if (big().ampm; as ampm) {
      <span class="ampm">{{ ampm }}</span>
    }
  </div>
  <div class="info-line">
    <span class="precise">{{ preciseText() }}</span>
    <span class="dot">·</span>
    <span class="date-tz">{{ dateTZText() }}</span>
  </div>
</div>
```

`fullscreen-face.component.scss` (fills its container per the layout contract; sizing via clamp instead of iOS size buckets; `cqw`/container units are avoided to keep previews simple — `vw` scales acceptably since previews are uniformly transform-scaled):

```scss
:host {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
}

.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.25rem, 2vh, 1rem);
}

.big-time {
  display: flex;
  align-items: flex-start;
  gap: 0.15em;
  font-size: clamp(4rem, 22vw, 18rem);
  font-weight: 600;
  line-height: 1;
}

.digits {
  font-variant-numeric: tabular-nums;
}

.ampm {
  font-size: 0.22em;
  font-weight: 400;
  letter-spacing: 0.08em;
  margin-top: 0.18em;
}

.info-line {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  font-size: clamp(0.8rem, 2.4vw, 1.8rem);
  color: rgba(255, 255, 255, 0.55);
}

.precise {
  font-family: ui-monospace, 'SF Mono', Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.dot {
  opacity: 0.4;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/faces/fullscreen
git commit -m "feat(web): add fullscreen clock face (iOS port)"
```

---

### Task 5: World Cards face — move the card grid under faces/

**Files:**
- Move: `apps/web/src/app/card/` → `apps/web/src/app/faces/world-cards/card/`
- Modify: `apps/web/src/app/faces/world-cards/card/card.component.ts` (shared clock)
- Modify: `apps/web/src/app/faces/world-cards/card/card.component.spec.ts`
- Create: `apps/web/src/app/faces/world-cards/world-cards-face.component.ts`
- Create: `apps/web/src/app/faces/world-cards/world-cards-face.component.html`
- Create: `apps/web/src/app/faces/world-cards/world-cards-face.component.scss`
- Test: `apps/web/src/app/faces/world-cards/world-cards-face.component.spec.ts`

Note: `app.component.html` still references `app-card` until Task 9 rewrites the shell; the build stays green because `app.component.ts` is updated to import from the new path in this task.

- [ ] **Step 1: Move the card directory**

```bash
mkdir -p apps/web/src/app/faces/world-cards
git mv apps/web/src/app/card apps/web/src/app/faces/world-cards/card
```

Then update the import in `apps/web/src/app/app.component.ts`:

```ts
import { CardComponent } from './faces/world-cards/card/card.component';
```

- [ ] **Step 2: Write the failing world-cards-face test**

`world-cards-face.component.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsFaceComponent } from './world-cards-face.component';

describe('WorldCardsFaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldCardsFaceComponent],
    }).compileComponents();
  });

  it('renders the US, UK, and KR cards', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-card');
    expect(cards).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./world-cards-face.component`.

- [ ] **Step 4: Write the face component**

`world-cards-face.component.ts`:

```ts
import { Component } from '@angular/core';
import { CardComponent } from './card/card.component';

@Component({
  selector: 'app-world-cards-face',
  imports: [CardComponent],
  templateUrl: './world-cards-face.component.html',
  styleUrl: './world-cards-face.component.scss',
})
export class WorldCardsFaceComponent {}
```

`world-cards-face.component.html` (the current `app.component.html` content):

```html
<div class="container-fluid">
  <app-card state="US"></app-card>
  <div class="row">
    <div class="col-sm">
      <app-card state="UK"></app-card>
    </div>
    <div class="col-sm">
      <app-card state="KR"></app-card>
    </div>
  </div>
</div>
```

`world-cards-face.component.scss`:

```scss
:host {
  display: block;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #000;
}
```

- [ ] **Step 5: Switch the card to the shared clock**

Overwrite `card/card.component.ts`:

```ts
import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocationService } from '../../../services/location.service';
import { ClockService } from '../../../services/clock.service';

@Component({
  selector: 'app-card',
  imports: [DatePipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  private readonly location = inject(LocationService);
  private readonly clock = inject(ClockService);

  readonly state = input<string>('UK');
  readonly now = this.clock.now;
  readonly timeZone = computed(() => this.location.getTimeZone(this.state(), this.now()));
  readonly flag = computed(() => this.location.getFlag(this.state()));
}
```

Overwrite `card/card.component.spec.ts` (the old spec mutated the component's own interval signal; the card now reads the shared service):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the shared clock as a Date signal', () => {
    expect(component.now()).toBeInstanceOf(Date);
  });

  it('derives a DatePipe-compatible timezone offset', () => {
    expect(component.timeZone()).toMatch(/^[+-]\d{2}:\d{2}$/);
  });

  it('renders the flag for the configured region', () => {
    fixture.componentRef.setInput('state', 'KR');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('SOUTH_KOREA');
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/src/app
git commit -m "refactor(web): move card grid into world-cards face with shared clock"
```

---

### Task 6: Face registry + FacePreferenceService

**Files:**
- Create: `apps/web/src/app/faces/face-registry.ts`
- Create: `apps/web/src/app/services/face-preference.service.ts`
- Test: `apps/web/src/app/services/face-preference.service.spec.ts`

- [ ] **Step 1: Write the registry** (no test of its own — it's static data exercised by every consumer's tests)

`face-registry.ts`:

```ts
import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  { id: 'fullscreen', displayName: 'Fullscreen', component: FullscreenFaceComponent },
  { id: 'world-cards', displayName: 'World Cards', component: WorldCardsFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
```

- [ ] **Step 2: Write the failing preference-service tests**

`face-preference.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FacePreferenceService } from './face-preference.service';
import { DEFAULT_FACE_ID } from '../faces/face-registry';

describe('FacePreferenceService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to the fullscreen face', () => {
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe(DEFAULT_FACE_ID);
  });

  it('persists the selected face', () => {
    const service = TestBed.inject(FacePreferenceService);
    service.setFace('world-cards');
    expect(service.activeFaceId()).toBe('world-cards');
    expect(localStorage.getItem('allyclock.face')).toBe('world-cards');
  });

  it('restores a stored face id', () => {
    localStorage.setItem('allyclock.face', 'world-cards');
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe('world-cards');
  });

  it('falls back to the default for unknown stored ids', () => {
    localStorage.setItem('allyclock.face', 'flip-clock');
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe(DEFAULT_FACE_ID);
  });

  it('keeps the selection in memory when localStorage throws', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      const service = TestBed.inject(FacePreferenceService);
      service.setFace('world-cards');
      expect(service.activeFaceId()).toBe('world-cards');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./face-preference.service`.

- [ ] **Step 4: Write the service**

`face-preference.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';
import { DEFAULT_FACE_ID, FACES } from '../faces/face-registry';

const STORAGE_KEY = 'allyclock.face';

@Injectable({
  providedIn: 'root',
})
export class FacePreferenceService {
  private readonly faceId = signal(restoreFaceId());
  readonly activeFaceId = this.faceId.asReadonly();

  setFace(id: string): void {
    this.faceId.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (e.g. private browsing): keep the in-memory value
    }
  }
}

function restoreFaceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && FACES.some((face) => face.id === stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable: fall through to the default
  }
  return DEFAULT_FACE_ID;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/faces/face-registry.ts apps/web/src/app/services/face-preference.service.ts apps/web/src/app/services/face-preference.service.spec.ts
git commit -m "feat(web): add face registry and persisted face preference"
```

---

### Task 7: ConfigureButtonComponent — auto-hiding bottom-center button

Video-player behavior: visible on load, hides after 4s, any pointer move / pointer down / keypress reveals it and re-arms the timer. Never hides while `pinned` (the shell pins it while the sheet is open). Hidden means `opacity: 0` + `pointer-events: none` (the DOM node stays, so reveal can transition smoothly).

**Files:**
- Create: `apps/web/src/app/controls/configure-button/configure-button.component.ts`
- Create: `apps/web/src/app/controls/configure-button/configure-button.component.html`
- Create: `apps/web/src/app/controls/configure-button/configure-button.component.scss`
- Test: `apps/web/src/app/controls/configure-button/configure-button.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConfigureButtonComponent } from './configure-button.component';

describe('ConfigureButtonComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ConfigureButtonComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createButton() {
    const fixture = TestBed.createComponent(ConfigureButtonComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.configure') as HTMLButtonElement;
    return { fixture, button };
  }

  it('is visible on load', () => {
    const { button } = createButton();
    expect(button.classList.contains('hidden')).toBe(false);
  });

  it('hides after the idle delay', () => {
    const { fixture, button } = createButton();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(true);
  });

  it('reappears on pointer movement and re-arms the hide timer', () => {
    const { fixture, button } = createButton();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    document.dispatchEvent(new Event('pointermove'));
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(false);
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(true);
  });

  it('stays visible while pinned', () => {
    const { fixture, button } = createButton();
    fixture.componentRef.setInput('pinned', true);
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(false);
  });

  it('emits open when clicked', () => {
    const { fixture, button } = createButton();
    let opened = false;
    fixture.componentInstance.open.subscribe(() => {
      opened = true;
    });
    button.click();
    expect(opened).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./configure-button.component`.

- [ ] **Step 3: Write the component**

`configure-button.component.ts`:

```ts
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-configure-button',
  templateUrl: './configure-button.component.html',
  styleUrl: './configure-button.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class ConfigureButtonComponent implements OnInit, OnDestroy {
  readonly pinned = input(false);
  readonly open = output<void>();
  readonly visible = signal(true);

  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.armHideTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
  }

  reveal(): void {
    this.visible.set(true);
    this.armHideTimer();
  }

  focusButton(): void {
    this.button().nativeElement.focus();
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.visible.set(false), HIDE_DELAY_MS);
  }
}
```

`configure-button.component.html`:

```html
<button
  #button
  type="button"
  class="configure"
  [class.hidden]="!visible() && !pinned()"
  (click)="open.emit()"
>
  Configure
</button>
```

`configure-button.component.scss`:

```scss
:host {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.configure {
  background: rgba(30, 30, 30, 0.85);
  color: #eee;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.3s ease;

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/controls/configure-button
git commit -m "feat(web): add auto-hiding configure button"
```

---

### Task 8: FacePickerSheetComponent — bottom sheet with live previews

Live previews render the real face components scaled down with `transform: scale(0.2)` inside a fixed 960×540 viewport box (shows as 192×108). Faces fill their container, so this works without special preview code.

**Files:**
- Create: `apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.ts`
- Create: `apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.html`
- Create: `apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.scss`
- Test: `apps/web/src/app/controls/face-picker-sheet/face-picker-sheet.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FacePickerSheetComponent } from './face-picker-sheet.component';

describe('FacePickerSheetComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacePickerSheetComponent],
    }).compileComponents();
  });

  function createSheet(activeFaceId = 'fullscreen') {
    const fixture = TestBed.createComponent(FacePickerSheetComponent);
    fixture.componentRef.setInput('activeFaceId', activeFaceId);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one option per registered face', () => {
    const fixture = createSheet();
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    expect(options).toHaveLength(2);
  });

  it('highlights the active face', () => {
    const fixture = createSheet('world-cards');
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    expect(options[0].classList.contains('active')).toBe(false);
    expect(options[1].classList.contains('active')).toBe(true);
  });

  it('emits select with the face id when an option is clicked', () => {
    const fixture = createSheet();
    let selected = '';
    fixture.componentInstance.select.subscribe((id: string) => {
      selected = id;
    });
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    expect(selected).toBe('world-cards');
  });

  it('emits close when the backdrop is clicked', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.close.subscribe(() => {
      closed = true;
    });
    (fixture.nativeElement.querySelector('.backdrop') as HTMLElement).click();
    expect(closed).toBe(true);
  });

  it('emits close on Escape', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.close.subscribe(() => {
      closed = true;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — cannot resolve `./face-picker-sheet.component`.

- [ ] **Step 3: Write the component**

`face-picker-sheet.component.ts`:

```ts
import { NgComponentOutlet } from '@angular/common';
import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { FACES } from '../../faces/face-registry';

@Component({
  selector: 'app-face-picker-sheet',
  imports: [NgComponentOutlet],
  templateUrl: './face-picker-sheet.component.html',
  styleUrl: './face-picker-sheet.component.scss',
  host: {
    '(document:keydown.escape)': 'close.emit()',
  },
})
export class FacePickerSheetComponent {
  readonly faces = FACES;
  readonly activeFaceId = input.required<string>();
  readonly select = output<string>();
  readonly close = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }
}
```

`face-picker-sheet.component.html`:

```html
<div class="backdrop" (click)="close.emit()"></div>
<div class="sheet" #panel tabindex="-1" role="dialog" aria-label="Choose a clock face">
  <div class="handle"></div>
  <div class="options">
    @for (face of faces; track face.id) {
      <button
        type="button"
        class="face-option"
        [class.active]="face.id === activeFaceId()"
        (click)="select.emit(face.id)"
      >
        <span class="preview" aria-hidden="true">
          <span class="preview-viewport">
            <ng-container [ngComponentOutlet]="face.component" />
          </span>
        </span>
        <span class="name">{{ face.displayName }}</span>
      </button>
    }
  </div>
</div>
```

`face-picker-sheet.component.scss`:

```scss
:host {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1e1e1e;
  border-radius: 16px 16px 0 0;
  padding: 0.75rem 1rem 1.25rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.6);
  outline: none;
}

.handle {
  width: 36px;
  height: 4px;
  background: #555;
  border-radius: 2px;
  margin: 0 auto 0.75rem;
}

.options {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.face-option {
  background: #2a2a2a;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  &.active {
    border-color: #4a9eff;
  }
}

.preview {
  display: block;
  width: 192px;
  height: 108px;
  overflow: hidden;
  border-radius: 6px;
  background: #000;
}

.preview-viewport {
  display: block;
  width: 960px;
  height: 540px;
  transform: scale(0.2);
  transform-origin: top left;
  pointer-events: none;
}

.name {
  color: #ccc;
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/controls/face-picker-sheet
git commit -m "feat(web): add face picker bottom sheet with live previews"
```

---

### Task 9: Shell rewrite — active face + controls, router removed

**Files:**
- Modify: `apps/web/src/app/app.component.ts`
- Modify: `apps/web/src/app/app.component.html`
- Modify: `apps/web/src/app/app.component.scss`
- Modify: `apps/web/src/app/app.component.spec.ts`
- Modify: `apps/web/src/app/app.config.ts`
- Delete: `apps/web/src/app/app.routes.ts`

- [ ] **Step 1: Rewrite the failing shell spec**

Overwrite `app.component.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the fullscreen face by default', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-fullscreen-face')).toBeTruthy();
    expect(el.querySelector('app-world-cards-face')).toBeNull();
  });

  it('shows the configure button and no sheet initially', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-configure-button')).toBeTruthy();
    expect(el.querySelector('app-face-picker-sheet')).toBeNull();
  });

  it('switches face via the picker and persists the choice', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button.configure') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('app-face-picker-sheet')).toBeTruthy();

    const options = el.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('app-world-cards-face')).toBeTruthy();
    expect(el.querySelector('app-face-picker-sheet')).toBeNull();
    expect(localStorage.getItem('allyclock.face')).toBe('world-cards');
  });

  it('restores the persisted face on startup', () => {
    localStorage.setItem('allyclock.face', 'world-cards');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-face')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:web`
Expected: FAIL — `AppComponent` still renders the old card grid (no `app-fullscreen-face`).

- [ ] **Step 3: Rewrite the shell**

`app.component.ts`:

```ts
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FACES } from './faces/face-registry';
import { FacePreferenceService } from './services/face-preference.service';
import { ConfigureButtonComponent } from './controls/configure-button/configure-button.component';
import { FacePickerSheetComponent } from './controls/face-picker-sheet/face-picker-sheet.component';

@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet, ConfigureButtonComponent, FacePickerSheetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly preference = inject(FacePreferenceService);
  private readonly configureButton = viewChild.required(ConfigureButtonComponent);

  readonly sheetOpen = signal(false);
  readonly activeFaceId = this.preference.activeFaceId;
  readonly activeFace = computed(
    () => FACES.find((face) => face.id === this.activeFaceId()) ?? FACES[0],
  );

  openSheet(): void {
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.configureButton().focusButton();
  }

  selectFace(id: string): void {
    this.preference.setFace(id);
    this.closeSheet();
  }
}
```

`app.component.html`:

```html
<main class="face-host">
  <ng-container [ngComponentOutlet]="activeFace().component" />
</main>
<app-configure-button [pinned]="sheetOpen()" (open)="openSheet()" />
@if (sheetOpen()) {
  <app-face-picker-sheet
    [activeFaceId]="activeFaceId()"
    (select)="selectFace($event)"
    (close)="closeSheet()"
  />
}
```

`app.component.scss`:

```scss
.face-host {
  position: fixed;
  inset: 0;
}
```

`app.config.ts` (router removed — there are no routes):

```ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection()],
};
```

Delete the routes file:

```bash
git rm apps/web/src/app/app.routes.ts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src/app
git commit -m "feat(web): render faces via registry with configure button and picker"
```

---

### Task 10: Cleanup — drop moment, build, docs

**Files:**
- Modify: `apps/web/package.json` / `package-lock.json` (via npm)
- Modify: `apps/web/angular.json` (remove `allowedCommonJsDependencies`)
- Modify: `apps/web/CLAUDE.md`, root `CLAUDE.md` (file map updates)

- [ ] **Step 1: Remove the moment-timezone dependency**

```bash
npm --prefix apps/web uninstall moment-timezone
```

Then verify no source file references it:

```bash
grep -rn "moment" apps/web/src && echo "FOUND - fix before continuing" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 2: Remove the CommonJS allowance from angular.json**

In `apps/web/angular.json`, delete this block from `architect.build.options` (and the trailing comma on the previous property):

```json
"allowedCommonJsDependencies": [
  "moment-timezone"
]
```

- [ ] **Step 3: Build and run the full suite**

```bash
npm run build:web
npm run test:web
npm --prefix apps/web run lint
```

Expected: build succeeds with no CommonJS warnings; all tests pass; lint clean. Fix anything that fails before continuing.

- [ ] **Step 4: Update agent docs**

In root `CLAUDE.md`, "Important Files" section, replace the two lines:

```markdown
- `apps/web/src/app/card/card.component.*` renders a single clock card.
- `apps/web/src/app/services/location.service.ts` maps region IDs to flag URLs and timezone offsets.
```

with:

```markdown
- `apps/web/src/app/faces/face-registry.ts` lists the selectable clock faces.
- `apps/web/src/app/faces/` contains one directory per clock face (fullscreen, world-cards).
- `apps/web/src/app/controls/` contains the configure button and face picker sheet.
- `apps/web/src/app/services/location.service.ts` maps region IDs to flag URLs and timezone offsets.
```

In `apps/web/CLAUDE.md`, "Important Files" section, replace:

```markdown
- `src/app/card/card.component.*` renders a single clock card.
```

with:

```markdown
- `src/app/faces/face-registry.ts` lists the selectable clock faces; each face lives in its own directory under `src/app/faces/`.
- `src/app/controls/` contains the configure button and face picker sheet.
```

Also update the App Overview bullet `- moment-timezone is used for timezone offset formatting.` to:

```markdown
- Native `Intl.DateTimeFormat` is used for all time/timezone formatting.
```

- [ ] **Step 5: Manual smoke test**

Run `npm run start:web`, open http://localhost:4200 and verify:
- Fullscreen clock shows by default; Configure button visible, fades after ~4s.
- Moving the mouse brings the button back.
- Clicking Configure opens the sheet with two live previews; picking World Cards switches the face.
- Reloading the page keeps World Cards selected.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(web): drop moment-timezone and update agent docs"
```

---

## Verification checklist (after all tasks)

- `npm run build:web` — green, no CommonJS warnings
- `npm run test:web` — all specs pass
- `npm --prefix apps/web run lint` — clean
- Manual smoke test from Task 10 Step 5 passes
