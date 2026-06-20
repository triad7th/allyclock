# App-Wide Dimension Config + Overlays — Design

**Date:** 2026-06-19
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` (Angular 21 web app)

## Goal

Generalize the Fullscreen face's ratio-band "preset" concept into an app-wide
system, and surface two app-wide overlays:

1. **Per-dimension config, app-wide** — one shared registry of ratio bands
   (the current `BUILT_IN_PRESETS`) that any face can vary against.
2. **Per-face config fields** — each face declares its own knobs, tuned per band.
3. **Top-left label on every face** — `840 × 400 · MINI` (W×H · band name).
4. **Top-right LIVE/MOCK indicator on every face** — legible on dark and light
   backgrounds.

## Decisions (from brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| Scope | How much to build now | **Framework + Fullscreen migration only.** Schedule/World Cards get the overlays for free but keep their current config; they can adopt per-dimension fields later. |
| Bands | One shared set or per-face | **Shared app-wide registry.** The 8 bands are global; resolved once at the shell. Each face attaches a config map keyed by band id. |
| Chip form | LIVE/MOCK visual | **Dot + text**, green **LIVE** / amber **MOCK** (amber = "heads-up, not real time"). |
| Chip behavior | Persistence | **Auto-hide always**, fading with the label and controls. |
| Legibility | Dark + light coverage | **Glow** — white text + strong dark `text-shadow` halo; dot carries a dark-haloed glow. |

## Architecture

The fullscreen store today bundles **band boundaries** and **style fields** in a
single `FullscreenPreset`. The refactor splits these into two independent units:
a shared **registry** of band boundaries, and per-face **config maps** of style
fields keyed by band id. The app shell owns a single dimension/size source that
drives both the overlays and each face's band selection.

Per the repo's Apple-port rule (root `CLAUDE.md` "Platform Porting Goal";
memory `web-mirrors-apple-platforms`), each new unit is shaped to map 1:1 onto a
SwiftUI port: the registry → a `Codable` band list service; `BandConfigStore<T>`
→ a generic store generic over a `Codable` field struct; the overlay → a SwiftUI
overlay view reading an `isMocked` published property.

### 1. `DimensionRegistry` (shared band definitions)

New root service: `apps/web/src/app/services/dimension-registry.service.ts`
(+ `dimension-band.ts` for the type).

```ts
export interface DimensionBand {
  id: string;        // 'phone' … 'super'
  name: string;      // 'PHONE' … 'SUPER' (shown in the label)
  minRatio: number;  // inclusive
  maxRatio: number;  // exclusive; top band uses Infinity
}

export interface DimensionRegistryState {
  version: number;
  bands: DimensionBand[]; // contiguous, sorted by minRatio asc
}
```

- Seeded from the current `BUILT_IN_PRESETS` ratios/names (PHONE 0–0.62, TALL,
  PAD, LAP, WIDE, MINI, ULTRA, SUPER 2.8–∞). Persisted under
  `allyclock.dimensions`.
- `resolveForRatio(ratio): DimensionBand` and the module-level `bandDistance`
  nearest-band fallback are lifted **verbatim** from `FullscreenConfigStore`.
- `reviveRatios()` (JSON serializes `Infinity → null`, which would break SUPER's
  open-ended top) is preserved on load.
- Holds **only** band definitions — no per-face style. This is the single list a
  future "add/remove dimension presets" editor mutates; editing it reflows every
  face at once. (No editor UI in this effort — see Non-Goals.)

### 2. `BandConfigStore<T>` (generic per-face config)

New generic base: `apps/web/src/app/faces/band-config-store.ts`.

```ts
export interface BandConfigState<T> {
  version: number;
  byBand: Record<string, T>; // keyed by DimensionBand.id
}

export abstract class BandConfigStore<T> {
  // ctor params (injected by the concrete subclass):
  //   storageKey: string, version: number,
  //   buildDefaults(): Record<string, T>   // one T per known band id
  protected abstract storageKey: string;
  protected abstract version: number;
  protected abstract buildDefaults(): Record<string, T>;

  readonly state: Signal<BandConfigState<T>>;
  config(bandId: string): T;                       // current fields for a band
  protected patch(bandId: string, fn: (t: T) => T): void;
  protected patchAll(fn: (t: T) => T): void;       // broadcast across bands
  // load / migrate / commit — lifted from the existing FullscreenConfigStore
  // persistence spine.
}
```

- Reuses the `load → migrate → commit` + immutable `patch` pattern from the
  current store.
- **`config(bandId)` is defensive:** if `byBand[bandId]` is missing it returns a
  freshly built default for that id (or the first band's fields) rather than
  `undefined`. The registry and each store persist separately, so `byBand` may
  lag the registry — "known to the registry" ≠ "present in `byBand`." `config`
  must never return `undefined` (it feeds `varsFor`, which would throw).
- **Migration is additive, not blanket-destructive.** On load, `migrate()`:
  (a) does a one-time full reseed only for the legacy v3 `fullscreen.presets`
  format (handled by simply using a new storage key, so the old key is ignored);
  (b) for the store's own future version bumps, fills in any band ids missing
  from `byBand` from `buildDefaults()` (spread defaults *under* existing) so
  adding a band later never wipes existing per-band tuning. This corrects the
  current store's destructive "reseed on any version bump."

### 3. `FullscreenConfigStore` (migrated onto the framework)

`apps/web/src/app/faces/fullscreen/fullscreen-config-store.service.ts` becomes:

```ts
type FullscreenFields = {
  sections: { time; weekday; month; day; gmt }; // SectionStyle each
  bases: { time; date; bar };                   // SectionBase each
  bar: BarStyle;
  gaps: { timeToBar; barToDate; betweenDateParts };
};

class FullscreenConfigStore extends BandConfigStore<FullscreenFields> {
  storageKey = 'allyclock.fullscreen.config';
  // delegates band selection to the registry:
  fieldsFor(ratio: number): FullscreenFields // = config(registry.resolveForRatio(ratio).id)
  setSectionVisibleAll(key, visible): void    // = patchAll(...)
  setBarVisibleAll(visible): void             // = patchAll(...)
  updateSection(bandId, key, partial), updateBar(bandId, partial),
  updateGap(bandId, key, value)               // = patch(bandId, ...)
}
```

- `FullscreenPreset` (the bundled struct) is **removed**. Its `minRatio`/
  `maxRatio`/`id`/`name` move to `DimensionBand`; `builtIn` is **dropped**
  (there is no per-face preset editor — bands are seeded built-ins). Its
  `sections`/`bases`/`bar`/`gaps` become `FullscreenFields`.
  - **Kept unchanged** in `fullscreen-preset.ts`: `SectionStyle`, `BarStyle`,
    `SectionBase`, `SectionKey`, `DATE_SECTION_KEYS`, `GAP_BASE_CQ`.
  - **Superseded:** `FullscreenConfigState` (`{version, presets[]}`) → reuse
    `BandConfigState<FullscreenFields>`; `STATE_VERSION`/`PRESETS_KEY` →
    replaced by the new `storageKey`/`version` on the store.
  - **Removed:** `renamePreset` — `name` now lives on `DimensionBand`; renaming
    belongs to a future registry editor (out of scope).
- `fullscreen-style.ts` `varsFor()` is unchanged except it takes
  `FullscreenFields` instead of a `FullscreenPreset`.
- The fullscreen face resolves its band from **its own** `ContainerSizeDirective`
  ratio (so the face-picker preview still sizes to its own container, per the
  "faces look great in any dimension" rule), then reads `fieldsFor(ratio)`.
- **Panel write paths differ:** the Adjust (`fullscreen-config`, size) panel uses
  per-band `config(bandId)` + `patch` (`updateSection`/`updateBar`/`updateGap`);
  the Display (`fullscreen-toggles`, visibility) panel uses `patchAll`
  (`setSectionVisibleAll`/`setBarVisibleAll`), preserving the dimension-agnostic
  visibility rule.
- **Fix the existing viewport bug + stay reactive:** `fullscreen-config.component.ts`
  currently reads `window.innerWidth/innerHeight` + a `window:resize` handler. It
  must instead receive the **live `ratio` signal of the fullscreen-face instance**
  as an input, and auto-select the band via a `computed`/`effect` on that signal
  (no `window.*`). The Adjust panel is only ever opened over the full-screen face
  (`app.component` `openAdjust`), never over a face-picker preview, so this ratio
  equals the viewport ratio — state that invariant explicitly.

### 4. `FaceOverlayComponent` (the two overlays)

New: `apps/web/src/app/controls/face-overlay/face-overlay.component.*`, mounted in
`app.component.html` as a **sibling of `<main class="face-host">` and
`.controls-bar`** so it renders above the `.face-layer` crossfade stack and
survives face switches (anything inside a layer is pruned after
`FACE_TRANSITION_MS`).

- **Dimension source (single authoritative readout):** the overlay carries its
  **own** `ContainerSizeDirective` instance on a shell element whose box equals
  the viewport (e.g. `.face-host`, which is `position:fixed; inset:0`). The
  directive measures `clientWidth/clientHeight` via `ResizeObserver` — it does
  **not** require CSS `container-type` (that's only for CSS container queries).
  The overlay resolves the band itself: `registry.resolveForRatio(width/height)`.
  - The per-face `ContainerSizeDirective` (a `hostDirective` on each face,
    unchanged) is an **independent** resolver. In the main view both measure the
    same viewport box and resolve the same band; exactly at a band boundary the
    two could differ by one band. The label is **purely informational**, so this
    is acceptable — documented, not a bug. (We do not thread the face's band into
    the shell, which would couple the shell to every face.)
- **Top-left label:** `{{ width }} × {{ height }} · {{ bandName }}` (× = U+00D7,
  · = U+00B7). W×H + active band name, uniform on every face.
- **Top-right chip:** dot + `LIVE`/`MOCK` text. `[class.is-live]="!isMocked()"`;
  reads `ClockService.isMocked` (`Signal<boolean>`, computed as
  `mock() !== null || mockTz() !== null`). `true` → amber **MOCK**, `false` →
  green **LIVE**. **Semantics:** MOCK = "Time Machine active (instant and/or zone
  overridden)" — a zone-only override still shows non-local time, so amber is
  correct. This matches the existing Time Machine button's `isMocked` binding.
  - The dot's color must be set explicitly per state (`.is-live .dot { color:
    $live }` / `.is-mock .dot { color: $mock }`) so its `currentColor`-based fill
    and glow resolve to green/amber — distinct from the white label text. New SCSS
    token `$mock: #ff9f0a` in `ui/tokens.scss` (`$live: #30d158` already exists;
    `$mock` does not).
- **Legibility (glow):** white text + `text-shadow` dark halo
  (`0 1px 2px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.85)`); dot uses
  `box-shadow: 0 0 6px currentColor, 0 0 2px rgba(0,0,0,.9)`.
- **Visibility:** both overlays bind `[class.hidden]` to hide when the overlay's
  own auto-hide has elapsed (`!visible()`, see §5) **or** a face config panel is
  open (`faceConfig.open()`) **or** the face-picker sheet is open
  (`sheetOpen()` on `AppComponent`) — the overlay floats above the whole shell, so
  it must not hover over the picker's backdrop.
- Deletes the fullscreen face's local `.viewport-label` (markup + SCSS), now
  superseded by this shared label.

### 5. Overlay auto-hide (self-contained)

`FaceOverlayComponent` owns its own auto-hide, mirroring the **exact** pattern
already on `fullscreen-face.component.ts`:

```ts
readonly visible = signal(true);
host: { '(document:pointermove)': 'reveal()',
        '(document:pointerdown)': 'reveal()',
        '(document:keydown)':     'reveal()' }
reveal() { if (this.faceConfig.open()) return;   // no-op while a config panel is open
           this.visible.set(true); this.armTimer(); }
armTimer() { clearTimeout(t); t = setTimeout(() => this.visible.set(false), AUTO_HIDE_MS); }
```

- Imports `AUTO_HIDE_MS` from `config/animation-timing.ts` (no new copy).
- **`reveal()` keeps the existing `faceConfig.open()` guard** so the overlay does
  not re-arm visible while a config sheet is open (matching `fullscreen-face` and
  `schedule-face`).
- **Deliberately NOT consolidating** the existing per-component auto-hide timers.
  There are five sites today — `fullscreen-face`, `schedule-face` (its gear),
  `configure-button`, `adjust-button`, `time-machine` — and they are **not**
  uniform: `time-machine` suppresses hiding while its own sheet is open
  (`if (!panelOpen())`) and `fullscreen-face`/`schedule-face` guard `reveal()` on
  their panel being open. A shared unconditional timer would break those guards
  (hide a control mid-edit, or flash controls when a sheet closes). All five use
  the same `AUTO_HIDE_MS` value and the same document events, so the new overlay
  stays visually in sync without coupling. Consolidating them into one service is
  a worthwhile **future cleanup** but is out of scope here (see Non-Goals).

### 6. `FaceDescriptor` + Adjust-button generalization

`apps/web/src/app/faces/face-registry.ts`:

```ts
export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
  configComponent?: Type<unknown>; // present → face has an Adjust panel
}
```

- Fullscreen sets `configComponent: FullscreenConfigComponent`.
- `app.component.html` replaces `@if (activeFaceId() === 'fullscreen')` on the
  Adjust button with `@if (activeFace().configComponent)`. `FaceConfigService`
  keeps `open`/`adjustOpen`.
- **`configComponent` gates only the Adjust *button*'s visibility.** Each face
  still renders its own config panel internally (fullscreen renders
  `<app-fullscreen-config>` in its own template, driven by `faceConfig.adjustOpen`);
  the shell does **not** `ngComponentOutlet` the `configComponent`. The field is
  declarative metadata ("this face has an Adjust panel"), not a render hook. (A
  future pass could make the shell own panel rendering; not now.)

## Data Flow

```
FaceOverlayComponent's own ContainerSizeDirective (on .face-host = viewport)
   → ratio → DimensionRegistry.resolveForRatio(ratio) → activeBand
        → label: "W × H · activeBand.name"   (informational; single resolver)
ClockService.isMocked → chip: LIVE / MOCK
overlay's own visible() signal (AUTO_HIDE_MS, faceConfig.open() guard)
   → label + chip fade   (hidden also on faceConfig.open() / sheetOpen())
[per face, independent] own container ratio → registry.resolveForRatio → band.id
        → FullscreenConfigStore.config(band.id) → varsFor(fields) → CSS vars
```

The overlay and each face resolve bands **independently** against the same shared
registry. In the main view they agree (same viewport box); at an exact band
boundary the informational label may differ by one band — acceptable. In a
face-picker preview the face resolves its own (smaller) band; the overlay is not
shown there.

## Storage & Migration

- New keys: `allyclock.dimensions` (registry), `allyclock.fullscreen.config`
  (band-keyed fields). Because the fullscreen config uses a **new** key, the old
  `allyclock.fullscreen.presets` (v3) is simply ignored — a clean one-time cutover
  with no in-place destructive migration. Hand-tuned fullscreen values are lost
  once on first load (acceptable: single user).
- `reviveRatios` is preserved on the registry so SUPER/`Infinity` survives reload.
- **Future band additions are additive** (§2): a later registry change that adds a
  band fills only the new band's `byBand` entry from defaults; existing per-band
  tuning is preserved. The store does **not** blanket-reseed on version bump.

## Error Handling

- localStorage unavailable/quota: stores fall back to in-memory (existing
  try/catch pattern in `commit`/`load`).
- **Band id present in the registry but absent from a store's `byBand`**
  (registry and store persist under separate keys, so they can diverge):
  `config(bandId)` returns a freshly built default for that id instead of
  `undefined`. `config` must never return `undefined` — it feeds `varsFor`.
- `DimensionRegistry.resolveForRatio` always returns a band (nearest-band
  fallback), so the label and `fieldsFor` always have a band to key on.
- `ClockService` is root-provided and always present; the chip needs no new state.

## Testing

- `DimensionRegistry`: band resolution across ratios incl. the SUPER/`Infinity`
  revival guard and nearest-band fallback. **Move** the band-boundary/contiguity/
  `maxRatio===Infinity`/name cases out of `fullscreen-presets.data.spec.ts` and
  `fullscreen-config-store.service.spec.ts` into this new spec (they assert on the
  now-removed `FullscreenPreset` shape and would otherwise fail to compile).
- `BandConfigStore`: load/commit/`patch`/`patchAll` by band id; additive
  `byBand` fill for missing ids; `config()` default-fallback for an unknown id;
  localStorage round-trip.
- `FullscreenConfigStore`: `fieldsFor(ratio)` picks the right band's fields;
  `setSectionVisibleAll`/`setBarVisibleAll` broadcast across all bands;
  `updateSection`/`updateBar`/`updateGap` patch one band.
- **Rewrite `fullscreen-presets.data.spec.ts`** for the `Record<bandId,
  FullscreenFields>` shape: one `FullscreenFields` per band id, deep-clone
  independence, default visibilities, phone-band `minCqh` floor.
- `FaceOverlayComponent`: label text from size + band; chip text + `is-live`/
  `is-mock` class flips with `isMocked`; hidden when `!visible()`, when
  `faceConfig.open()`, and when `sheetOpen()`; `reveal()` no-ops while
  `faceConfig.open()`; auto-hide after `AUTO_HIDE_MS` (fake timers).
- Update the fullscreen Adjust/Display panel specs and the fullscreen-face spec
  to the band-keyed store, the ratio-input Adjust panel, and the removed local
  `.viewport-label`.
- Gate: `npm run test:web` and `npm run build:web` green from repo root.

## Scope / Non-Goals

- **No** per-dimension config fields for Schedule or World Cards (they get the
  overlays only; Schedule keeps its content-preset store and its own gear).
- **No** band-editor UI ("add/remove dimension presets") in this effort — the
  registry is seeded and persisted, ready for an editor later.
- **No** custom per-face band boundaries (the shared registry is the single set).
- **No** change to the LIVE/MOCK source of truth or the Time Machine itself.
- **No** consolidation of the five existing auto-hide timers (`fullscreen-face`,
  `schedule-face`, `configure-button`, `adjust-button`, `time-machine`) — the new
  overlay carries its own (§5). Consolidation is a deliberate future cleanup; it
  is risky because the sites have non-uniform panel-open guards.

## Files (created / modified)

**Create**
- `services/dimension-registry.service.ts` + `dimension-registry.service.spec.ts`,
  `faces/dimension-band.ts`
- `faces/band-config-store.ts` + `band-config-store.spec.ts`
- `controls/face-overlay/face-overlay.component.{ts,html,scss,spec.ts}`

**Modify**
- `faces/fullscreen/fullscreen-preset.ts` (drop `FullscreenPreset`/`renamePreset`
  surface; keep `SectionStyle`/`BarStyle`/`SectionBase`/`SectionKey`/
  `DATE_SECTION_KEYS`/`GAP_BASE_CQ`; `FullscreenConfigState`/`STATE_VERSION`/
  `PRESETS_KEY` superseded; add `FullscreenFields`)
- `faces/fullscreen/fullscreen-presets.data.ts` (defaults → `Record<bandId, FullscreenFields>`)
  **+ `fullscreen-presets.data.spec.ts`** (rewrite for the new shape)
- `faces/fullscreen/fullscreen-config-store.service.ts` (extends `BandConfigStore`)
  **+ `fullscreen-config-store.service.spec.ts`** (band cases move to registry spec)
- `faces/fullscreen/fullscreen-style.ts` (`varsFor(fields)`)
- `faces/fullscreen/fullscreen-face.component.{ts,html,scss}` (read `fieldsFor`;
  remove local `.viewport-label`; keep its own auto-hide)
- `faces/fullscreen/fullscreen-config/*` (band-keyed store; **receive the face's
  live `ratio` signal as input**, drop `window.inner*`/`window:resize`) and
  `fullscreen-toggles/*` (band-keyed `patchAll`)
- `faces/face-registry.ts` (`configComponent?`)
- `app.component.{ts,html}` (mount `<app-face-overlay>`; Adjust gating via
  `configComponent`)
- `ui/tokens.scss` (`$mock: #ff9f0a`)
- Specs for all of the above.

> Note: `controls/adjust-button`, `controls/configure-button`,
> `controls/time-machine`, and `schedule-face` are **unchanged** (auto-hide
> consolidation is out of scope).
