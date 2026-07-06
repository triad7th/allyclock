# iOS Fullscreen Adjustment + Settings — Design Spec

**Date:** 2026-07-05
**Status:** Approved (brainstorm) — pending implementation plan
**Topic:** Finish the iOS Fullscreen face by porting the Web app's Adjustment panel and Settings panel, with live-editing config stores.

## Goal

Bring the iOS Fullscreen face to config parity with the Web reference: the Adjust
sheet gets the two web sliders (Time size, Date size), the face gains its gear-opened
Settings panel (visibility toggles, bar mode, time zone picker), and edits apply live
to the rendered face. `AllyClockCore` already holds the full `FullscreenConfigStore`
port and `FullscreenFaceView` already honors every config field — the missing pieces
are store observability and the two panel UIs.

## Scope

**In scope**

- `BandConfigStore` becomes `@Observable` so store edits re-render SwiftUI views live.
- `ZoneCatalog` port in `AllyClockCore` (zone list, offsets, labels, special GMT zones).
- Adjust sheet for the Fullscreen face: Time + Date size sliders, per dimension band.
- Settings panel opened from a gear on the face: Seconds / Weekday / Zone / GMT / Flag
  toggles, Bar segmented control (Off / Divider / Progress), Time Zone picker row.
- `ZonePickerView`: searchable zone list shared view, live-apply on tap.
- Core unit tests for `ZoneCatalog` and store observability.

**Out of scope (later specs)**

- World Cards Adjust/Settings (its sheet keeps the current placeholder).
- Extra Adjust knobs beyond the web's two sliders (weight, opacity, per-part). Web is
  the reference; new knobs land on web first, then port.
- Time Machine (clock mocking) on iOS.
- Schedule face port.

## Decisions

- **Settings entry point:** a gear button overlaid on the fullscreen face itself,
  mirroring the web (`fullscreen-face.component` owns its toggles panel). Not a third
  controls-bar button, not merged into Adjust.
- **Adjust scope:** exactly the web's two sliders. Time writes
  `sections.time.sizeScale`; Date broadcasts one value to all four date sections
  (weekday / month / day / gmt), matching web `onDateSize`.
- **Observability:** annotate `BandConfigStore` with `@Observable` in the core package
  (the 1:1 analog of the web's signal store). Subclasses inherit it; every future face
  gets live editing for free. An app-side wrapper view-model was rejected as a layer
  the web doesn't have. Requires bumping the package platforms (iOS 16 → 17 minimum;
  watchOS 9 → 10, tvOS 16 → 17) — the app targets iOS 26, so the floor protects
  nothing real.
- **"Follow" zone entry label:** iOS has no Time Machine, so the synthetic `""` entry
  is labeled **"Follow System"** (web: "Follow Time Machine"). `""` already means
  "follow the device zone" in `FullscreenFaceView`.

## Architecture

```
packages/AllyClockCore/Sources/AllyClockCore/
  Dimensions/BandConfigStore.swift     ← @Observable; platforms bump in Package.swift
  Zones/ZoneCatalog.swift              ← new: port of zone-catalog.ts
  (FullscreenConfigStore, FullscreenFields — unchanged; setters already exist)

apps/ios/AllyClock/
  App/AdjustSheetView.swift            ← stub → real sliders for .fullscreen
  App/RootFaceView.swift               ← passes live ratio (+ registry) into Adjust
  Faces/FullscreenFaceView.swift       ← gains gear button + Settings sheet hosting
  Faces/FullscreenSettingsView.swift   ← new: toggles, bar segment, zone row
  Shared/ZonePickerView.swift          ← new: searchable list, FlagView rows
```

### ZoneCatalog (core)

Port of `zone-catalog.ts` onto Foundation:

- `TimeZone.knownTimeZoneIdentifiers` is the analog of `Intl.supportedValuesOf('timeZone')`;
  prepend the local zone if absent.
- Offsets from `TimeZone.secondsFromGMT(for: Date)` (web parses Intl longOffset).
- `formatOffset` uses U+2212 for minus, `+HH:MM` form, matching the app's typography.
- Options labeled `"{id}  {offset}"`, sorted by offset then id.
- Special fixed-offset zones: UTC plus every 30-minute GMT offset from −12:00 to
  +14:00, ids as ASCII offset strings (`"+05:30"`) — `TimeZone(identifier:)` does not
  parse those, so the picker resolves special ids via `TimeZone(secondsFromGMT:)`.
  The face's zone resolution gains the same fallback.
- Catalog computed once and cached (web caches the IANA scan the same way).

### Adjust sheet

- `RootFaceView` computes the live face ratio from its geometry and passes it with the
  fullscreen store into `AdjustSheetView`.
- Band resolution mirrors web `editingBand`: `registry.resolveForRatio(ratio).id`.
  Editing while rotating re-targets the band reactively.
- Two rows, web-matching: label, `Slider(value:in: 0.5...2.0, step: 0.05)`, numeric
  readout formatted `%.2f`.

### Settings panel

- Gear: `GlassIconButton(icon: "gearshape")` overlaid on the face, tied into the
  existing chrome auto-hide rhythm (visible on tap, fades with the controls bar).
- Opens a `GlassSheet(title: "Settings")` hosting `FullscreenSettingsView`, laid out
  in web order: Seconds + Weekday pair, Zone + GMT + Flag row, Bar segmented control,
  Time Zone field (flag + current label) that pushes into `ZonePickerView`.
- All writes go through the existing broadcast setters (`setSecondsVisibleAll`,
  `setSectionVisibleAll`, `setBarModeAll`, `setTimeZoneAll`, …).
- GlassSheet convention holds: apply live, accept on any dismissal, no confirm/cancel.

### ZonePickerView

- Search field over a scrollable filtered list (case-insensitive label match).
- Rows: `FlagView` (via `ZoneCountry.country(for:)`, globe fallback for synthetic
  ids), label, checkmark on the selected id.
- Tap = apply immediately (`setTimeZoneAll`) and pop back to the Settings list —
  matching the web's live-apply picker with its Cancel/back control.
- Leading synthetic entry: id `""`, label "Follow System".

## Error handling

- Unknown or stale persisted zone ids fall back to `TimeZone.current` (existing face
  behavior), with the new fixed-offset resolution attempted first.
- `resolveForRatio` totals the band space, so any ratio resolves; no empty-band case.

## Testing

- **Core (Swift Testing, fixed `Date` values):** `ZoneCatalog` offset math and
  formatting (U+2212, padding), sort order, special-zone generation, follow-entry
  presence, local-zone injection; fixed-offset id resolution; a store test asserting
  a setter mutates `state` and persists.
- **App:** `xcodebuild` build + existing test target; simulator verification of the
  live loop — slider drag resizes the time, toggles show/hide sections, bar mode
  switches, zone pick re-renders the clock; `swiftlint` + `swiftformat` clean.

## Verification checklist

- Adjust: Time/Date sliders live-resize the face; values persist across relaunch;
  band-scoped (adjusting in landscape doesn't disturb the portrait band).
- Settings: all five toggles, three bar modes, and zone pick apply live and persist.
- Gear follows the chrome auto-hide rhythm; sheets accept on X and backdrop.
- Face still centers full-bleed at every preview size (layout debug previews).
