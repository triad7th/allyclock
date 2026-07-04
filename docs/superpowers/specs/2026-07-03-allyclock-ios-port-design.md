# AllyClock iOS Port — Design Spec

**Date:** 2026-07-03
**Status:** Approved (brainstorm) — pending implementation plan
**Topic:** Native SwiftUI port of the AllyClock Web app to iOS, on a shared Swift core that tvOS/watchOS will later reuse.

## Goal

Port the AllyClock experience to iOS so it looks great on every iPhone and iPad, in any orientation, by mechanically translating the Web reference implementation onto native Apple APIs. This first effort delivers two faces with full config parity and establishes a reusable `AllyClockCore` Swift package as the foundation for the later tvOS and watchOS ports.

## Scope

**In scope**

- Two faces: **Fullscreen** and **World Cards**, each with **full config parity** — Adjust (per-aspect-ratio size) panels, Fullscreen Display toggles, World Cards Settings (city management), per-band field sets, and persistence.
- A **face picker** with live previews.
- A shared **`AllyClockCore`** Swift package (pure logic, no SwiftUI, unit-tested).
- Universal app: iPhone + iPad, all orientations, light/dark, localized + RTL.
- Minimum deployment target unchanged: **iOS 16.0** (iPhone 8 support).

**Out of scope (later specs)**

- Daily Schedule face (custom image, pan, drag markers, local image storage).
- Multi-screen "Screens" paging and per-screen config.
- Time Machine (clock mocking).
- tvOS and watchOS targets — they will depend on `AllyClockCore` in their own specs.

## Sequencing rationale

iOS is built first as the **foundation**: it already has a scaffold, and it proves the shared core once before tvOS/watchOS fan out from it. Each subsequent platform gets its own spec → plan → build cycle, reusing `AllyClockCore`.

## Architecture

A **local Swift Package Manager package** holds all platform-agnostic logic; the iOS app target holds only SwiftUI views, panels, and the picker. This mirrors the Web app's `core / features / layout` tiering and keeps the core testable without a simulator.

```
packages/AllyClockCore/                 ← new SwiftPM package (pure logic, no SwiftUI)
  Sources/AllyClockCore/
    Clock/        TimeFormatting (bigTime, dateParts, precise, zoneCity)
    Zones/        ZoneCountry (generated from IANA zone.tab), flag emoji
    Dimensions/   DimensionBand, DimensionRegistry, BandConfigStore
    Faces/        FullscreenFields, WorldCardsFields, presets, sizing math
  Tests/AllyClockCoreTests/

apps/ios/AllyClock/                      ← existing app target, references the package locally
  App/            AllyClockApp, RootFaceView (shell: chrome, auto-hide, picker host)
  Faces/Fullscreen/   FullscreenFaceView + Adjust/Display sheets
  Faces/WorldCards/   WorldCardsFaceView + Settings/Adjust sheets
  Shell/          FacePicker, ConfigureBar, SFIcon (SF Symbol layer)
```

The package lives at repo root `packages/AllyClockCore` (not inside `apps/ios/`) so the future `apps/tvos` and `apps/watchos` targets can depend on the same neutral package. This aligns with the root `CLAUDE.md` "future `packages/core`" note.

### Layer boundaries

- `AllyClockCore` depends on Foundation only. No SwiftUI, no app code.
- The iOS app depends on `AllyClockCore`. Views observe core stores/formatters; they own no timezone, band, or persistence logic.

## AllyClockCore (the foundation)

- **TimeFormatting** — timezone- and locale-aware `bigTime`, `dateParts`, `precise`, `zoneCity`, built on `Calendar` / `DateFormatter` (the Swift analog of the Web's `Intl.DateTimeFormat`). The ~30fps tick is supplied by the view layer's `TimelineView`; the core is pure formatting. The Web `ClockService` already documents the 33ms / iOS-`TimelineView` parity. Live time only in v1 (mock / Time-Machine hooks deferred).
- **ZoneCountry** — the same `zone.tab`-generated IANA→ISO-3166 table as the Web's `zone-country.ts`, regenerated into Swift. The country code renders as a **regional-indicator emoji flag** (🇺🇸), exactly as that file's comment prescribes for the Apple port. Regenerated from `/usr/share/zoneinfo/zone.tab` when tzdata updates.
- **DimensionRegistry** — the 8 built-in bands verbatim: `phone 0–0.62`, `tall 0.62–1.05`, `pad 1.05–1.45`, `lap 1.45–1.7`, `wide 1.7–1.95`, `mini 1.95–2.2`, `ultra 2.2–2.8`, `super 2.8–∞`. `resolveForRatio(width/height)` returns the containing band, with a nearest-band fallback so any ratio resolves.
- **BandConfigStore\<T: Codable\>** — generic per-band config persisted to **UserDefaults**, with the Web's `version` + additive `migrate` / `mergeBand` semantics (fill new fields from defaults, never wipe). `FullscreenConfigStore` and `WorldCardsConfigStore` subclass it.
- **Field models + presets** — ported 1:1 from the Web:
  - `FullscreenFields`: `bar` (mode `off|divider|progress`, sizeScale, opacity), `secondsVisible`, `zoneVisible`, `flagVisible`, `timeZone` (`""` = follow local), `sections` (`time`, `weekday`, `month`, `day`, `gmt` — each `visible`/`sizeScale`/`weight`/`opacity`), `bases` (`cqw`/`cqh`/`minCqh?`), `gaps`.
  - `WorldCardsFields`: `cards` (global list of `{id, zone, lineBreak}`, `MIN_CARDS 1 … MAX_CARDS 12`), per-band `sizes` (`time`, `date`).

## Adaptive sizing — handling every screen ratio

This is the "looks great in any dimension" requirement and the crux of the port. It works in **two layers**.

**Layer 1 — band selection (discrete).** `ratio = width / height` resolves via `DimensionRegistry` to one of the 8 bands. Each band carries its own tuned field set (different `cqw/cqh` bases, scales, weights, and section visibility). No device is hardcoded; the nearest-band fallback covers Split View, Stage Manager, and future devices.

**Layer 2 — fluid sizing within a band (continuous).** Inside a band, a section's size is computed from the measured container, not fixed:

```
base     = min(cqw% · W, cqh% · H)     // fits both width and height, never overflows
base     = max(base, minCqh% · H)      // optional legibility floor (extreme-wide ratios)
fontSize = base · sizeScale            // per-section user tuning
```

Gaps scale the same way: `gapMultiplier · min(2% · W, 3% · H)`; the date-parts gap is `betweenDateParts · 0.5em` of the date text. `cqw`/`cqh` are literally "percent of container width/height" — a 1:1 arithmetic port of the CSS container-query units in `varsFor()`.

**SwiftUI mechanics.** Each face wraps a `GeometryReader` (the documented native equivalent of the Web's `ContainerSizeDirective`). From `geometry.size` it derives the ratio, asks the store for the band's fields, and applies the sizing math per section inside a `TimelineView(.animation(minimumInterval: 1/30))`:

```swift
GeometryReader { geo in
  let size  = geo.size
  let ratio = size.width / max(size.height, 1)
  let fields = store.fieldsFor(ratio)
  TimelineView(.animation(minimumInterval: 1.0/30.0)) { ctx in
    FaceContent(fields: fields, container: size, now: ctx.date)
  }
}

func fontSize(_ b: SectionBase, _ scale: Double, in s: CGSize) -> CGFloat {
  var base = min(b.cqw/100 * s.width, b.cqh/100 * s.height)
  if let m = b.minCqh { base = max(base, m/100 * s.height) }
  return base * scale
}
```

**Edge cases handled explicitly.**

- **Rotation / Split View / Stage Manager:** the container size changes → `GeometryReader` re-fires → the band re-resolves → the layout adapts, wrapped in `withAnimation` for the same smooth transition the Web does.
- **Dynamic Type:** the face is pinned to `.dynamicTypeSize(.medium)` (as the current `ClockView` already does) because its size comes from the container math; honoring Dynamic Type would double-scale and overflow. Config panels/sheets use normal Dynamic Type.
- **Safe area:** the background is full-bleed (`ignoresSafeArea`), but content insets from the notch / Dynamic Island / home indicator so nothing clips — the native form of the Web's "letterbox, never a half-row."
- **Face-picker previews:** sizing reads the *container*, not the screen, so a face dropped into a small preview frame resolves the right band and renders faithfully — the same reason the Web sizes to the host box, not the window.

## iOS UI

- **RootFaceView** — hosts the active face full-bleed, `statusBar(hidden)`, ignores safe area. A tap toggles the chrome; chrome **auto-hides** after inactivity (port of `AutoHideDirective`).
- **Faces** — `FullscreenFaceView` and `WorldCardsFaceView` observe their config store and a `TimelineView`, rendering with the sizing math above. World Cards lays cards into rows delimited by `lineBreak`.
- **Config as sheets** — Adjust (per-band size sliders), Fullscreen Display (toggles: seconds / zone / flag / bar mode), World Cards Settings (add / remove / reorder cities). Sheets **apply live and commit on any dismissal** (swipe-down, backdrop, close) — matching the established AllyClock sheet rule (no confirm/cancel, no rollback).
- **Face picker** — a sheet listing the two faces with live previews; same apply-on-close behavior.
- **SFIcon** — the icon layer swaps the Web's SVG names to `Image(systemName:)` with the **same SF Symbol names** (`xmark`, `plus`, `gearshape`, `globe`, …), fulfilling the repo's icon-abstraction porting goal.

## Persistence & migration parity

- Per-band face config and the dimension registry persist to **UserDefaults** via `Codable`, replacing the Web's `localStorage` + `JSON`.
- Storage keys mirror the Web's namespacing but without the per-screen segment (Screens is out of scope): e.g. `allyclock.fullscreen.config`, `allyclock.worldcards.config`, `allyclock.dimensions`.
- Versioning + additive migration match the Web store semantics so future field additions fill from defaults without wiping user tuning.

## Testing & validation

- **Core unit tests (no simulator):** band resolution across the ratio range incl. nearest-band fallback; config round-trip + version migration; zone→country / flag emoji; formatters at fixed `Date`s with pinned timezones (per the repo's deterministic-time testing rule).
- **UI validation:** SwiftUI previews across the existing device/orientation/locale matrix — iPhone SE → 16 Pro Max, iPad mini → Pro 13", `ko_KR` / `ja_JP` / `ar_SA`-RTL — plus `xcodebuild` build + test on the iPhone 16 simulator. Faces validated at the face-picker preview size as well as full screen.

## Decisions log

1. **Sequencing:** iOS first, as the foundation that proves the shared core before tvOS/watchOS.
2. **iOS feature scope:** Fullscreen + World Cards only; defer Daily Schedule and Screens.
3. **Editing scope:** full config parity (Adjust + Display/Settings, per-band field sets, persistence).
4. **Architecture:** a shared SwiftPM `AllyClockCore` package + a thin iOS app target.
5. **Flags:** regional-indicator emoji, per the Web `zone-country.ts` porting note.
```
