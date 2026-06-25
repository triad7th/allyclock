# Time Zones: Space-Time Frame + Per-Face Zone — Design

**Date:** 2026-06-25
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` — `core/`, `shared/ui/`, `layout/time-machine`, `features/faces/fullscreen`

## Goal

Make the Time Machine a correct space-time frame (its typed date/time is
interpreted **in its selected zone**, fixing the "set zone to +00:00 but the
time stays local" bug), with a **Move/Freeze** choice for what changing the zone
does; extract a shared zone catalog + searchable picker (used by the Time
Machine and a new control); and add a **per-face display zone** to the Fullscreen
face that renders the clock's instant in the face's chosen zone without touching
the global LIVE/MOCK status.

## The space-time model (foundation)

Two independent quantities:
- **Instant** — the absolute moment (`clock.now()`): live `realNow` or the
  Time-Machine `mockNow`. One point on the timeline.
- **Display zone** — how an instant is rendered as a wall-clock.

Rules:
1. **Time Machine defines the instant** by interpreting its typed wall-clock
   *in its selected zone*: `instant = instantFromWallClock(fields, tmZone)`.
   Changing the zone (in the default mode) keeps the typed digits and moves the
   instant ("noon here" → "noon there").
2. **A face renders that instant in its own display zone:**
   `displayZone = faceZone ?? clock.timeZone()`. The face zone wins for display;
   the instant is always `clock.now()`.
3. **LIVE/MOCK is Time-Machine-only.** `clock.isMocked` keys off `mockNow`/
   `mockTimeZone`; the per-face zone never routes through clock mock state, so it
   never flips LIVE→MOCK.

Because changing the TM zone moves the *instant* (rule 1), it ripples to every
face (rule 2) — satisfying "changing the TM zone must affect the face's
date/time." A face's own zone only re-projects that instant locally.

## Decisions (from brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| Zone-change default | move vs freeze | **Move the moment** (keep typed digits, move the instant) |
| Zone-change option | add freeze? | **Yes** — a Move/Freeze control in the Time Machine |
| Precedence | face vs TM zone for display | **Face zone wins**; TM zone is the fallback ("Follow") |
| Extraction | reuse scope | **D1** — extract shared catalog + picker, migrate the Time Machine onto them, dedupe `LocationService` offset logic |
| Face-zone storage | field vs separate store | **`FullscreenFields` field** + `setTimeZoneAll` broadcast, version 2→3 + `mergeBand` default (mirrors `secondsVisible`) |
| Scope | which faces | **Fullscreen only** (world-cards already multi-zone; schedule unchanged) |

## Architecture

### 1. `core/zone-catalog` (pure data + caching singleton — fits future `packages/core`)

Pure helpers lifted verbatim from `time-machine.component.ts`:
- `interface TimeZoneOption { id: string; label: string; offset: number }`
- `FALLBACK_TIME_ZONES`, `buildTimeZones(localZone)`,
  `zoneOffsetMinutes(zone, at)` (Intl `longOffset` parse),
  `formatOffset(min)` (U+2212 minus), `buildTimeZoneOptions(localZone, at)`
  (label `"id  ±hh:mm"`, sorted by offset then id).
- **`ZoneCatalog` injectable service** (`providedIn: 'root'`) wraps these with a
  lazily-built, cached `options(): TimeZoneOption[]` (the full-IANA scan runs
  once for the app, not per component — both the Time Machine and the Settings
  picker read the same cached list).
- **Dedup:** `LocationService.getTimeZone` currently calls a private `offsetOf`
  that re-implements the same Intl `longOffset` parse. Reimplement
  `LocationService` against the catalog's offset helper (returning its `±hh:mm`
  form) so the offset logic lives in one place.

### 2. `core/zone-time.ts` (zone-aware wall-clock ↔ instant)

The bug fix lives here — pure, unit-testable functions:

```ts
export interface WallClock { year: number; month: number; day: number; hour: number; minute: number; }

// Instant → the wall-clock read off a clock in `zone`. Use Intl formatToParts
// with EXACTLY: { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit',
// minute:'2-digit', hourCycle:'h23', timeZone } (h23 so midnight reads "00", per
// clock-formatter.ts `precise`). Minute precision only — no seconds field.
export function wallClockInZone(instant: Date, zone: string): WallClock;

// Wall-clock + zone → the absolute instant (2-pass, sign verified):
//   guess = Date.UTC(y, mo-1, d, h, mi)              // treat fields as UTC
//   off   = zoneOffsetMinutes(zone, new Date(guess)) // minutes EAST of UTC (+)
//   inst  = guess - off*60000                        // e.g. Seoul +540 → 12:00→03:00Z
//   off2  = zoneOffsetMinutes(zone, new Date(inst))  // re-evaluate at result
//   if (off2 !== off) inst = guess - off2*60000      // single DST re-evaluation
// (Accepts — does not resolve — the ~1hr/yr nonexistent/ambiguous DST window;
// correct everywhere else. Preview tool, so acceptable.)
export function instantFromWallClock(w: WallClock, zone: string): Date;

// datetime-local string ("YYYY-MM-DDTHH:mm") <-> WallClock helpers for the input.
export function wallClockToInput(w: WallClock): string;
export function inputToWallClock(value: string): WallClock | null;
```

Editing the date/time field or dragging a slider quantizes the mock to whole
minutes (WallClock has no seconds — matching today's `onTimeSlider`). Do **not**
add `step=1` to the datetime-local input (would expose a seconds spinner WallClock
can't represent).

### 3. `shared/ui/zone-picker/zone-picker.component.ts` (searchable widget)

Presentational, reusable by the Time Machine and the Settings panel:
- Inputs: `options: TimeZoneOption[]`, `selectedId: string`.
- Output: `picked = output<string>()`.
- Owns: a `query` signal + `filtered` computed (case-insensitive
  `label.includes`, matching the full `"id  ±hh:mm"` label), the search input +
  scrollable list markup, the "active" marker on `selectedId`, an empty state,
  and a Cancel/back affordance. **Live-apply on tap** (emits `picked` immediately
  — no draft/commit), per the "sheets apply on close" model.
- SCSS lifts the existing `.tm-tz-search`/`.tm-tz-list`/`.tm-tz-option`/
  `.tm-tz-empty` styles into the component. Maps to a SwiftUI `searchable` List.

### 4. Time Machine refactor — `layout/time-machine`

**Zone-aware date/time (the fix).** Replace the browser-local
`toLocalInput`/`fromLocalInput` math with `zone-time` helpers, interpreting/
displaying everything **in the TM zone** (`clock.timeZone()`). `draft` stays a
**writable** signal holding the datetime-local string; it is re-seeded from the
zone-aware wall-clock whenever the instant/zone changes (open, scrub, zone pick,
live↔mock). It is NOT re-derived per tick (the field shows the seeded value, as
today — no live-ticking requirement). Concretely, every computed/handler that
used a browser-local `Date` must switch to the TM-zone wall-clock:

- A single source: `wall = wallClockInZone(draftInstant, clock.timeZone())`
  where `draftInstant = inputToWallClock(draft())` → `instantFromWallClock(...,
  clock.timeZone())` (or the seeded instant).
- **Reads** — `dayLabel`, `timeLabel`, `dayOfYear`, `maxDayOfYear`,
  `minuteOfDay` all derive from `wall` (its `year`/`month`/`day`/`hour`/`minute`),
  NOT from `draftDate().getFullYear()` / `toLocaleDateString(undefined, …)` /
  local getters. `dayLabel` formats `wall` via Intl with `timeZone:
  clock.timeZone()`; `timeLabel` from `wall.hour:wall.minute`.
- **Writes** — `onDateTime(value)`: `inputToWallClock(value)` →
  `instantFromWallClock(w, clock.timeZone())` → `scrubTo(instant)`; invalid →
  `draft.set(value)` (writable, so this compiles). `onDaySlider`/`onTimeSlider`:
  read `wall`, set day-of-year (recompute month/day) or hour/minute on the
  WallClock, convert back via `instantFromWallClock(wall', clock.timeZone())` →
  `scrubTo`. `scrubTo(instant)` does `setMock(instant)` then re-seeds `draft` from
  `wallClockInZone(instant, clock.timeZone())`.
- **Seeds** — `togglePanel` (open) and `toggleLive` (relive) re-seed `draft` via
  `wallClockToInput(wallClockInZone(clock.now(), clock.timeZone()))`, replacing
  their current `toLocalInput(clock.now())`.

This is what fixes "set zone to +00:00 but the field still shows local."

**Zone-change Move/Freeze control.** A session signal
`zoneChangeMode = signal<'move' | 'freeze'>('move')` (not persisted), surfaced as
a small 2-segment control in the panel (label "On zone change", segments
**Move moment** / **Freeze moment**). On zone pick `onTimeZone(newZone)`:
- **move** (default): keep the typed wall-clock; `instant =
  instantFromWallClock(wall, newZone)`; `scrubTo(instant)` + `setTimeZone(newZone)`.
  (Digits stay; the moment moves.)
- **freeze**: keep the instant (`clock.now()`, pinning "now" if live);
  `setMock(clock.now())` + `setTimeZone(newZone)`; re-seed `draft` from
  `wallClockInZone(clock.now(), newZone)`. (Moment stays; digits relabel.)

Either way an instant is pinned, so the result is MOCK. Note: if the picked zone
equals the device-local zone, `clock.setTimeZone` self-clears the zone
(`mockTimeZone=null`), so MOCK status is then held by `mockNow`, not the zone.

**Use the shared picker.** Replace the inline `tzQuery`/`filteredZones` + picker
markup with `<app-zone-picker [options]="ZoneCatalog.options()" [selectedId]=
"clock.timeZone()" (picked)="onTimeZone($event); closeTzPicker()">`, gated by the
existing `tzPickerOpen` sub-view toggle. **Drop `tzDraft`** (redundant —
`onTimeZone` live-applies via `clock.setTimeZone`; `selectedId` derives from
`clock.timeZone()`); keep `activeZoneLabel` as the trigger/card label. Remove the
now-shared helpers (`buildTimeZones`/`buildTimeZoneOptions`/`zoneOffsetMinutes`/
`formatOffset`/`TimeZoneOption`) from the component — they live in `zone-catalog`.

### 5. Fullscreen face — per-face display zone

- **Render** (`fullscreen-face.component.ts`): add
  `readonly displayZone = computed(() => this.activeFields().timeZone || this.clock.timeZone());`
  and swap the two call sites — `big`/`parts` pass `this.displayZone()` instead of
  `this.clock.timeZone()`; the instant stays `this.clock.now()`. The date-row GMT
  follows automatically (`dateParts` → `gmtOffset` is zone-parameterized). Empty
  string `''` means "follow" → falls back to `clock.timeZone()` (never passed to
  `Intl`).
- **Storage** (`fullscreen-preset.ts` / `fullscreen-presets.data.ts` /
  `fullscreen-config-store.service.ts`): add `timeZone: string` to
  `FullscreenFields` (default `''`); `setTimeZoneAll(tz)` via `patchAll`; read via
  `sample().timeZone`. Version `2 → 3`; `mergeBand` adds
  `timeZone: persisted.timeZone ?? defaults.timeZone`.
- **Settings control** (`fullscreen-toggles`): a **Time Zone** `.knobs-section`
  card showing the current label ("Follow Time Machine" when `''`, else the
  zone's `"id  ±hh:mm"` from the catalog). `fullscreen-toggles` has no sub-view
  today (flat `.knobs-panel`), so this is **net-new wiring**: add a
  `zonePickerOpen` signal + open/close methods, gate the existing `.knobs-panel`
  behind `@if (!zonePickerOpen())`, and render `<app-zone-picker>` in the
  `@else`. Options = a synthetic **Follow Time Machine** entry
  (`{ id: '', label: 'Follow Time Machine', offset: <sentinel below all real
  offsets> }`) **prepended to** `ZoneCatalog.options()` — built once, so `''`
  never reaches `zoneOffsetMinutes`/Intl. The picker's active marker compares
  `selectedId === store.sample().timeZone` (so `''` highlights Follow). Typing a
  query hides the Follow row (it doesn't match a zone search) — reachable again by
  clearing the query; acceptable. Picking emits → `setTimeZoneAll(id)`
  (live-apply, `''` resets to follow) then closes the sub-view.

## Data flow

```
Time Machine: typed wall-clock + tmZone --instantFromWallClock--> instant --setMock-->
  clock.now() = instant ;  clock.timeZone() = tmZone
Face: displayZone = faceZone || clock.timeZone()
      bigTime(clock.now(), locale, displayZone) / dateParts(clock.now(), locale, displayZone)
LIVE/MOCK chip: clock.isMocked  (unaffected by faceZone)
Settings zone pick --setTimeZoneAll(id)--> patchAll(all bands) --persist-->
```

## Edge cases / error handling

- **DST boundary:** 2-pass offset correction (above) handles the ordinary case;
  the ~1hr/year nonexistent/ambiguous window is accepted (preview tool).
- **Invalid/empty zone:** `displayZone` only ever yields a stored IANA id or
  falls back to `clock.timeZone()`; `''` is treated as "follow," never passed to
  `Intl`. The picker only emits ids from the catalog (or the `''` follow
  sentinel).
- **Freeze while live:** pins `clock.now()` first (mocks at the current instant),
  then relabels — the useful "freeze right now, look elsewhere" case.
- **Live `draft` display:** while live, `draft` re-derives each tick from
  `wallClockInZone(clock.now(), clock.timeZone())` so the field tracks live time
  in the TM zone.
- **`zoneChangeMode`** is session-ephemeral (a component signal, not persisted),
  defaulting to **Move** — YAGNI; persistence is a trivial later add.

## Testing

- `zone-time.spec`: `instantFromWallClock`/`wallClockInZone` round-trip for a few
  zones; a **DST-boundary** case (e.g. America/New_York spring-forward) lands on
  the correct UTC instant; `inputToWallClock`/`wallClockToInput` round-trip;
  invalid input → null.
- `zone-catalog.spec`: `buildTimeZoneOptions` labels + offset-then-id sort;
  `formatOffset` uses U+2212; fallback path when `Intl.supportedValuesOf` absent.
- `zone-picker.spec`: filters by full label (name + offset), emits `picked` on
  tap, shows the empty state, marks `selectedId` active.
- `time-machine.spec`: setting the zone to UTC shows/interprets the field as UTC
  wall-clock (regression for the bug); **move** mode keeps the digits and moves
  the instant on zone change; **freeze** mode keeps the instant and relabels;
  uses the shared picker.
- Fullscreen: `fullscreen-config-store.spec` — `setTimeZoneAll` broadcast +
  v2→v3 migration filling `timeZone`; `fullscreen-presets.data.spec` — default
  `timeZone: ''`; `fullscreen-face.spec` — `displayZone` precedence (faceZone
  wins; `''` falls back to `clock.timeZone()`); `fullscreen-toggles.spec` — the
  Time Zone card + picker sub-view + "Follow Time Machine" reset → `setTimeZoneAll('')`.
- `location.service.spec` — unchanged outputs after the offset-helper dedup.
- Gate: `npm run test:web` + `npm run build:web` green.

## Scope / Non-goals

- **Fullscreen face only** for the per-face zone (world-cards is already
  multi-zone per card; schedule has its own time logic).
- **No change to `clock.isMocked` semantics** (setting a TM zone remains part of
  mock state, as today).
- **No persistence** of `zoneChangeMode` (session-ephemeral, default Move).
- **No new packages/core extraction** — `zone-catalog`/`zone-time` land in
  `core/` and are positioned for the future move.

## Files (created / modified)

**Create**
- `core/zone-catalog.ts` (+ `.spec.ts`)
- `core/zone-time.ts` (+ `.spec.ts`)
- `shared/ui/zone-picker/zone-picker.component.{ts,html,scss}` (+ `.spec.ts`)

**Modify**
- `core/location.service.ts` (+ `.spec.ts`) — use the shared offset helper
- `layout/time-machine/time-machine.component.{ts,html,scss}` (+ `.spec.ts`) —
  zone-aware date math, Move/Freeze control, shared picker; remove the lifted helpers
- `features/faces/fullscreen/fullscreen-preset.ts` — `FullscreenFields.timeZone`
- `features/faces/fullscreen/fullscreen-presets.data.ts` (+ `.spec.ts`) — default `''`
- `features/faces/fullscreen/fullscreen-config-store.service.ts` (+ `.spec.ts`) —
  `setTimeZoneAll`, version 2→3, `mergeBand` default
- `features/faces/fullscreen/fullscreen-face.component.ts` (+ `.spec.ts`) — `displayZone`
- `features/faces/fullscreen/fullscreen-toggles/fullscreen-toggles.component.{ts,html,scss}` (+ `.spec.ts`) —
  Time Zone card + picker sub-view + Follow reset
