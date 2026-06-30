# World Cards: Settings + Adjust, Config-Driven Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the World Cards face into a configurable face with a Settings panel (city list, per-card zone + full/cell span, global 3-vs-2 section mode) and a resolution-based Adjust panel (Time / Precision / Date font sizes per dimension band), rendered by a responsive auto-fit grid.

**Architecture:** Mirror the Fullscreen face. A `WorldCardsConfigStore extends BandConfigStore` holds per-band fields where `cards` + `sectionMode` are broadcast to every band (global) and `sizes` are per-band. A presentational `CardComponent` renders 2- or 3-section content from `clock-formatter` helpers. The face measures its own ratio (`ContainerSizeDirective`) to resolve the active band, owns the gear (Settings) locally, and renders the Adjust panel via `FaceConfigService.adjustOpen()`.

**Tech Stack:** Angular 21 standalone components, signals, Vitest, SCSS, native `Intl`.

## Global Constraints

- Two-space indentation, UTF-8, final newline, single quotes in TypeScript.
- Standalone components only; `ChangeDetectionStrategy.OnPush`.
- Cross-tier imports use `@core/*`, `@shared/*`, `@features/*` aliases; intra-subtree imports stay relative.
- Reuse `clock-formatter` helpers (`bigTime`, `precise`, `gmtOffset`, `compactOffset`, `zoneCity`) — do not re-implement time formatting.
- `DatePipe` cannot take IANA zone names — use `Intl.DateTimeFormat` for zoned dates.
- Icons via `<app-icon>` with SF Symbol names; available names include `gearshape`, `globe`, `xmark`, `plus`, `trash`.
- `MIN_CARDS = 1`, `MAX_CARDS = 12`.
- Run `npm run test:web` for unit tests and `npm run build:web` before finishing (run from repo root).
- **Task ordering keeps the build green at every task.** The Settings/Adjust panels (Tasks 3–4) depend only on the store, so they land while the original card/face still compile. The `CardComponent` input change — which breaks the original face template — happens together with the face rewrite in Task 5, so the tree is never left red between tasks.
- Commit messages end with the repo trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
  ```

## File Structure

All paths under `apps/web/src/app/features/faces/world-cards/`:

- `world-cards-config.ts` — types + constants (Task 1)
- `world-cards-presets.data.ts` — per-band default seed (Task 1)
- `world-cards-config-store.service.ts` — `BandConfigStore` subclass (Task 2)
- `world-cards-settings/world-cards-settings.component.{ts,html,scss}` — Settings panel (Task 3)
- `world-cards-config/world-cards-config.component.{ts,html,scss}` — Adjust panel (Task 4)
- `card/card.component.{ts,html,scss}` — config-driven card, rewritten (Task 5)
- `world-cards-face.component.{ts,html,scss}` — renderer, rewritten (Task 5)
- `../face-registry.ts` — add `configComponent` (Task 5)

---

### Task 1: Config types + default seed

**Files:**
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-config.ts`
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-presets.data.ts`
- Test: `apps/web/src/app/features/faces/world-cards/world-cards-presets.data.spec.ts`

**Interfaces:**
- Produces: `SectionMode`, `CardSpan`, `WorldCardConfig { id: number; zone: string; span: CardSpan }`, `WorldCardSizes { time: number; precision: number; date: number }`, `WorldCardsFields { sectionMode: SectionMode; cards: WorldCardConfig[]; sizes: WorldCardSizes }`, `MIN_CARDS`, `MAX_CARDS`, `buildDefaultFields(): Record<string, WorldCardsFields>`.

- [ ] **Step 1: Write the types file**

Create `world-cards-config.ts`:

```ts
export type SectionMode = 'three' | 'two';
export type CardSpan = 'full' | 'cell';

export interface WorldCardConfig {
  id: number; // stable key for @for tracking / future reorder
  zone: string; // IANA id, e.g. 'America/Los_Angeles'
  span: CardSpan;
}

export interface WorldCardSizes {
  time: number; // 0.5–2.0, default 1.0
  precision: number; // 0.5–2.0, default 1.0
  date: number; // 0.5–2.0, default 1.0
}

// Per-band fields. `sectionMode` + `cards` are GLOBAL — broadcast identically to
// every band (read from any band via the store's sample()). `sizes` is per-band
// (resolution-based), tuned by the Adjust panel for the active band.
export interface WorldCardsFields {
  sectionMode: SectionMode;
  cards: WorldCardConfig[];
  sizes: WorldCardSizes;
}

export const MIN_CARDS = 1;
export const MAX_CARDS = 12;
```

- [ ] **Step 2: Write the presets data file**

Create `world-cards-presets.data.ts`:

```ts
import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';
import type { WorldCardConfig, WorldCardsFields } from './world-cards-config';

// US (featured, full row) + UK + KR, matching today's look. UK uses Europe/London
// (DST-aware), replacing the old UTC simplification.
const DEFAULT_CARDS: WorldCardConfig[] = [
  { id: 1, zone: 'America/Los_Angeles', span: 'full' },
  { id: 2, zone: 'Europe/London', span: 'cell' },
  { id: 3, zone: 'Asia/Seoul', span: 'cell' },
];

function fields(): WorldCardsFields {
  return {
    sectionMode: 'three',
    cards: DEFAULT_CARDS.map((c) => ({ ...c })),
    sizes: { time: 1, precision: 1, date: 1 },
  };
}

// Default fields per band id. cards + sectionMode are identical across bands
// (they are global); sizes start at 1.0 per band.
export function buildDefaultFields(): Record<string, WorldCardsFields> {
  const byBand: Record<string, WorldCardsFields> = {};
  for (const band of BUILT_IN_BANDS) byBand[band.id] = fields();
  return byBand;
}
```

- [ ] **Step 3: Write the failing test**

Create `world-cards-presets.data.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDefaultFields } from './world-cards-presets.data';
import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';

describe('buildDefaultFields', () => {
  it('returns one entry per built-in band id', () => {
    expect(Object.keys(buildDefaultFields()).sort()).toEqual(
      BUILT_IN_BANDS.map((b) => b.id).sort(),
    );
  });

  it('seeds three-section mode, unit sizes, and the US/UK/KR cards on every band', () => {
    for (const fields of Object.values(buildDefaultFields())) {
      expect(fields.sectionMode).toBe('three');
      expect(fields.sizes).toEqual({ time: 1, precision: 1, date: 1 });
      expect(fields.cards.map((c) => c.zone)).toEqual([
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Seoul',
      ]);
      expect(fields.cards[0].span).toBe('full');
      expect(fields.cards[1].span).toBe('cell');
    }
  });

  it('returns independent deep clones each call', () => {
    const a = buildDefaultFields();
    const b = buildDefaultFields();
    a['phone'].cards[0].zone = 'Asia/Tokyo';
    expect(b['phone'].cards[0].zone).toBe('America/Los_Angeles');
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm run test:web -- --run world-cards-presets.data`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/features/faces/world-cards/world-cards-config.ts \
  apps/web/src/app/features/faces/world-cards/world-cards-presets.data.ts \
  apps/web/src/app/features/faces/world-cards/world-cards-presets.data.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): add World Cards config types and default seed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
EOF
)"
```

---

### Task 2: Config store

**Files:**
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-config-store.service.ts`
- Test: `apps/web/src/app/features/faces/world-cards/world-cards-config-store.service.spec.ts`

**Interfaces:**
- Consumes: `buildDefaultFields` (Task 1), `WorldCardsFields`, `WorldCardConfig`, `SectionMode`, `CardSpan`, `WorldCardSizes`, `MIN_CARDS`, `MAX_CARDS` (Task 1); `BandConfigStore` (`@core/dimensions/band-config-store`), `DimensionRegistry` (`@core/dimensions/dimension-registry.service`).
- Produces: `WorldCardsConfigStore` with `fieldsFor(ratio): WorldCardsFields`, `sample(): WorldCardsFields`, `config(bandId)` (inherited), `state()` (inherited), `setSectionModeAll(mode)`, `addCard(zone)`, `removeCard(id)`, `setCardZone(id, zone)`, `setCardSpan(id, span)`, `setSize(bandId, key, value)`.

- [ ] **Step 1: Write the store**

Create `world-cards-config-store.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { BandConfigStore } from '@core/dimensions/band-config-store';
import { buildDefaultFields } from './world-cards-presets.data';
import {
  type WorldCardsFields,
  type WorldCardConfig,
  type SectionMode,
  type CardSpan,
  type WorldCardSizes,
  MIN_CARDS,
  MAX_CARDS,
} from './world-cards-config';

@Injectable({ providedIn: 'root' })
export class WorldCardsConfigStore extends BandConfigStore<WorldCardsFields> {
  private readonly registry = inject(DimensionRegistry);

  protected storageKey(): string {
    return 'allyclock.world-cards.config';
  }
  protected version(): number {
    return 1;
  }
  protected buildDefaults(): Record<string, WorldCardsFields> {
    return buildDefaultFields();
  }

  constructor() {
    super();
    this.init();
  }

  // Fields for the band that contains the given ratio.
  fieldsFor(ratio: number): WorldCardsFields {
    return this.config(this.registry.resolveForRatio(ratio).id);
  }

  // cards + sectionMode are broadcast to every band, so any band is a faithful
  // sample for reading those global values.
  sample(): WorldCardsFields {
    return Object.values(this.state().byBand)[0];
  }

  private nextId(): number {
    const ids = this.sample().cards.map((c) => c.id);
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  setSectionModeAll(mode: SectionMode): void {
    this.patchAll((f) => ({ ...f, sectionMode: mode }));
  }

  // Global: broadcast the new card list to every band. No-op at MAX_CARDS.
  addCard(zone: string): void {
    if (this.sample().cards.length >= MAX_CARDS) return;
    const card: WorldCardConfig = { id: this.nextId(), zone, span: 'cell' };
    this.patchAll((f) => ({ ...f, cards: [...f.cards, { ...card }] }));
  }

  removeCard(id: number): void {
    if (this.sample().cards.length <= MIN_CARDS) return;
    this.patchAll((f) => ({ ...f, cards: f.cards.filter((c) => c.id !== id) }));
  }

  setCardZone(id: number, zone: string): void {
    this.patchAll((f) => ({
      ...f,
      cards: f.cards.map((c) => (c.id === id ? { ...c, zone } : c)),
    }));
  }

  setCardSpan(id: number, span: CardSpan): void {
    this.patchAll((f) => ({
      ...f,
      cards: f.cards.map((c) => (c.id === id ? { ...c, span } : c)),
    }));
  }

  // Per-band (resolution-based): only the given band's sizes change.
  setSize(bandId: string, key: keyof WorldCardSizes, value: number): void {
    this.patch(bandId, (f) => ({ ...f, sizes: { ...f.sizes, [key]: value } }));
  }

  // Field-level migration: fill any missing field from defaults without dropping
  // the persisted card list or per-band sizes.
  protected override mergeBand(
    defaults: WorldCardsFields,
    persisted: WorldCardsFields,
  ): WorldCardsFields {
    return {
      sectionMode: persisted.sectionMode ?? defaults.sectionMode,
      cards: persisted.cards ?? defaults.cards,
      sizes: { ...defaults.sizes, ...persisted.sizes },
    };
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `world-cards-config-store.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { MAX_CARDS } from './world-cards-config';

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
};

describe('WorldCardsConfigStore', () => {
  let store: WorldCardsConfigStore;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorldCardsConfigStore);
  });

  it('seeds fields for every band id and persists them', () => {
    expect(Object.keys(store.state().byBand).sort()).toEqual(
      ['lap', 'mini', 'pad', 'phone', 'super', 'tall', 'ultra', 'wide'],
    );
    expect(JSON.parse(mem['allyclock.world-cards.config']).byBand.lap).toBeDefined();
  });

  it('addCard appends a uniquely-id card to every band, no-op at MAX', () => {
    store.addCard('Asia/Tokyo');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.map((c) => c.zone)).toContain('Asia/Tokyo');
    }
    const ids = store.sample().cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // unique ids
    while (store.sample().cards.length < MAX_CARDS) store.addCard('UTC');
    store.addCard('UTC'); // over the cap
    expect(store.sample().cards.length).toBe(MAX_CARDS);
  });

  it('removeCard broadcasts and refuses to drop the last card', () => {
    const id = store.sample().cards[0].id;
    store.removeCard(id);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.find((c) => c.id === id)).toBeUndefined();
    }
    while (store.sample().cards.length > 1) {
      store.removeCard(store.sample().cards[0].id);
    }
    store.removeCard(store.sample().cards[0].id); // last-card guard
    expect(store.sample().cards.length).toBe(1);
  });

  it('setCardZone and setCardSpan broadcast to every band', () => {
    const id = store.sample().cards[1].id;
    store.setCardZone(id, 'Asia/Seoul');
    store.setCardSpan(id, 'full');
    for (const fields of Object.values(store.state().byBand)) {
      const card = fields.cards.find((c) => c.id === id)!;
      expect(card.zone).toBe('Asia/Seoul');
      expect(card.span).toBe('full');
    }
  });

  it('setSectionModeAll broadcasts to every band', () => {
    store.setSectionModeAll('two');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sectionMode).toBe('two');
    }
  });

  it('setSize changes only the target band and persists', () => {
    store.setSize('lap', 'time', 1.5);
    expect(store.config('lap').sizes.time).toBe(1.5);
    expect(store.config('phone').sizes.time).toBe(1); // other bands untouched
    expect(JSON.parse(mem['allyclock.world-cards.config']).byBand.lap.sizes.time).toBe(1.5);
  });

  it('fieldsFor(ratio) resolves the band containing the ratio', () => {
    store.setSize('phone', 'date', 1.8);
    expect(store.fieldsFor(0.4).sizes.date).toBe(1.8); // 0.4 → phone band
    expect(store.fieldsFor(1.6).sizes.date).toBe(1); // 1.6 → lap band
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm run test:web -- --run world-cards-config-store`
Expected: PASS (7 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/features/faces/world-cards/world-cards-config-store.service.ts \
  apps/web/src/app/features/faces/world-cards/world-cards-config-store.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): add World Cards per-band config store

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
EOF
)"
```

---

### Task 3: Settings panel

**Files:**
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-settings/world-cards-settings.component.ts`
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-settings/world-cards-settings.component.html`
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-settings/world-cards-settings.component.scss`
- Test: `apps/web/src/app/features/faces/world-cards/world-cards-settings/world-cards-settings.component.spec.ts`

**Interfaces:**
- Consumes: `WorldCardsConfigStore` (Task 2); `SectionMode`, `CardSpan`, `MIN_CARDS`, `MAX_CARDS` (Task 1); `ZoneCatalog`, `TimeZoneOption`, `countryCodeForZone`, `zoneCity`; `SheetComponent`, `NavHeaderComponent`, `IconButtonComponent`, `IconComponent`, `ZonePickerComponent`, `FlagComponent`.
- Produces: `WorldCardsSettingsComponent` with `closed` output.

This panel only depends on the store and shared UI; the original card/face are untouched, so the build stays green.

- [ ] **Step 1: Write the component class**

Create `world-cards-settings/world-cards-settings.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';
import { type SectionMode, type CardSpan, MIN_CARDS, MAX_CARDS } from '../world-cards-config';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ZoneCatalog, type TimeZoneOption } from '@core/zone-catalog';
import { countryCodeForZone } from '@core/zone-country';
import { zoneCity } from '../../fullscreen/clock-formatter';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';
import { FlagComponent } from '@shared/ui/flag/flag.component';

/**
 * World Cards Settings: manage the card list (zone + full/cell span, add/remove)
 * and the global section mode. Opened from the face's gear, rendered in a bottom
 * sheet (close = apply). A zone-picker sub-view replaces the list while editing a
 * card's zone.
 */
@Component({
  selector: 'app-world-cards-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent, IconComponent, ZonePickerComponent, FlagComponent],
  templateUrl: './world-cards-settings.component.html',
  styleUrl: './world-cards-settings.component.scss',
})
export class WorldCardsSettingsComponent {
  private readonly store = inject(WorldCardsConfigStore);
  private readonly catalog = inject(ZoneCatalog);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);
  private readonly localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly cards = computed(() => this.store.sample().cards);
  readonly sectionMode = computed(() => this.store.sample().sectionMode);
  readonly canRemove = computed(() => this.cards().length > MIN_CARDS);
  readonly canAdd = computed(() => this.cards().length < MAX_CARDS);

  readonly zoneOptions: TimeZoneOption[] = this.catalog.options();
  readonly editingCardId = signal<number | null>(null);

  readonly countryFor = countryCodeForZone;
  cityLabel(zone: string): string {
    return zoneCity(zone, true);
  }
  selectedZone(): string {
    const id = this.editingCardId();
    return this.cards().find((c) => c.id === id)?.zone ?? '';
  }

  setSectionMode(mode: SectionMode): void {
    this.store.setSectionModeAll(mode);
  }
  setSpan(id: number, span: CardSpan): void {
    this.store.setCardSpan(id, span);
  }
  remove(id: number): void {
    this.store.removeCard(id);
  }
  add(): void {
    this.store.addCard(this.localZone);
  }

  openZonePicker(id: number): void {
    this.editingCardId.set(id);
  }
  closeZonePicker(): void {
    this.editingCardId.set(null);
  }
  pickZone(zone: string): void {
    const id = this.editingCardId();
    if (id != null) this.store.setCardZone(id, zone);
    this.editingCardId.set(null);
  }

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 2: Write the template**

Create `world-cards-settings/world-cards-settings.component.html`:

```html
<app-sheet sheetLabel="World Cards" (closed)="onSheetClosed()">
  <div class="cfg">
    <app-nav-header title="World Cards" [flush]="true">
      <app-icon-button navLeading icon="xmark" label="Close" (click)="close()" />
    </app-nav-header>

    @if (editingCardId() === null) {
      <div class="knobs-panel">
        <!-- Layout: section mode -->
        <div class="knobs-section">
          <div class="knobs-segment-row">
            <span class="knobs-section-label">Layout</span>
            <div class="knobs-segment" role="radiogroup" data-knob="section-mode" aria-label="Section mode">
              <button
                type="button"
                role="radio"
                class="knobs-segment-btn"
                [class.on]="sectionMode() === 'three'"
                [attr.aria-checked]="sectionMode() === 'three'"
                data-mode="three"
                (click)="setSectionMode('three')"
              >3 Sections</button>
              <button
                type="button"
                role="radio"
                class="knobs-segment-btn"
                [class.on]="sectionMode() === 'two'"
                [attr.aria-checked]="sectionMode() === 'two'"
                data-mode="two"
                (click)="setSectionMode('two')"
              >2 Sections</button>
            </div>
          </div>
        </div>

        <!-- Cities -->
        <div class="knobs-section">
          <span class="knobs-section-label">Cities</span>
          @for (card of cards(); track card.id) {
            <div class="city-row" [attr.data-card]="card.id">
              <button type="button" class="city-zone" data-knob="card-zone" (click)="openZonePicker(card.id)">
                <app-flag class="city-flag" [countryCode]="countryFor(card.zone)" />
                <span class="city-name">{{ cityLabel(card.zone) }}</span>
              </button>
              <div class="knobs-segment span-seg" role="radiogroup" data-knob="card-span" aria-label="Card width">
                <button
                  type="button"
                  role="radio"
                  class="knobs-segment-btn"
                  [class.on]="card.span === 'full'"
                  [attr.aria-checked]="card.span === 'full'"
                  data-span="full"
                  (click)="setSpan(card.id, 'full')"
                >Full</button>
                <button
                  type="button"
                  role="radio"
                  class="knobs-segment-btn"
                  [class.on]="card.span === 'cell'"
                  [attr.aria-checked]="card.span === 'cell'"
                  data-span="cell"
                  (click)="setSpan(card.id, 'cell')"
                >Cell</button>
              </div>
              @if (canRemove()) {
                <app-icon-button class="city-remove" icon="trash" variant="destructive" label="Remove" data-knob="card-remove" (click)="remove(card.id)" />
              }
            </div>
          }
          <button type="button" class="add-city" data-knob="add-card" (click)="add()" [disabled]="!canAdd()">
            <app-icon name="plus" /> Add City
          </button>
        </div>
      </div>
    } @else {
      <div class="knobs-zonepicker">
        <app-zone-picker [options]="zoneOptions" [selectedId]="selectedZone()" (picked)="pickZone($event)" />
        <button type="button" class="knobs-tz-back" (click)="closeZonePicker()">Cancel</button>
      </div>
    }
  </div>
</app-sheet>
```

- [ ] **Step 3: Write the styles**

Create `world-cards-settings/world-cards-settings.component.scss`:

```scss
@use 'tokens' as t;

.cfg {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: t.$label;
  padding: 0.5rem 1.5rem 2rem;
}

app-nav-header {
  display: block;
  flex: 0 0 auto;
  margin-bottom: 1.5rem;
}

.knobs-panel {
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.5rem;
}

.knobs-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 0.75rem 1rem;
}

.knobs-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: t.$secondary-label;
}

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
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &.on {
    background: t.$tint;
    color: #fff;
  }
}

// One card's editable row: zone button | span toggle | remove.
.city-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.city-zone {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: t.$secondary-surface;
  border: none;
  border-radius: 8px;
  color: t.$tint;
  font-size: 0.9rem;
  text-align: left;
  padding: 0.5rem 0.7rem;
  cursor: pointer;

  &:hover {
    background: t.$secondary-surface-hover;
  }
}

.city-flag {
  flex: 0 0 auto;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 4px;
  color: t.$secondary-label;
}

.city-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.span-seg {
  flex: 0 0 8rem;
}

.add-city {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  background: none;
  border: none;
  color: t.$tint;
  font-size: 0.9rem;
  padding: 0.4rem;
  cursor: pointer;

  app-icon {
    width: 1em;
    height: 1em;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.knobs-zonepicker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1 1 auto;
  min-height: 0;
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

- [ ] **Step 4: Write the failing test**

Create `world-cards-settings/world-cards-settings.component.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsSettingsComponent } from './world-cards-settings.component';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';

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
};

describe('WorldCardsSettingsComponent', () => {
  let store: WorldCardsConfigStore;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [WorldCardsSettingsComponent] }).compileComponents();
    store = TestBed.inject(WorldCardsConfigStore);
  });

  it('section-mode control broadcasts the mode to every band', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-mode="two"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sectionMode).toBe('two');
    }
  });

  it('renders one row per card and adds a card on Add City', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(3);
    (fixture.nativeElement.querySelector('[data-knob="add-card"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(4);
  });

  it('removes a card and hides the remove control at the last card', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(2);
    // Down to one card: the remove controls disappear (last-card guard).
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-knob="card-remove"]')).toBeNull();
  });

  it('span toggle writes the card span to every band', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    // Second card defaults to 'cell'; click its Full button.
    const rows = fixture.nativeElement.querySelectorAll('.city-row');
    (rows[1].querySelector('[data-span="full"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const id = store.sample().cards[1].id;
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.find((c) => c.id === id)!.span).toBe('full');
    }
  });

  it('opens the zone picker and applies the picked zone to that card', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    const firstId = store.sample().cards[0].id;
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-zone"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeTruthy();
    fixture.componentInstance.pickZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(store.sample().cards.find((c) => c.id === firstId)!.zone).toBe('Asia/Tokyo');
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm run test:web -- --run world-cards-settings`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/faces/world-cards/world-cards-settings/
git commit -m "$(cat <<'EOF'
feat(web): add World Cards Settings panel (cities, span, section mode)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
EOF
)"
```

---

### Task 4: Adjust panel

**Files:**
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-config/world-cards-config.component.ts`
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-config/world-cards-config.component.html`
- Create: `apps/web/src/app/features/faces/world-cards/world-cards-config/world-cards-config.component.scss`
- Test: `apps/web/src/app/features/faces/world-cards/world-cards-config/world-cards-config.component.spec.ts`

**Interfaces:**
- Consumes: `WorldCardsConfigStore` (Task 2), `WorldCardSizes` (Task 1), `DimensionRegistry`, `SheetComponent`, `NavHeaderComponent`, `IconButtonComponent`, `DecimalPipe`.
- Produces: `WorldCardsConfigComponent` with required input `ratio: number` and `closed` output. (Registry wiring happens in Task 5, when the face renders this panel.)

- [ ] **Step 1: Write the component class**

Create `world-cards-config/world-cards-config.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { type WorldCardSizes } from '../world-cards-config';

/**
 * Resolution-based Adjust panel for World Cards: Time / Precision / Date font
 * sizes, tuned for the dimension band that matches the face's current ratio.
 * The Precision slider is hidden in 2-section mode (no precision row exists).
 */
@Component({
  selector: 'app-world-cards-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent, DecimalPipe],
  templateUrl: './world-cards-config.component.html',
  styleUrl: './world-cards-config.component.scss',
})
export class WorldCardsConfigComponent {
  protected readonly store = inject(WorldCardsConfigStore);
  private readonly registry = inject(DimensionRegistry);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  readonly ratio = input.required<number>();

  readonly editingBand = computed(() => this.registry.resolveForRatio(this.ratio()));
  readonly editingFields = computed(() => this.store.config(this.editingBand().id));
  readonly sectionMode = computed(() => this.store.sample().sectionMode);

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }

  fillPct(value: number, min: number, max: number): string {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  onSize(key: keyof WorldCardSizes, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.setSize(this.editingBand().id, key, value);
  }
}
```

- [ ] **Step 2: Write the template**

Create `world-cards-config/world-cards-config.component.html`:

```html
<app-sheet sheetLabel="Adjustment" (closed)="onSheetClosed()">
  <div class="cfg">
    <app-nav-header title="Adjustment" [flush]="true">
      <app-icon-button navLeading icon="xmark" label="Close" (click)="close()" />
    </app-nav-header>

    <div class="knobs-panel">
      <!-- Time -->
      <div class="knobs-section">
        <div class="knobs-section-header">
          <span class="knobs-section-label">Time</span>
        </div>
        <div class="knobs-row">
          <input
            type="range"
            class="knobs-slider"
            min="0.5"
            max="2.0"
            step="0.05"
            [value]="editingFields().sizes.time"
            [style.--fill]="fillPct(editingFields().sizes.time, 0.5, 2.0)"
            data-knob="time-size"
            (input)="onSize('time', $event)"
          />
          <span class="knobs-row-value">{{ editingFields().sizes.time | number: '1.2-2' }}</span>
        </div>
      </div>

      <!-- Precision (hidden in 2-section) -->
      @if (sectionMode() === 'three') {
        <div class="knobs-section">
          <div class="knobs-section-header">
            <span class="knobs-section-label">Precision</span>
          </div>
          <div class="knobs-row">
            <input
              type="range"
              class="knobs-slider"
              min="0.5"
              max="2.0"
              step="0.05"
              [value]="editingFields().sizes.precision"
              [style.--fill]="fillPct(editingFields().sizes.precision, 0.5, 2.0)"
              data-knob="precision-size"
              (input)="onSize('precision', $event)"
            />
            <span class="knobs-row-value">{{ editingFields().sizes.precision | number: '1.2-2' }}</span>
          </div>
        </div>
      }

      <!-- Date -->
      <div class="knobs-section">
        <div class="knobs-section-header">
          <span class="knobs-section-label">Date</span>
        </div>
        <div class="knobs-row">
          <input
            type="range"
            class="knobs-slider"
            min="0.5"
            max="2.0"
            step="0.05"
            [value]="editingFields().sizes.date"
            [style.--fill]="fillPct(editingFields().sizes.date, 0.5, 2.0)"
            data-knob="date-size"
            (input)="onSize('date', $event)"
          />
          <span class="knobs-row-value">{{ editingFields().sizes.date | number: '1.2-2' }}</span>
        </div>
      </div>
    </div>
  </div>
</app-sheet>
```

- [ ] **Step 3: Write the styles**

Create `world-cards-config/world-cards-config.component.scss`:

```scss
@use 'tokens' as t;

.cfg {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: t.$label;
  padding: 0.5rem 1.5rem 2rem;
  container-type: inline-size;
}

app-nav-header {
  display: block;
  flex: 0 0 auto;
  margin-bottom: 1.5rem;
}

.knobs-panel {
  flex: 1 1 auto;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding-top: 1.5rem;
}

@container (min-width: 600px) {
  .knobs-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}

.knobs-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  min-height: 5.5rem;
}

.knobs-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.knobs-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: t.$secondary-label;
}

.knobs-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.knobs-row-value {
  font-size: 0.72rem;
  color: t.$label;
  font-variant-numeric: tabular-nums;
  flex: 0 0 2.4rem;
  text-align: right;
}

.knobs-slider {
  flex: 1 1 auto;
  min-width: 0;
}
```

- [ ] **Step 4: Write the failing test**

Create `world-cards-config/world-cards-config.component.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsConfigComponent } from './world-cards-config.component';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';

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
};

describe('WorldCardsConfigComponent', () => {
  let store: WorldCardsConfigStore;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [WorldCardsConfigComponent] }).compileComponents();
    store = TestBed.inject(WorldCardsConfigStore);
  });

  function mount(ratio: number) {
    const fixture = TestBed.createComponent(WorldCardsConfigComponent);
    fixture.componentRef.setInput('ratio', ratio);
    fixture.detectChanges();
    return fixture;
  }

  it('the Time slider writes the size to the resolved band', () => {
    const fixture = mount(1.6); // 1.6 → lap band
    const slider = fixture.nativeElement.querySelector('[data-knob="time-size"]') as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(store.config('lap').sizes.time).toBe(1.5);
    expect(store.config('phone').sizes.time).toBe(1); // a different band keeps its own size
  });

  it('hides the Precision slider in 2-section mode', () => {
    store.setSectionModeAll('two');
    const fixture = mount(1.6);
    expect(fixture.nativeElement.querySelector('[data-knob="precision-size"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="time-size"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-knob="date-size"]')).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm run test:web -- --run world-cards-config.component`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/faces/world-cards/world-cards-config/
git commit -m "$(cat <<'EOF'
feat(web): add resolution-based World Cards Adjust panel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
EOF
)"
```

---

### Task 5: Card rewrite + face integration + registry

This is the integration task. The `CardComponent` input change (from `state` to `zone`/`sectionMode`/`span`) breaks the original face template, so the card and face are rewritten **together** to keep the build green. The face wires in the gear (Settings) and the Adjust panel, and the registry gains the `configComponent`.

**Files:**
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/card/card.component.ts`
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/card/card.component.html`
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/card/card.component.scss`
- Modify (replace): `apps/web/src/app/features/faces/world-cards/card/card.component.spec.ts`
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/world-cards-face.component.ts`
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/world-cards-face.component.html`
- Modify (rewrite): `apps/web/src/app/features/faces/world-cards/world-cards-face.component.scss`
- Modify (replace): `apps/web/src/app/features/faces/world-cards/world-cards-face.component.spec.ts`
- Modify: `apps/web/src/app/features/faces/face-registry.ts`

**Interfaces:**
- Consumes: `SectionMode`, `CardSpan` (Task 1); `WorldCardsConfigStore` (Task 2); `WorldCardsSettingsComponent` (Task 3); `WorldCardsConfigComponent` (Task 4); `clock-formatter` helpers; `ClockService`, `countryCodeForZone`, `FaceConfigService`, `ContainerSizeDirective`, `AutoHideDirective`, `FlagComponent`, `IconComponent`.
- Produces: `CardComponent` (inputs `zone`, `sectionMode`, `span`; host class `full`); `WorldCardsFaceComponent` (`ratio()`, `cards()`, `sectionMode()`, `styleVars()`, `settingsOpen`).

- [ ] **Step 1: Rewrite the card component class**

Replace `card/card.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ClockService } from '@core/clock.service';
import { countryCodeForZone } from '@core/zone-country';
import { FlagComponent } from '@shared/ui/flag/flag.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { bigTime, precise, gmtOffset, compactOffset, zoneCity } from '../../fullscreen/clock-formatter';
import { type SectionMode, type CardSpan } from '../world-cards-config';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlagComponent, IconComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  host: { '[class.full]': "span() === 'full'" },
})
export class CardComponent {
  private readonly clock = inject(ClockService);
  private readonly locale = navigator.language || 'en-US';

  readonly zone = input.required<string>();
  readonly sectionMode = input.required<SectionMode>();
  readonly span = input.required<CardSpan>();

  readonly now = this.clock.now;
  readonly countryCode = computed(() => countryCodeForZone(this.zone()));
  readonly big = computed(() => bigTime(this.now(), this.locale, this.zone()));
  readonly precision = computed(
    () => `${precise(this.now(), this.zone())} ${gmtOffset(this.now(), this.zone())}`,
  );
  readonly city = computed(() => zoneCity(this.zone(), true));
  readonly offset = computed(() => compactOffset(this.now(), this.zone()));
  // DatePipe cannot take an IANA zone; Intl can. "Jun 28, 2026" (uppercased in CSS).
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: this.zone(),
    }).format(this.now()),
  );
}
```

- [ ] **Step 2: Rewrite the card template**

Replace `card/card.component.html` with:

```html
<div class="card-row">
  <app-flag class="flag" [countryCode]="countryCode()" />
  <div class="times">
    <div class="time">
      <span class="digits">{{ big().digits }}</span>
      <span class="flank">
        @if (big().ampm; as ampm) { <span class="ampm">{{ ampm }}</span> }
        @if (sectionMode() === 'two') { <span class="seconds">{{ big().seconds }}</span> }
      </span>
    </div>
    @if (sectionMode() === 'three') {
      <div class="precision mono">{{ precision() }}</div>
    }
    <div class="date">
      <span class="cal">{{ dateLabel() }}</span>
      <span class="sep">·</span>
      <span class="city">{{ city() }}</span>
      <span class="sep">·</span>
      <span class="offset"><app-icon class="globe" name="globe" />{{ offset() }}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Rewrite the card styles**

Replace `card/card.component.scss` with:

```scss
:host {
  display: block;
}
// Full-row cards span every grid column; cell cards take a single auto-fit slot.
:host(.full) {
  grid-column: 1 / -1;
}

.card-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid #fff;
}

.flag {
  flex: 0 0 auto;
  width: calc(70px * var(--wc-time-scale, 1));
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  overflow: hidden;
}

.times {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
}

// Big time: digits + a left-aligned flank (AM/PM near the cap, seconds
// bottom-anchored). Seconds share AM/PM's size, just dimmed.
.time {
  display: flex;
  align-items: flex-start;
  gap: 0.06em;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}
.digits {
  font-size: calc(3.4rem * var(--wc-time-scale, 1));
  font-weight: 250;
  letter-spacing: -0.01em;
}
.flank {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.ampm {
  font-size: calc(0.85rem * var(--wc-time-scale, 1));
  font-weight: 300;
  letter-spacing: 0.15em;
  opacity: 0.85;
  margin-top: 0.4em;
}
.seconds {
  font-size: calc(0.85rem * var(--wc-time-scale, 1));
  font-weight: 300;
  letter-spacing: 0.15em;
  opacity: 0.32;
  margin-top: auto;
}

.precision {
  margin-top: 0.3rem;
  font-size: calc(1.15rem * var(--wc-precision-scale, 1));
  opacity: 0.9;
  white-space: nowrap;
}

.date {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  margin-top: 0.3rem;
  font-size: calc(0.9rem * var(--wc-date-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.7;
  white-space: nowrap;
}
.date .sep {
  opacity: 0.5;
}
.offset {
  white-space: nowrap;
}
.globe {
  width: 0.82em;
  height: 0.82em;
  vertical-align: -0.1em;
  margin-right: 0.12em;
}

// Cross-platform monospace stack for the precision row.
.mono {
  font-family:
    'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Replace the card spec**

Replace `card/card.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { ClockService } from '@core/clock.service';

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
};

// 2026-06-17T16:41:00Z = 9:41 AM in Los Angeles (PDT, −7), 22:11 in Kolkata (+5:30).
const fixed = new Date('2026-06-17T16:41:00Z');

function make(zone: string, sectionMode: 'three' | 'two', span: 'full' | 'cell') {
  const fixture = TestBed.createComponent(CardComponent);
  fixture.componentRef.setInput('zone', zone);
  fixture.componentRef.setInput('sectionMode', sectionMode);
  fixture.componentRef.setInput('span', span);
  fixture.detectChanges();
  return fixture;
}

describe('CardComponent', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    TestBed.inject(ClockService).setMock(fixed);
  });

  it('renders the precision row in 3-section and omits it in 2-section', () => {
    expect(make('America/Los_Angeles', 'three', 'cell').nativeElement.querySelector('.precision')).toBeTruthy();
    expect(make('America/Los_Angeles', 'two', 'cell').nativeElement.querySelector('.precision')).toBeNull();
  });

  it('shows seconds in the main only in 2-section', () => {
    expect(make('America/Los_Angeles', 'three', 'cell').nativeElement.querySelector('.seconds')).toBeNull();
    expect(make('America/Los_Angeles', 'two', 'cell').nativeElement.querySelector('.seconds')).toBeTruthy();
  });

  it('shows the abbreviated city and a globe + compact offset in the date row', () => {
    const el = make('America/Los_Angeles', 'three', 'cell').nativeElement as HTMLElement;
    expect(el.querySelector('.date .city')?.textContent?.trim()).toBe('LA');
    expect(el.querySelector('.date .offset app-icon.globe')).toBeTruthy();
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('−7');
  });

  it('keeps the minutes for sub-hour offsets', () => {
    const el = make('Asia/Kolkata', 'three', 'cell').nativeElement as HTMLElement;
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('+5:30');
  });

  it('derives the flag country from the zone', () => {
    const img = make('Asia/Seoul', 'three', 'cell').nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('flags/1x1/kr.svg');
  });

  it('adds the full host class only for full-row cards', () => {
    expect((make('Asia/Seoul', 'three', 'full').nativeElement as HTMLElement).classList.contains('full')).toBe(true);
    expect((make('Asia/Seoul', 'three', 'cell').nativeElement as HTMLElement).classList.contains('full')).toBe(false);
  });
});
```

- [ ] **Step 5: Rewrite the face component class**

Replace `world-cards-face.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ContainerSizeDirective } from '@shared/ui/container-size/container-size.directive';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FaceConfigService } from '@core/face-config.service';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { CardComponent } from './card/card.component';
import { WorldCardsSettingsComponent } from './world-cards-settings/world-cards-settings.component';
import { WorldCardsConfigComponent } from './world-cards-config/world-cards-config.component';

@Component({
  selector: 'app-world-cards-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    WorldCardsSettingsComponent,
    WorldCardsConfigComponent,
    AutoHideDirective,
    IconComponent,
  ],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './world-cards-face.component.html',
  styleUrl: './world-cards-face.component.scss',
})
export class WorldCardsFaceComponent implements OnDestroy {
  private readonly size = inject(ContainerSizeDirective);
  protected readonly store = inject(WorldCardsConfigStore);
  protected readonly faceConfig = inject(FaceConfigService);

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activeFields = computed(() => this.store.fieldsFor(this.ratio()));
  readonly cards = computed(() => this.activeFields().cards);
  readonly sectionMode = computed(() => this.activeFields().sectionMode);

  readonly styleVars = computed<Record<string, string>>(() => {
    const s = this.activeFields().sizes;
    return {
      '--wc-time-scale': `${s.time}`,
      '--wc-precision-scale': `${s.precision}`,
      '--wc-date-scale': `${s.date}`,
      // Min cell width scales with the Time size: bigger clocks → fewer, wider columns.
      '--wc-cell-min': `calc(16rem * ${s.time})`,
    };
  });

  // Settings (gear) is owned locally; Adjust is driven by the shell via faceConfig.
  readonly settingsOpen = signal(false);

  ngOnDestroy(): void {
    this.faceConfig.open.set(false);
    this.faceConfig.adjustOpen.set(false);
  }

  openSettings(): void {
    this.settingsOpen.set(true);
    this.faceConfig.open.set(true);
  }
  closeSettings(): void {
    this.settingsOpen.set(false);
    this.faceConfig.open.set(false);
  }
  closeAdjust(): void {
    this.faceConfig.adjustOpen.set(false);
    this.faceConfig.open.set(false);
  }
}
```

- [ ] **Step 6: Rewrite the face template**

Replace `world-cards-face.component.html` with:

```html
<div class="cards" [style]="styleVars()">
  @for (card of cards(); track card.id) {
    <app-card [zone]="card.zone" [sectionMode]="sectionMode()" [span]="card.span" />
  }
</div>
<button
  appAutoHide
  #ah="autoHide"
  [revealBlocked]="faceConfig.open()"
  type="button"
  class="gear"
  [class.hidden]="!ah.visible()"
  (click)="openSettings()"
  aria-label="World Cards settings"
  title="World Cards settings"
>
  <app-icon name="gearshape" />
</button>
@if (settingsOpen()) {
  <app-world-cards-settings (closed)="closeSettings()" />
}
@if (faceConfig.adjustOpen()) {
  <app-world-cards-config [ratio]="ratio()" (closed)="closeAdjust()" />
}
```

- [ ] **Step 7: Rewrite the face styles**

Replace `world-cards-face.component.scss` with:

```scss
:host {
  display: block;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #000;
  // React to the face's OWN width (not the window) so the layout is correct
  // full-screen AND inside the scaled face-picker preview.
  container-type: inline-size;
}

.cards {
  display: grid;
  // Cell cards auto-fit into as many columns as the width allows; --wc-cell-min
  // scales with the Time size. Full-row cards span every column (set in the card).
  grid-template-columns: repeat(auto-fit, minmax(var(--wc-cell-min, 16rem), 1fr));
  align-content: start;
  // Small inset so content/borders aren't hard against the edges.
  padding: 0 0.5rem;
  // Horizontal gutter between cells in a multi-column row.
  column-gap: 1.5rem;
}

// Bottom-right gear: opens the Settings panel. Auto-hides with the other
// on-face controls.
.gear {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: rgba(30, 30, 30, 0.85);
  color: #eee;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
  opacity: 1;
  transition:
    opacity 0.3s ease,
    transform 0.12s ease,
    background 0.2s ease;

  &:hover {
    background: rgba(45, 45, 45, 0.9);
  }

  &:active {
    transform: scale(0.93);
  }

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
}
```

- [ ] **Step 8: Replace the face spec**

Replace `world-cards-face.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsFaceComponent } from './world-cards-face.component';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { FaceConfigService } from '@core/face-config.service';

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
};

describe('WorldCardsFaceComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [WorldCardsFaceComponent] }).compileComponents();
  });

  it('renders one card per configured zone, full cards spanning the grid', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-card');
    expect(cards).toHaveLength(3); // default US/UK/KR
    // The first default card is full-row.
    expect((cards[0] as HTMLElement).classList.contains('full')).toBe(true);
    expect((cards[1] as HTMLElement).classList.contains('full')).toBe(false);
  });

  it('opens the Settings panel from the gear', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-settings')).toBeNull();
    (fixture.nativeElement.querySelector('.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-settings')).toBeTruthy();
  });

  it('renders the Adjust panel when faceConfig.adjustOpen() is set', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-config')).toBeNull();
    TestBed.inject(FaceConfigService).adjustOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-config')).toBeTruthy();
  });

  it('styleVars reflects the active band sizes', () => {
    const store = TestBed.inject(WorldCardsConfigStore);
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    // jsdom host has 0 size → ratio 1 → 'tall' band.
    store.setSize('tall', 'time', 1.5);
    fixture.detectChanges();
    expect(fixture.componentInstance.styleVars()['--wc-time-scale']).toBe('1.5');
  });
});
```

- [ ] **Step 9: Register the configComponent**

Replace `apps/web/src/app/features/faces/face-registry.ts` with:

```ts
import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { FullscreenConfigComponent } from './fullscreen/fullscreen-config/fullscreen-config.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';
import { WorldCardsConfigComponent } from './world-cards/world-cards-config/world-cards-config.component';
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
  {
    id: 'world-cards',
    displayName: 'World Cards',
    component: WorldCardsFaceComponent,
    configComponent: WorldCardsConfigComponent,
  },
  { id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
```

- [ ] **Step 10: Run all World Cards tests**

Run: `npm run test:web -- --run world-cards`
Expected: PASS — presets, store, settings, config, card, and face specs all green.

- [ ] **Step 11: Build to confirm a green tree**

Run: `npm run build:web`
Expected: "Application bundle generation complete." with no errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/app/features/faces/world-cards/card/ \
  apps/web/src/app/features/faces/world-cards/world-cards-face.component.ts \
  apps/web/src/app/features/faces/world-cards/world-cards-face.component.html \
  apps/web/src/app/features/faces/world-cards/world-cards-face.component.scss \
  apps/web/src/app/features/faces/world-cards/world-cards-face.component.spec.ts \
  apps/web/src/app/features/faces/face-registry.ts
git commit -m "$(cat <<'EOF'
feat(web): make World Cards config-driven with gear + Adjust panels

- Card renders 2-/3-section content from clock-formatter (abbreviated
  zone city + globe compact offset)
- Auto-fit grid (full-row vs cell), per-band sizes via the face ratio
- Local gear opens Settings; shell Adjust button renders the size panel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
EOF
)"
```

---

## Notes for the implementer

- The `tokens` SCSS namespace (`@use 'tokens' as t;`) resolves via the existing `stylePreprocessorOptions` include path used by the Fullscreen panels — no extra config needed.
- `ClockService.setMock(date)` freezes `now()` for deterministic time assertions (used in the card spec).
- `npm run build:web` after Task 5 is the completion gate. Tasks 1–4 each leave the tree building, so `test:web` passes at every task.
- After all tasks: manually verify across aspect ratios (full-screen and the face-picker preview) that full-row/cell packing, the gear, and both panels behave — per the repo's "faces look great in any dimension" rule.
