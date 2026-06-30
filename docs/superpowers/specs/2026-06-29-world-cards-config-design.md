# World Cards: Settings + Adjust, Config-Driven Cards — Design

**Date:** 2026-06-29
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` — `features/faces/world-cards`, `features/faces/face-registry`, reuses `features/faces/fullscreen/clock-formatter`, `core/zone-*`, `shared/ui`

## Goal

Turn the World Cards face from a static, hardcoded list (US/UK/KR, fixed
featured-on-top layout) into a configurable face with **two panels — Settings
and Adjust — mirroring the Fullscreen face**:

- **Settings** (the face's gear): manage the list of clocks — how many cards,
  each card's time zone, each card's width (**full row** vs **cell**), and a
  global **section mode** (3-section vs 2-section).
- **Adjust** (the shell controls-bar button): three font-size sliders — **main**
  (clock), **subtitle** (precision + GMT), **info** (date + zone name).
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
4. **Font sizes are GLOBAL** (three tiers), not per-card and not per-viewport
   band.
5. **Config is a single global object**, persisted to `localStorage`. Not
   `BandConfigStore` (nothing here is responsive-per-band; responsiveness is
   handled in CSS).
6. **Responsive layout is pure CSS Grid** (`auto-fit` + `minmax`), no JS
   measurement. Container queries already keep it correct full-screen and inside
   the scaled face-picker preview.

### Visual direction (locked via mockups)

- **Big-time (2-section main):** the Fullscreen "digits + flank" — AM/PM near
  the top cap, seconds bottom-anchored, **left-aligned**. **Seconds use the same
  font size as AM/PM**, dimmed to ~`0.32` opacity. *(This is a deliberate
  divergence from the Fullscreen face, where seconds are smaller (`0.10em`) than
  AM/PM (`0.15em`).)*
- **Font:** System / SF Pro via `system-ui` (the app default). Big time + info
  use it; the precision subtitle keeps the existing mono stack.
- **3-section main:** same AM/PM treatment, **no seconds** (seconds live in the
  precision subtitle).
- **Default layout seed:** *Featured + pair* — first card full-row, the rest
  cells — matching today's look. Fully overridable per-card.

## Architecture

New files under `features/faces/world-cards/`:

```
world-cards-config.ts                       — types
world-cards-config-store.service.ts         — signal store + persistence
world-cards-presets.data.ts                 — default seed
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

export interface WorldCardsConfig {
  version: number;
  sectionMode: SectionMode;
  sizes: { main: number; subtitle: number; info: number }; // 0.5–2.0, default 1.0
  cards: WorldCardConfig[];
}

export const MIN_CARDS = 1;
export const MAX_CARDS = 12;
```

### Store (`WorldCardsConfigStore`, `providedIn: 'root'`)

A small signal-backed store (NOT `BandConfigStore`). Responsibilities:

- Load from `localStorage` key `allyclock.world-cards.config`; on parse failure
  or absence, seed from `buildDefaultConfig()` and persist.
- `migrate()` by `version`: fill any missing fields from defaults (e.g. a future
  field), never wipe a user's card list; bump version and re-persist when shape
  changes. Initial `version: 1`.
- Expose readonly selectors: `cards()`, `sectionMode()`, `sizes()`.
- Mutations (each commits + persists, applied live):
  - `addCard()` — append `{ id: nextId, zone: <local zone>, span: 'cell' }`;
    no-op at `MAX_CARDS`.
  - `removeCard(id)` — splice; no-op at `MIN_CARDS`.
  - `setCardZone(id, zone)`, `setCardSpan(id, span)`.
  - `setSectionMode(mode)`, `setSize('main'|'subtitle'|'info', value)`.
- `id` allocation: a monotonic counter derived from `max(existing ids) + 1` at
  load, so ids stay stable across a session and persist.

### Defaults (`world-cards-presets.data.ts`)

```ts
buildDefaultConfig(): WorldCardsConfig => ({
  version: 1,
  sectionMode: 'three',
  sizes: { main: 1, subtitle: 1, info: 1 },
  cards: [
    { id: 1, zone: 'America/Los_Angeles', span: 'full' }, // US, featured
    { id: 2, zone: 'Europe/London',        span: 'cell' },
    { id: 3, zone: 'Asia/Seoul',           span: 'cell' },
  ],
})
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
  - Calendar date (`MMM d, y`) via `DatePipe` (already a dependency), then
    `· {{ zoneCity }}`.

Render per `sectionMode`:

- **`'three'` (current style):**
  - main: `digits` + `ampm` (no seconds), Fullscreen flank.
  - subtitle: `precise` + `gmtOffset` (mono), e.g. `20:09:05.27 GMT−07:00`.
  - info: `MMM d, y` + `· {{ zoneCity }}`, e.g. `JUN 28 · LA`.
- **`'two'`:**
  - main: `digits` + flank (`ampm` over `seconds`, left-aligned, equal size,
    seconds dimmed).
  - info: same as above. No subtitle.

Font scales come from CSS custom properties set by the face on the grid
container (`--wc-main-scale`, `--wc-subtitle-scale`, `--wc-info-scale`); the card
SCSS multiplies its base sizes by them (mirrors Fullscreen's `varsFor`). Font
family is `system-ui` for main/info; the subtitle keeps the existing `.mono`
stack.

## Settings panel (the gear — local to the face)

`WorldCardsSettingsComponent`, rendered in a bottom sheet (`app-sheet`, close =
apply), opened by an auto-hiding bottom-right **gear** on the face (same pattern,
directives, and `revealBlocked` wiring as the Fullscreen gear).

Contents:

- **Nav header** with an `xmark` close button.
- **Layout** section: a segmented control `3 Sections | 2 Sections` →
  `setSectionMode`.
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

## Adjust panel (shell controls-bar button)

`WorldCardsConfigComponent` is the registry `configComponent`; it renders when
`faceConfig.adjustOpen()` is true (set by the shell's Adjust button, exactly like
Fullscreen). It mirrors `fullscreen-config.component` structure:

- Sliders (range `0.5–2.0`, step `0.05`, live, with a numeric readout):
  **Main**, **Subtitle**, **Info** → `setSize(…)`.
- The **Subtitle** slider is hidden when `sectionMode() === 'two'` (no subtitle
  exists in that mode).

## Renderer & responsive layout

`WorldCardsFaceComponent` injects `WorldCardsConfigStore`, `FaceConfigService`,
and `ClockService`. Template:

```html
<div class="cards" [style]="styleVars()">
  @for (card of cards(); track card.id) {
    <app-card [zone]="card.zone" [span]="card.span" [sectionMode]="sectionMode()" />
  }
</div>
<button class="gear" appAutoHide …>…</button>
@if (settingsOpen()) { <app-world-cards-settings (closed)="closeSettings()" /> }
@if (faceConfig.adjustOpen()) { <app-world-cards-config (closed)="closeAdjust()" /> }
```

- `.cards` is `display: grid; grid-template-columns: repeat(auto-fit,
  minmax(var(--wc-cell-min), 1fr));` `--wc-cell-min` scales with the **main**
  size setting (bigger clocks → fewer, wider columns). `.full` cards get
  `grid-column: 1 / -1`. `align-content: start`, a small inset, `column-gap`
  between cells (mirroring today's gutters).
- `:host { container-type: inline-size; overflow-y: auto; }` stays, so the grid
  reacts to the face's own width (full-screen and in the scaled preview).
- `styleVars()` (a `computed`) emits the three `--wc-*-scale` vars and
  `--wc-cell-min` from `sizes()`.
- Panel/controls coordination matches Fullscreen: opening Settings or Adjust
  sets `faceConfig.open` (hides the controls bar); closing clears it;
  `ngOnDestroy` resets `faceConfig.open`/`adjustOpen`.

### Apple-port note

The SwiftUI port renders this with a `LazyVGrid` whose column count is computed
from the available width (the divergence the porting guide expects); full-row
cards use a single-column section. The data model (`WorldCardsConfig`) ports 1:1.

## Testing

Vitest specs alongside each unit:

- **Store:** default shape; `addCard`/`removeCard` with `MIN`/`MAX` guards;
  `setCardZone`/`setCardSpan`/`setSectionMode`/`setSize`; persistence round-trip;
  version migration fills missing fields without dropping cards.
- **Card:** 3-section renders subtitle, 2-section omits it; seconds appear in the
  main only in 2-section; abbreviated zone (`LA`); flag country derived from
  zone; `.full` host class when `span === 'full'`.
- **Settings:** Add appends (and is disabled at MAX); remove (and last-card
  guard); span toggle writes; section-mode segmented control writes; zone-picker
  open→pick updates the right card.
- **Adjust:** each slider writes its size; Subtitle slider hidden in 2-section.
- **Face:** renders N cards; gear opens Settings; Adjust renders via
  `faceConfig.adjustOpen()`; `styleVars()` reflects `sizes()`.
- Time-dependent assertions use fixed `Date` values (repo testing guidance).

## Out of scope (YAGNI)

Per-card section mode; per-card font sizes; drag-reordering; per-viewport-band
config; a "featured card auto-sizes larger" rule (full-row cards simply have more
room — no special sizing logic). All deferrable without reworking this model.
