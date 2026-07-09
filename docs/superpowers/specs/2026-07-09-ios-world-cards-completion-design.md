# iOS World Cards Completion — Design

**Date:** 2026-07-09
**Status:** Approved
**Scope:** allyclock iOS. Bring the World Cards face to full web parity:
layout pass + Adjustment panel + Settings (Cities) panel.

## Context

The web World Cards face (`apps/web/src/app/features/faces/world-cards/`) is
the reference. iOS already renders the face (`WorldCardsFaceView` +
`WorldCardView`) and the shared model is complete
(`WorldCardsConfigStore.addCard/removeCard/setCardZone/setCardLineBreak/setSize`),
but the Adjust sheet shows a placeholder for this face, Settings does not
exist (the gear is gated to Fullscreen), and the layout has never had a
web-parity audit. Building blocks from prior phases are assumed:
AlloyUI (`GlassSheet`, `KnobCard/KnobLabel/KnobToggle/KnobField`,
`knobColumns`), `ZonePickerView`, `FlagView`, AlloyTime.

## 1. Face layout — general parity pass

Audit iOS against the web at 852×393, 1210×834, and 480×270, and fix every
visible difference. Known suspects (each verified, fixed only if actually
divergent):

- Row spacing: web gap between card rows vs iOS `VStack(spacing: 0)` +
  card padding.
- Card bottom rule: web draws it at content width with reduced opacity;
  iOS overlays a full-width, full-opacity 1px line.
- Horizontal overflow: the iOS `ViewThatFits` shrink ladder STAYS (it is the
  SwiftUI-idiomatic equivalent of the web's continuous scaling) but must be
  validated at each canonical size with the same card content.
- Vertical centering / letterboxing of the row block.

Exit criterion: side-by-side screenshots at the three sizes with no visible
structural differences (modulo the discrete-vs-continuous shrink), and new
snapshot references locking the result.

## 2. Adjustment panel

`AdjustSheetView`'s `.worldCards` case replaces the placeholder with the
web's two knobs:

- **Time size** and **Date size** sliders in `KnobCard`s, labels and
  ranges/steps taken verbatim from the web's
  `world-cards-config.component.html` (`data-knob="time-size"` /
  `"date-size"` inputs — exact min/max/step read during planning).
- Values apply to the band resolved from the live face ratio (the
  Fullscreen Adjust pattern) via
  `store.setSize(bandId, key: \.time/\.date, value:)`.
- Live-apply, no confirm/cancel (GlassSheet rule).

## 3. Settings panel — new `WorldCardsSettingsView`

Port of the web's `world-cards-settings.component.html` as a GlassSheet
body:

- A `KnobCard` listing the cards: header row "Cities" / "Break"
  (`KnobLabel`s), then one row per card:
  - Zone button: `FlagView` + abbreviated city label
    (`ZoneFormat.zoneCity(zone, abbreviate: true)`), opens the existing
    `ZonePickerView` inline (the Fullscreen settings pattern: picker
    replaces the panel content with a back affordance).
  - Break toggle (`KnobToggle`) bound to `setCardLineBreak`.
  - Remove ✕ button bound to `removeCard`, disabled when only one card
    remains (web behavior).
- "Add City" action (`KnobField` with a plus icon) bound to
  `addCard(zone:)` — the web's add flow decides the initial zone; iOS
  mirrors whatever it does (verified at planning: add-then-pick vs
  pick-then-add).
- All mutations broadcast through the store's existing methods; applies
  live; accepts on any dismissal.

## 4. Shell wiring

- `RootFaceView`: the gear (`gearshape`) shows for `.worldCards` as well as
  `.fullscreen`; the settings `GlassSheet` body switches on the active face
  (as the Adjust sheet already does) to host either `FullscreenSettingsView`
  or `WorldCardsSettingsView`.
- The `-openSettings` launch-arg hook works for World Cards (it already
  opens the sheet; the body now exists).

## 5. Testing

- Snapshot suite (`FaceSnapshotTests` conventions: frozen instant
  1_768_480_496, pinned `America/Los_Angeles`, iPhone 17 / iOS 26 refs):
  World Cards default at the three canonical sizes, a multi-row
  (`lineBreak`) variant, and a scaled (`sizes.time`/`sizes.date` off-1.0)
  variant. `WorldCardsFaceView` gains the same optional frozen-`now`
  injection Fullscreen has if it lacks one.
- Store behavior is already covered by `WorldCardsConfigStoreTests` in
  AllyClockCore — no new model tests needed.
- Full iOS suite green; existing Fullscreen snapshot refs byte-identical
  (this work must not touch shared layout code without re-verification).

## Out of scope

- Web changes (reference only).
- New AlloyUI components (everything needed exists; app-local composition
  only).
- The bar-mode/KnobSegment follow-up and other Alloy 0.4.0 grooming items.

## Risks

- The parity audit may surface differences whose fix touches
  `WorldCardView` sizing shared with the thumbnail previews — the
  face-picker thumbnails must be re-checked at 480×270.
- `ViewThatFits` interacts with frozen-`now` injection (both wrap the card
  tree); the snapshot task must confirm the ladder picks the same fit for
  frozen and live rendering at equal sizes.
