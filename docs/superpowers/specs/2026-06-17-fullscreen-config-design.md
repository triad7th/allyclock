# Fullscreen Face Configuration — Design

**Date:** 2026-06-17
**Status:** Approved design; ready for implementation plan.

**Goal:** Give the Fullscreen clock face (the chosen "Editorial Ultra-Thin" look) a configuration sheet that lets the user tune the look per **screen ratio** via named, ratio-keyed presets, with per-section typography/spacing knobs, preset add/delete (like the Daily Schedule face), and a device-name search for convenience.

**Core principle:** Everything is determined by **screen ratio**. Presets are ratio ranges. At runtime the face auto-selects the preset whose range contains the live container ratio (with an optional manual pin). Device names are a convenience layer that resolve to a ratio.

---

## 1. The Editorial face, restructured into sections

The current `FullscreenFaceComponent` renders one time block, a hairline rule, and one meta line. It is restructured so every configurable element is an independent **section**:

- `time` — the big hour:minute (with the AM/PM marker, which inherits the time's settings).
- `bar` — the middle element between time and date. Mode is per preset: `progress` | `divider` | `hidden`.
- `weekday` — e.g. `WED`.
- `month` — e.g. `JUN`.
- `day` — e.g. `17`.
- `gmt` — e.g. `GMT−07`.

The date sections (`weekday`, `month`, `day`, `gmt`) render inline as a tracked, uppercase row (the Editorial look), separated by a middot, in that order. Each can be individually sized/weighted/hidden.

### Section settings

Each of `time | weekday | month | day | gmt` carries:

```ts
interface SectionStyle {
  visible: boolean;     // show/hide toggle
  sizeScale: number;    // multiplier on the responsive base (default 1.0, range 0.5–2.0)
  weight: number;       // font-weight (100–700; Editorial default 200, date default 300)
  opacity: number;      // 0.2–1.0
}
```

The `bar` section carries:

```ts
interface BarStyle {
  mode: 'progress' | 'divider' | 'hidden';
  visible: boolean;     // convenience; equivalent to mode==='hidden' when false
  sizeScale: number;    // scales the bar thickness/width base
  opacity: number;
}
```

### Responsive base + scale

Sizing stays responsive. Each section has a **responsive base** expressed as a blended `min(Acqw, Bcqh)` (the technique already used by the face), provided by the active preset. The user's `sizeScale` multiplies it:

```css
.time { font-size: calc(var(--time-base) * var(--time-scale, 1)); }
```

where `--time-base` is `min(Acqw, Bcqh)` for the active preset's ratio band and `--time-scale` is the knob. This keeps the clock adapting **within** a band while the knob nudges it. `weight`, `opacity`, and `visible` map to `font-weight`, `opacity`, and `display:none`. Gaps work the same way (a base cq value × a gap scale).

The face applies the active preset by writing these CSS custom properties (`--time-base`, `--time-scale`, `--time-weight`, `--time-opacity`, `--weekday-*`, …, `--gap-time-bar`, …) onto its host element. The template reads only variables, so no `@container` query machinery is needed — runtime ratio→preset selection (Section 3) replaces it.

### Minute-progress bar

When `bar.mode === 'progress'`, the bar is a hairline track with a fill whose width is the fraction of the **current minute elapsed**: `fraction = (seconds + ms/1000) / 60`, recomputed from `clock.now()` each tick (the face already updates at sub-second resolution). At `divider` it is a static full-width hairline; at `hidden` it is removed.

---

## 2. Data model

```ts
interface SectionBase {
  cqw: number;   // A in min(Acqw, Bcqh)
  cqh: number;   // B
}

interface FullscreenPreset {
  id: string;
  name: string;          // e.g. "ULTRAWIDE"
  minRatio: number;      // inclusive; ratio = width / height
  maxRatio: number;      // exclusive (use Infinity for the top band)
  bar: BarStyle;
  sections: {
    time: SectionStyle;
    weekday: SectionStyle;
    month: SectionStyle;
    day: SectionStyle;
    gmt: SectionStyle;
  };
  // Per-section responsive bases for this band (seeded from the tuned buckets).
  bases: {
    time: SectionBase;
    date: SectionBase;    // shared base for weekday/month/day/gmt
    bar: SectionBase;     // bar width/thickness base
  };
  gaps: {
    timeToBar: number;       // gap-scale (× a cq base)
    barToDate: number;
    betweenDateParts: number;
  };
  builtIn: boolean;          // built-ins can be reset; all presets can be edited/deleted
}

interface FullscreenConfigState {
  version: number;
  presets: FullscreenPreset[];   // ordered; ranges are contiguous and non-overlapping
  pinnedPresetId: string | null; // null = auto by ratio
}
```

`sizeScale` lives in each `SectionStyle`; the absolute responsive base lives in `bases`. The size **slider** in the UI edits `sizeScale` (simple, safe). `bases` are seeded by built-ins and cloned when adding a preset; they are not exposed as a slider in v1 (advanced).

---

## 3. Built-in presets (ratio bands)

Contiguous, non-overlapping ratio bands (ratio = width/height). Names and ranges are editable.

| Name | Band (ratio) | Example devices | Base regime |
|------|--------------|-----------------|-------------|
| ULTRAWIDE | ≥ 1.95 | 21:9 monitors, 840×400 mini (2.1), iPhone landscape (2.17) | landscape |
| WIDESCREEN / TV | 1.70 – 1.95 | 16:9 desktop & TV (1.78) | landscape |
| LAPTOP / SMART DISPLAY | 1.45 – 1.70 | 16:10 laptop / smart display (1.60) | landscape |
| TABLET 4:3 | 1.15 – 1.45 | iPad landscape (1.33) | near-square |
| SQUARE | 0.87 – 1.15 | 1:1 panels, app preview | near-square |
| TABLET PORTRAIT | 0.62 – 0.87 | iPad portrait 3:4 (0.75) | near-square |
| PHONE | < 0.62 | phones 9:19.5 (0.46) | phone |

**Base regimes** (seeded from the tuned Editorial buckets; `min(Acqw, Bcqh)` and gap/bar bases):

- **landscape** — time base `min(120cqw, 68cqh)` (height binds; hero ≈ 68% of the short side), date base `min(8cqw, 5cqh)`, bar base width `min(120cqw, 56cqh)` / thickness 1.5px, tight gaps.
- **near-square** — time base `min(38cqw, 64cqh)` (width binds; "9:41" ≈ 85% width), date base `min(3.4cqw, 4cqh)`, bar width `min(58cqw, 62cqh)` / 1px, default gaps.
- **phone** — time base `24cqw`, date base `3.4cqw` (eased tracking), bar width `60cqw` / 1.5px, portrait gaps.

(The large `cqw` term in landscape bases is a high cap so the `cqh` term binds; exact numbers are carried verbatim from the locked showcase CSS — see `.superpowers/brainstorm/.../editorial-devices.html` for the validated values.)

Default `SectionStyle` per built-in: all `visible:true`, `sizeScale:1.0`; `time.weight:200`; date sections `weight:300`, `opacity:0.6`. `bar.mode` defaults to `'divider'` in all built-ins; `progress` is opt-in per preset.

---

## 4. Runtime selection

The `FullscreenFaceComponent` already measures its host via the `[appContainerSize]` directive (`width`, `height` signals).

```
ratio = width / height
preset = pinnedPresetId
  ? presets.find(p => p.id === pinnedPresetId)
  : presets.find(p => ratio >= p.minRatio && ratio < p.maxRatio)
       ?? nearestByRatio(ratio)   // safety fallback if bands have a gap
```

The chosen preset's values are written as CSS variables on the host (a `computed` mapping preset → style map). When the user is editing in the config sheet, the same store drives both the face and the sheet's live preview, so edits apply immediately (consistent with the app's "changes apply live / close = apply" model).

---

## 5. Persistence & store

`FullscreenConfigStore` (signal-based service, mirroring `ScheduleStoreService`):

- `state(): FullscreenConfigState` (signal) — seeded with built-ins on first load.
- `addPreset(seed: { name; minRatio; maxRatio } | { ratio })` — creates a preset, cloning bases/sections from the nearest existing band; inserts keeping bands sorted.
- `deletePreset(id)` — guarded so at least one preset always remains; re-pins/re-selects safely.
- `renamePreset(id, name)`, `duplicatePreset(id)` (name "… 2", like Daily Schedule).
- `updateSection(id, section, partial: Partial<SectionStyle>)`, `updateBar(id, partial: Partial<BarStyle>)`, `updateGap(id, key, value)`.
- `setPin(id | null)`.
- `resolveForRatio(ratio): FullscreenPreset`, `resolveDevice(name): number | null`.
- `resetBuiltIn(id)` — restores a built-in's seeded values.

Persisted to `localStorage`:
- `allyclock.fullscreen.presets` — the presets array.
- `allyclock.fullscreen.pin` — pinned id or empty.

Versioned migration (`version` field) seeds/upgrades built-ins additively, like the schedule store. New built-ins added in future versions are merged in without clobbering user edits to existing ones.

---

## 6. Device search

A static `device-ratios.ts` data table:

```ts
interface DeviceRatio { name: string; ratio: number; category: 'phone'|'tablet'|'laptop'|'desktop'|'tv'|'console'|'handheld'|'display'; }
```

Seeded with a representative set across categories — e.g. iPhone 16 Pro Max, iPhone SE, Samsung Galaxy S24, iPad Pro 11"/12.9" (portrait & landscape entries), Surface Pro 7, common 16:9 desktop/TV, 21:9 ultrawide, Nintendo Switch (1280×720 = 1.78), Steam Deck (1280×800 = 1.6), PS5 (TV → 1.78), the 840×400 mini display, Google Nest Hub, Amazon Echo Show. Extensible.

In the config sheet a searchable combobox (same interaction as the Time Machine timezone search) filters by name. Selecting a device resolves its ratio and **selects the matching preset** (or offers to add a preset for that ratio if none matches well). This is pure convenience — the underlying key is always the ratio.

---

## 7. Config sheet UI

A `FullscreenConfigComponent` rendered in `<app-sheet>`, opened from a gear control on the Fullscreen face (mirroring the Daily Schedule gear + auto-hide behavior). Built entirely on the existing primitives and the established sheet conventions (close = apply; X relabeled "Close").

Layout (top → bottom):

1. **Nav header** (`<app-nav-header>`): leading `<app-icon-button icon="xmark" label="Close">` (close = apply), centered title "Fullscreen". No confirm button (consistent with the app's sheet model).
2. **Live preview**: a framed Editorial clock at the active preset's representative ratio, driven by the same store so it updates as knobs move. A small "Auto · <ratio>" / "Pinned" status and a **pin** toggle.
3. **Preset row**: horizontally scrollable cards (like Daily Schedule) — each card shows the preset name + its ratio band (and a tiny clock thumbnail); the active preset is highlighted; tap the title to rename; a **×** delete button per card (guarded to keep ≥1); a trailing **+** card to add a preset. A **device search** combobox sits above or beside the row.
4. **Section knobs** for the active preset — a list with one row per section (Time, Bar, Weekday, Month, Day, GMT):
   - show/hide toggle (iOS switch),
   - size slider (`sizeScale`),
   - weight control, opacity slider,
   - the **Bar** row additionally has a segmented control for `progress | divider | hidden`.
   Plus **gap** sliders (time→bar, bar→date, between date parts).

Sliders/toggles reuse the iOS visual style already in the app (the Time Machine slider styling is the reference; a shared slider partial may be extracted if convenient, but is not required).

---

## 8. Porting (Apple)

- `FullscreenPreset` / `FullscreenConfigState` → `Codable` structs.
- Ratio selection → a pure function over `GeometryReader` / `.onGeometryChange(for: CGSize.self)` size.
- Section knobs → SwiftUI `.font(.system(size:weight:))`, `.opacity()`, spacing modifiers; visibility → conditional view.
- Device table → shared data.
- The config sheet → a SwiftUI `Form` inside `.sheet`.

---

## 9. Testing

- **Store specs** (Vitest): seeding/migration; `addPreset`/`deletePreset` (last-preset guard); rename/duplicate naming; band contiguity after add/delete; `resolveForRatio` at band boundaries; `resolveDevice`; pin set/clear; persistence round-trip.
- **Face specs**: ratio→preset selection across boundaries; pin override; preset → CSS-variable map; minute-progress fraction (fixed `Date`); section visibility/weight/opacity application.
- **Config component specs**: preset CRUD via store; knob change → store update → preview reflects; device search filters and resolves; bar-mode segmented control; close = apply.
- Use fixed `Date` values for any time-dependent assertions.

---

## 10. Implementation phases

Each phase builds and tests green on its own.

1. **Model + store** — types, `FullscreenConfigStore`, built-in seeds, migration, device table; full specs. No UI/face changes yet.
2. **Face runtime** — restructure the Editorial template into sections driven by CSS variables; runtime ratio→preset selection + pin; bar modes (progress/divider/hidden); apply store. (Defaults render exactly the locked Editorial look.)
3. **Config sheet** — gear trigger, `<app-sheet>` config with live preview, preset CRUD cards, section knobs, gaps, bar selector, pin toggle.
4. **Device search** — the searchable device combobox + `device-ratios.ts`, resolving to a preset.

---

## 11. Open decisions (resolved)

- **Apply model:** auto by ratio with an optional manual pin. ✔
- **Middle bar:** per-preset configurable (`progress` | `divider` | `hidden`). ✔
- **Section knobs:** font size, gap, show/hide, and weight/opacity — all four. ✔
- **Presets:** edit built-ins **and** add/delete custom ratio presets, like the Daily Schedule face. ✔
- **Minute-progress definition:** fraction of the current minute elapsed (seconds/60). *(Easy to change to minute-of-hour if preferred.)*
