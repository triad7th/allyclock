# World Cards: Settings + Adjust, Config-Driven Cards — Design

**Date:** 2026-06-29
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` — `features/faces/world-cards`, `features/faces/face-registry`, reuses `features/faces/fullscreen/clock-formatter`, `core/dimensions`, `core/zone-*`, `shared/ui`

## Goal

Turn the World Cards face from a static, hardcoded list (US/UK/KR, fixed
featured-on-top layout) into a configurable face with **two panels — Settings
and Adjust — mirroring the Fullscreen face**:

- **Settings** (the face's gear): manage the list of clocks — how many cards,
  each card's time zone, each card's width (**full row** vs **cell**), and a
  global **section mode** (3-section vs 2-section).
- **Adjust** (the shell controls-bar button): three **resolution-based**
  font-size sliders — **Time** (clock), **Precision** (`HH:mm:ss.cc` + GMT),
  **Date** (date + zone name + compact globe offset) — tuned per dimension band,
  like Fullscreen.
- A **responsive grid renderer** that auto-fits *cell* cards into as many
  columns as the container width allows, with *full-row* cards spanning all
  columns.

The face becomes config-driven and persists to `localStorage`, the same
discipline as the Fullscreen config.

## Decisions (from brainstorm)

1. **Section mode is GLOBAL**, not per-card. One choice applies to every card
   (`'three' | 'two'`). Simpler model, uniform look.
2. **Card width is per-card**: `'full'` (spans the whole row) or `'cell'`
   (joins the auto-fit column grid). The renderer computes the column count from
   the container width; the user does **not** pick column counts.
3. **Zone name uses the Fullscreen city style, abbreviated** — `zoneCity(zone,
   true)` → `LA` / `LON` / `SEO`. The card always shows a large flag separately,
   so the abbreviation is enough. (Not the GMT/`zzzz` style used today.)
4. **Font sizes are RESOLUTION-BASED** (per dimension band), not a single global
   value. The three tiers (Time / Precision / Date) are tuned per band exactly
   like the Fullscreen Adjust panel, so adjusting at one viewport size does not
   change another.
5. **Config reuses `BandConfigStore` + `DimensionRegistry`** (mirroring
   Fullscreen), so the port stays mechanical. The **card list and section mode
   are global**, stored by broadcasting the same value to every band (the
   established Fullscreen pattern for "applies to all"); the **sizes are
   per-band**.
6. **Responsive column packing is pure CSS Grid** (`auto-fit` + `minmax`), no JS
   measurement. Container queries keep it correct full-screen and inside the
   scaled face-picker preview. (Band resolution drives font *sizes*; CSS
   auto-fit drives *column count* — complementary.)

### Visual direction (locked via mockups)

- **Big-time (2-section main):** the Fullscreen "digits + flank" — AM/PM near
  the top cap, seconds bottom-anchored, **left-aligned**. **Seconds use the same
  font size as AM/PM**, dimmed to ~`0.32` opacity. *(This is a deliberate
  divergence from the Fullscreen face, where seconds are smaller (`0.10em`) than
  AM/PM (`0.15em`).)*
- **Font:** System / SF Pro via `system-ui` (the app default). Big time + date
  use it; the precision row keeps the existing mono stack.
- **3-section main:** same AM/PM treatment, **no seconds** (seconds live in the
  precision row).
- **Default layout seed:** *Featured + pair* — first card full-row, the rest
  cells — matching today's look. Fully overridable per-card.

## Architecture

New/rewritten files under `features/faces/world-cards/`:

```text
world-cards-config.ts                       — types
world-cards-config-store.service.ts         — BandConfigStore subclass + mutations
world-cards-presets.data.ts                 — per-band default seed
world-cards-face.component.{ts,html,scss}   — renderer (existing, rewritten)
card/card.component.{ts,html,scss}          — config-driven card (existing, rewritten)
world-cards-settings/                        — Settings panel (gear)
  world-cards-settings.component.{ts,html,scss}
world-cards-config/                          — Adjust panel (sliders)
  world-cards-config.component.{ts,html,scss}
```

Registry: add `configComponent: WorldCardsConfigComponent` to the `world-cards`
`FaceDescriptor` so the shell renders the Adjust button for this face.

### Data model (`world-cards-config.ts`)

```ts
export type SectionMode = 'three' | 'two';
export type CardSpan = 'full' | 'cell';

export interface WorldCardConfig {
  id: number;        // stable key for @for tracking / future reorder
  zone: string;      // IANA id, e.g. 'America/Los_Angeles'
  span: CardSpan;
}

export interface WorldCardSizes {
  time: number;       // 0.5–2.0, default 1.0
  precision: number;  // 0.5–2.0, default 1.0
  date: number;       // 0.5–2.0, default 1.0
}

// Per-band fields. `sectionMode` + `cards` are GLOBAL — broadcast identically to
// every band (read from any band). `sizes` is per-band (resolution-based).
export interface WorldCardsFields {
  sectionMode: SectionMode;
  cards: WorldCardConfig[];
  sizes: WorldCardSizes;
}

export const MIN_CARDS = 1;
export const MAX_CARDS = 12;
```

### Store (`WorldCardsConfigStore extends BandConfigStore<WorldCardsFields>`)

Mirrors `FullscreenConfigStore`:

- `storageKey(): 'allyclock.world-cards.config'`, `version(): 1`.
- `buildDefaults()` → one `WorldCardsFields` per band id (band ids from
  `BUILT_IN_BANDS`, same as Fullscreen). `sectionMode` + `cards` identical across
  all bands; `sizes` all `{ time: 1, precision: 1, date: 1 }`.
- `fieldsFor(ratio)` → `config(registry.resolveForRatio(ratio).id)` (injects
  `DimensionRegistry`), exactly like Fullscreen.
- `sample()` → any band's fields, for reading the global `cards` / `sectionMode`.
- **Global mutations broadcast** via `patchAll` (write to every band):
  `setSectionModeAll(mode)`, `addCard()` (append `{ id: nextId(), zone: <local
  zone>, span: 'cell' }`, no-op at `MAX_CARDS`), `removeCard(id)` (no-op at
  `MIN_CARDS`), `setCardZone(id, zone)`, `setCardSpan(id, span)`.
- **Per-band size mutation** via `patch(bandId, …)`: `setSize(bandId, 'time' |
  'precision' | 'date', value)`.
- `mergeBand(defaults, persisted)` fills any missing field from defaults (e.g.
  a new size key) without dropping the user's card list; bump version + re-persist
  on shape change (inherited additive `migrate`).
- `id` allocation: monotonic counter seeded from `max(existing card ids) + 1` at
  load (ids are global, so derive from any band's `cards`).

### Defaults (`world-cards-presets.data.ts`)

```ts
const DEFAULT_CARDS: WorldCardConfig[] = [
  { id: 1, zone: 'America/Los_Angeles', span: 'full' }, // US, featured
  { id: 2, zone: 'Europe/London',        span: 'cell' },
  { id: 3, zone: 'Asia/Seoul',           span: 'cell' },
];

// buildDefaultFields(): Record<bandId, WorldCardsFields> — every band gets the
// same DEFAULT_CARDS (deep-cloned) + sectionMode 'three' + sizes all 1.0.
```

Country/flag derives from the zone via `countryCodeForZone(zone)` (same helper
the Fullscreen face uses), dropping the old `state`→region (`'US'`/`'UK'`/`'KR'`)
indirection through `LocationService`. `LocationService` is untouched (still used
elsewhere). Note: the UK seed becomes `Europe/London` (DST-aware), replacing
today's `UTC` simplification — a deliberate, minor behavior change.

## Card component (config-driven)

`CardComponent` becomes presentational and driven by inputs:

- **Inputs:** `zone: string`, `sectionMode: SectionMode`, `span: CardSpan`.
- **Host:** sets `grid-column: 1 / -1` when `span === 'full'` (via a host class
  `.full`), so the grid item spans every column.
- **Flag:** `<app-flag [countryCode]="countryCodeForZone(zone)" />` (globe
  fallback for countryless zones such as UTC).
- **Time formatting reuses `clock-formatter` helpers** (consistency + porting),
  replacing the current `DatePipe` strings:
  - `bigTime(now, locale, zone)` → `{ digits, ampm, seconds }`.
  - `precise(now, zone)` → `HH:mm:ss.cc`; `gmtOffset(now, zone)` → `GMT−07:00`.
  - `zoneCity(zone, true)` → abbreviated city (`LA`).
  - `compactOffset(now, zone)` → `−7` / `+9` / `+5:30` (minutes only when the
    zone isn't on a whole hour), rendered with a leading globe `app-icon` — the
    same globe + compact-offset treatment as the Fullscreen date row.
  - Calendar date (`MMM d, y`) via `DatePipe` (already a dependency), then
    `· {{ zoneCity }}`.

Render per `sectionMode`:

- **`'three'` (current style):**
  - **Time** tier: `digits` + `ampm` (no seconds), Fullscreen flank.
  - **Precision** tier: `precise` + `gmtOffset` (mono), e.g.
    `20:09:05.27 GMT−07:00` (keeps the full technical GMT).
  - **Date** tier: `MMM d, y` + `· {{ zoneCity }}` + `· 🌐{{ compactOffset }}`,
    e.g. `JUN 28 · LA · 🌐−7`.
- **`'two'`:**
  - **Time** tier: `digits` + flank (`ampm` over `seconds`, left-aligned, equal
    size, seconds dimmed).
  - **Date** tier: same as above (`JUN 28 · LA · 🌐−7`). No precision row — the
    Date row's globe offset is the only zone-offset indicator in this mode.

Font scales come from CSS custom properties set by the face on the grid
container (`--wc-time-scale`, `--wc-precision-scale`, `--wc-date-scale`); the card
SCSS multiplies its base sizes by them (mirrors Fullscreen's `varsFor`). Font
family is `system-ui` for Time/Date; the Precision tier keeps the existing
`.mono` stack.

## Settings panel (the gear — local to the face)

`WorldCardsSettingsComponent`, rendered in a bottom sheet (`app-sheet`, close =
apply), opened by an auto-hiding bottom-right **gear** on the face (same pattern,
directives, and `revealBlocked` wiring as the Fullscreen gear).

Contents:

- **Nav header** with an `xmark` close button.
- **Layout** section: a segmented control `3 Sections | 2 Sections` →
  `setSectionModeAll`.
- **Cities** section: a vertical list, one row per card —
  - a zone button (flag + abbreviated city) that opens a `ZonePickerComponent`
    sub-view (same open→pick→close flow as the Fullscreen toggles' zone picker);
    pick → `setCardZone(id, …)`.
  - a `Full row | Cell` segmented toggle → `setCardSpan(id, …)`.
  - a `trash` icon-button → `removeCard(id)`, disabled when `cards().length ===
    MIN_CARDS`.
  - an **+ Add City** button appends a card (default zone = local zone, span
    `cell`), disabled at `MAX_CARDS`.
- No drag-reordering in v1 (order = insertion order). The `id` field is in place
  so reordering can be added later without a data migration.

## Adjust panel (shell controls-bar button, resolution-based)

`WorldCardsConfigComponent` is the registry `configComponent`; it renders when
`faceConfig.adjustOpen()` is true (set by the shell's Adjust button, exactly like
Fullscreen). It takes a `ratio` input from the face and resolves the **active
dimension band** from it (via `DimensionRegistry`), then reads/writes **that
band's** sizes — so the sliders are resolution-based. Mirrors
`fullscreen-config.component` structure:

- Sliders (range `0.5–2.0`, step `0.05`, live, with a numeric readout):
  **Time**, **Precision**, **Date** → `setSize(activeBandId, …)`.
- The **Precision** slider is hidden when `sectionMode() === 'two'` (no precision
  row exists in that mode).

## Renderer & responsive layout

`WorldCardsFaceComponent` injects `WorldCardsConfigStore`, `FaceConfigService`,
and `ClockService`, and uses the `ContainerSizeDirective` host directive (like
Fullscreen) to measure its own width/height → `ratio` → active band. Template:

```html
<div class="cards" [style]="styleVars()">
  @for (card of cards(); track card.id) {
    <app-card [zone]="card.zone" [span]="card.span" [sectionMode]="sectionMode()" />
  }
</div>
<button class="gear" appAutoHide …>…</button>
@if (settingsOpen()) { <app-world-cards-settings (closed)="closeSettings()" /> }
@if (faceConfig.adjustOpen()) {
  <app-world-cards-config [ratio]="ratio()" (closed)="closeAdjust()" />
}
```

- `activeFields = computed(() => store.fieldsFor(ratio()))`; `cards`,
  `sectionMode`, and `sizes` read from it (cards/sectionMode are band-invariant
  because broadcast).
- `.cards` is `display: grid; grid-template-columns: repeat(auto-fit,
  minmax(var(--wc-cell-min), 1fr));` `--wc-cell-min` scales with the **Time**
  size of the active band (bigger clocks → fewer, wider columns). `.full` cards
  get `grid-column: 1 / -1`. `align-content: start`, a small inset, `column-gap`
  between cells (mirroring today's gutters).
- `:host { container-type: inline-size; overflow-y: auto; }` stays, so the grid
  reacts to the face's own width (full-screen and in the scaled preview).
- `styleVars()` (a `computed`) emits `--wc-time-scale`, `--wc-precision-scale`,
  `--wc-date-scale`, and `--wc-cell-min` from the active band's `sizes`.
- Panel/controls coordination matches Fullscreen: opening Settings or Adjust
  sets `faceConfig.open` (hides the controls bar); closing clears it;
  `ngOnDestroy` resets `faceConfig.open`/`adjustOpen`.

### Apple-port note

The SwiftUI port renders this with a `LazyVGrid` whose column count is computed
from the available width (the divergence the porting guide expects); full-row
cards use a single-column section. The `WorldCardsFields` model and per-band
sizing port 1:1 onto the existing band machinery.

## Testing

Vitest specs alongside each unit:

- **Store:** default shape (one fields object per band id); `addCard`/`removeCard`
  with `MIN`/`MAX` guards broadcast to every band; `setCardZone`/`setCardSpan`/
  `setSectionModeAll` broadcast; `setSize(band, …)` writes only that band;
  persistence round-trip; migration fills missing fields without dropping cards.
- **Card:** 3-section renders the precision row, 2-section omits it; seconds
  appear in the Time tier only in 2-section; abbreviated zone (`LA`); Date row
  shows the globe icon + compact offset (`−7`, minutes only when needed — assert
  a whole-hour and a `:30` zone); flag country derived from zone; `.full` host
  class when `span === 'full'`.
- **Settings:** Add appends (disabled at MAX); remove (and last-card guard); span
  toggle writes; section-mode segmented control writes; zone-picker open→pick
  updates the right card.
- **Adjust:** each slider writes its size to the resolved band; a different band
  (different ratio) keeps its own sizes; Precision slider hidden in 2-section.
- **Face:** renders N cards; gear opens Settings; Adjust renders via
  `faceConfig.adjustOpen()`; `styleVars()` reflects the active band's sizes;
  different ratios resolve different bands.
- Time-dependent assertions use fixed `Date` values (repo testing guidance).

## Out of scope (YAGNI)

Per-card section mode; per-card font sizes; per-band card lists or spans;
drag-reordering; a "featured card auto-sizes larger" rule (full-row cards simply
have more room — no special sizing logic). All deferrable without reworking this
model.
