# Fullscreen Face — "Flow of Time" Design

**Date:** 2026-06-20
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` — `features/faces/fullscreen`

## Goal

Convey the passage of time on the Fullscreen face with two additions: a small
**whisper seconds** readout flanking the big time, and a **bar mode** that can
render the middle bar as a **minute progress bar**. Both are configurable from
the existing Display panel and behave correctly across all dimension bands.

## Decisions (from brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| Time-flow ideas | which directions | **A (seconds ticker) + C (minute progress bar)** — not millisecond, not blink/sweep/breathe |
| Seconds placement | where | **Bottom-right of the time, flanking the digits**; AM/PM stays **top-right** (unchanged) |
| Seconds style | look | **Whisper**: bare digits (no colon), small (~0.10em of the time), low opacity (~0.28) |
| Seconds control | toggle vs always | **Toggle** in the Display panel, **default ON**, dimension-agnostic |
| Bar | on/off vs modes | **3-state mode: Off / Divider / Progress** (replaces the on/off toggle) |
| Bar default | which mode | **Progress** (the new signature look) |
| Progress motion | stepped vs smooth | **Smooth/continuous** fill (uses the ~30fps clock), resets on the minute turn |

## Architecture

Both additions reuse the established Fullscreen config machinery: per-band
`FullscreenFields` in `FullscreenConfigStore` (a `BandConfigStore<FullscreenFields>`),
dimension-agnostic broadcast writes via `patchAll`, the Display panel
(`fullscreen-toggles`) for controls, and CSS custom properties produced by
`varsFor()` for rendering. No new architecture; two new fields + their controls
+ their rendering.

### 1. Data model — `features/faces/fullscreen/fullscreen-preset.ts`

```ts
export type BarMode = 'off' | 'divider' | 'progress';

export interface BarStyle {
  mode: BarMode;     // replaces the former `visible: boolean`
  sizeScale: number; // unchanged
  opacity: number;   // unchanged — drives divider line + progress fill/track alpha
}

export interface FullscreenFields {
  bar: BarStyle;
  secondsVisible: boolean;   // NEW — dimension-agnostic seconds toggle
  sections: { time; weekday; month; day; gmt };  // unchanged
  bases: { time; date; bar };                     // unchanged
  gaps: { timeToBar; barToDate; betweenDateParts }; // unchanged
}
```

### 2. Defaults — `fullscreen-presets.data.ts`

`fields()` returns `bar: { mode: 'progress', sizeScale: 1, opacity: 0.34 }` and
`secondsVisible: true`, on every band.

### 3. Store + migration — `fullscreen-config-store.service.ts` + `band-config-store.ts`

Current `bar.visible` consumers (all must be updated): the face template
(`@if (activeFields().bar.visible)`), `fullscreen-toggles` (reads
`sample().bar.visible`, calls `setBarVisibleAll`), the store (`setBarVisibleAll`;
`updateBar` is a generic `Partial<bar>` passthrough whose only callers — the
Adjust panel — pass `sizeScale`/`opacity`, never `visible`, so it needs no
change), and `fullscreen-presets.data.ts` defaults. `varsFor` reads only
`bar.opacity`, not visibility.

- Replace `setBarVisibleAll(boolean)` → `setBarModeAll(mode: BarMode)` (`patchAll`).
- Add `setSecondsVisibleAll(visible: boolean)` (`patchAll`), mirroring
  `setSectionVisibleAll`.
- Bump `version()` `1 → 2`.
- **Migration (no tuning lost) — requires a base-store seam.** The base
  `BandConfigStore.migrate()` is **`private` and merges at band-id level only**
  (`{ ...buildDefaults(), ...state.byBand }` — a persisted band replaces the
  default band wholesale, with no per-field fill), so a v1 `bar:{visible:true}`
  would survive *without* `mode`/`secondsVisible` and the template would read
  `undefined`. Fix in two steps:
  1. In `band-config-store.ts`: make `migrate()` `protected`, and factor its
     per-band combine into a `protected mergeBand(defaults: T, persisted: T): T`
     hook that defaults to the current wholesale `persisted` (identity — no
     behavior change for other stores).
  2. In `FullscreenConfigStore`: override `mergeBand` to **deep-merge persisted
     fields under `buildDefaults()` for that band** (defaults fill new
     `secondsVisible`/`bar.mode`; persisted `sizeScale`/`opacity`/`gaps`/`bases`
     win), and **translate legacy `bar`**: if persisted bar has `visible`, set
     `mode = visible ? 'divider' : 'off'` and drop the `visible` key.
  This preserves per-band tuning across the 1→2 bump. (Explicit fallback if the
  hook proves awkward: a one-time reseed to defaults on the bump — acceptable for
  a single user, consistent with prior breaking shape changes. The plan commits
  to the `mergeBand` hook as primary.)

### 4. Rendering — seconds

- `clock-formatter.ts` `bigTime()` gains a `seconds: string` field: add
  `second: '2-digit'` to its existing `Intl.DateTimeFormat` call and extract the
  `second` part (timezone-correct; respects the Time Machine zone). `BigTime`
  becomes `{ digits, ampm, seconds }`.
- `fullscreen-face.component.html`: the `.time` row restructures to
  `digits` + a flex **column flank** (`.flank`) containing `ampm` (top) and
  `seconds` (bottom). Seconds wrapped in `@if (activeFields().secondsVisible)`.
- SCSS layout (verified against the current `.time`/`.ampm`):
  - `.time` keeps `align-items: flex-start`; `.flank` is
    `display: flex; flex-direction: column; align-self: stretch` so it takes the
    digits' full height (the digits are the tallest item, so the flank gets real
    vertical space to distribute).
  - **Bottom-anchor with `margin-top: auto` on `.seconds`, NOT
    `justify-content: space-between`** — space-between puts a *lone* child at the
    top, which would mis-place seconds in 24h locales (no AM/PM). `margin-top:
    auto` pushes seconds to the bottom whether or not `ampm` is present.
  - `.ampm` carries its existing optical nudge `margin-top: 0.55em` into the
    flank (load-bearing — do not drop it; "AM/PM stays top-right" means *visually
    unchanged*, which requires keeping the nudge).
  - `.seconds`: ~`font-size: 0.10em` (of the time), `opacity: 0.28`,
    `font-weight: 300`, slight letter-spacing.

### 5. Rendering — bar modes

Today bar visibility is **template-only** (`@if (activeFields().bar.visible)`),
`varsFor` emits only `--bar-opacity`, and bar width is an SCSS `calc` off
`--time-base`. Follow that layering:

- **Mode branch lives in the TEMPLATE**, not a CSS var: replace the `@if` with
  `@switch (activeFields().bar.mode)` — `off` → nothing; `divider` → today's
  `.bar.divider`; `progress` → a `.bar.progress` track (the bar's existing
  responsive width + `--bar-opacity` for the faint track) wrapping a **separate
  child** fill. `varsFor` is unchanged (config-only: still just `--bar-opacity`).
- **`--minute-progress` is a per-frame binding, NOT part of `varsFor`.**
  `varsFor(fields)` is a pure function of static config with no `clock.now()`
  access, and `styleVars` recomputes only on config change — it must not carry a
  ~30fps value. Add a dedicated `minuteProgress = computed(() => …clock.now()…)`
  on the face and bind it separately: `[style.--minute-progress]="minuteProgress()"`
  on the `.clock` (so the heavy `styleVars` object isn't rebuilt every frame).
- `minuteProgress` = `(secondsInMinute + ms/1000) / 60`, derived from
  `clock.now()` (already ticks ~30fps → smooth). The fill uses
  `transform: scaleX(var(--minute-progress)); transform-origin: left`
  (GPU-composited, no perf concern on the OnPush/zoneless face), preserving the
  track's full width. The Time Machine freezes the fraction at the mocked instant.

### 6. Display panel — `fullscreen-toggles`

- Add a **Seconds** toggle row (same iOS switch as Weekday/GMT) bound to
  `setSecondsVisibleAll`, reading `store.sample().secondsVisible`.
- Replace the **Bar** on/off switch with a **3-segment control** (Off / Divider /
  Progress) bound to `setBarModeAll`, reading `store.sample().bar.mode`. Net-new
  SCSS (no segmented control exists in the app). Text labels, no new icons.
  Test/a11y hooks: `data-knob="bar-mode"` on the group with `role="radiogroup"`,
  each segment a `role="radio"` carrying `data-mode="off|divider|progress"` +
  `aria-checked`, so the spec can click a segment and assert `setBarModeAll(mode)`.

## Data Flow

```
clock.now() (≈30fps)
  → bigTime() → { digits, ampm, seconds }      → time row (seconds @if secondsVisible)
  → minuteProgress = (sec + ms/1000)/60         → --minute-progress → fill scaleX
activeFields().bar.mode → off | divider | progress  (template branch)
Display panel → setSecondsVisibleAll / setBarModeAll → patchAll(all bands) → persist
```

## Error Handling / Edge Cases

- 24-hour locales (no AM/PM): flank shows seconds only, bottom-anchored.
- Time Machine (mocked instant/zone): seconds + progress reflect and freeze at
  the mocked time — correct, no special-casing.
- `bar.mode === 'off'`: no track, no fill, no layout reservation (matches old
  `visible:false`).
- Unknown/missing `bar.mode` after a bad load: migration guarantees a valid
  mode; the template treats any non-`divider`/`progress` value as `off`.

## Testing

- `clock-formatter.spec`: `bigTime(fixedDate, locale, tz).seconds` is the
  zero-padded second; AM/PM unchanged.
- New minute-progress helper/computed: fixed `Date` at 30.5s → ≈0.508; 0s → 0;
  59.9s → ≈0.998.
- `fullscreen-config-store.service.spec.ts` (**compile break** — currently calls
  the removed `setBarVisibleAll`): rewrite to `setSecondsVisibleAll`/
  `setBarModeAll` broadcasting across all bands; add a migration test (a v1
  persisted band with `bar:{visible:true}` + missing `secondsVisible` loads as
  `bar.mode:'divider'`, `secondsVisible:true`, with its `sizeScale`/`opacity`
  preserved).
- `fullscreen-presets.data.spec.ts` (**assertion update** — currently asserts
  `bar.visible===true`): defaults have `secondsVisible: true` and
  `bar.mode: 'progress'` on every band.
- `fullscreen-toggles.component.spec.ts` (**rewrite** — Bar switch → segment
  control): renders the Seconds switch + the 3-segment Bar control; clicking the
  Seconds switch calls `setSecondsVisibleAll` and clicking a Bar segment calls
  `setBarModeAll(mode)`, each broadcasting to all bands.
- `fullscreen-config.component.spec.ts` (**dead-selector** — its "toggles absent
  from the Adjust panel" guard asserts `[data-knob="bar-visible"]` is null):
  update the hook to the new `[data-knob="bar-mode"]` so it still tests a real
  control rather than a stale selector.
- `fullscreen-face.component.spec.ts` (**additive** — no current `bar.visible`
  reference): add assertions — renders the seconds span when `secondsVisible`,
  omits it when off; `@switch` renders divider vs progress vs nothing per mode;
  the fill reflects `minuteProgress()` for a fixed mocked instant.
- "Great in any dimension": seconds are em-relative and progress uses the bar's
  responsive width, so verify across a wide (840×400) and portrait ratio and in
  the face-picker preview (no half-content, scales correctly).
- Gate: `npm run test:web` + `npm run build:web` green from repo root.

## Scope / Non-Goals

- No millisecond/hundredths display (idea B rejected), no blink/sweep/breathe.
- No per-band seconds-size or progress-style knob (dimension-agnostic only;
  per-band fields retained for future revival, not exposed).
- No changes to the Schedule or World Cards faces.
- No change to the Adjust (size) panel — seconds/bar-mode live in the Display
  panel only.
