# Screens: Multiple Per-Screen Face Configurations — Design

**Date:** 2026-07-01
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` — `layout/` (shell, screen host, screen sheet, controls), `core/` (screens service), `features/faces/*` (store scoping), `shared/ui/icon`

## Goal

Introduce **screens**: independently configured clock pages the user swipes
between, like the iPhone Photos app. Each screen owns a complete configuration
world — its selected face **and a full config set for every face** (settings +
adjustment per face). Users switch screens by swiping (touch), clicking edge
chevrons (mouse), or arrow keys; a new bottom-left **Screen button** opens a
screen-manager sheet. The Face button's icon becomes a true clock face; the
grid icon it used moves to the Screen button.

## Decisions (from brainstorm)

1. **Config per screen×face.** A screen remembers its selected face AND a full
   config for EVERY face. Switching a screen's face back and forth never loses
   that screen's tweaks for the other faces. Screens are fully independent.
2. **Screen button opens a screen-list sheet** (face-picker styling): one tile
   per screen with a live preview + face name, tap to jump, a per-tile delete
   (hidden when only 1 screen), and an `+ Add Screen` tile (disabled at cap).
3. **Navigation:** touch = drag-follow swipe (strip tracks the finger, snaps on
   release, velocity flicks count); mouse = clickable `‹` `›` chevrons at the
   left/right edges, vertically centered, shown only when a prev/next screen
   exists; keyboard = ArrowLeft/ArrowRight. Chevrons auto-hide with the other
   controls and are blocked while a config panel is open.
4. **Lifecycle:** existing users migrate — the current face + all face configs
   become Screen 1 exactly (nothing lost). A newly added screen starts from
   factory defaults (default face, default configs). Cap: 5 on Web.
5. **The screen cap is an IAP lever on iOS.** `MAX_SCREENS` is a single
   exported constant read through a `maxScreens()` method; the Apple port
   replaces that method's body with an entitlement check. No IAP wiring on Web.
6. **Architecture: screen-scoped DI (Approach A).** Face config stores stop
   being root singletons; each screen host provides its own store instances
   parameterized by a `SCREEN_ID` injection token. Chosen because drag-follow
   swipe shows two screens at once — each needs its own live store instance
   simultaneously, which DI scoping gives for free. (Rejected: reload-on-switch
   singletons — the visible neighbor would render the wrong config; a single
   mega-store — huge refactor of every face for no UX gain.)

## Data model — `ScreensService` (root)

`core/screens/screens.service.ts`, persisted to `allyclock.screens`:

```ts
export interface ScreenConfig {
  id: number;      // stable, monotonic (max existing + 1); storage namespace key
  faceId: string;  // this screen's selected face (replaces FacePreferenceService)
}

export interface ScreensState {
  version: 1;
  screens: ScreenConfig[];   // ordered; index = swipe order
  activeIndex: number;
}

export const MAX_SCREENS = 5; // Web default; iOS reads an entitlement instead
```

- Selectors: `screens()`, `activeIndex()`, `activeScreen()`, `maxScreens()`.
- Mutations: `addScreen()` (appends `{ id: nextId, faceId: DEFAULT_FACE_ID }`,
  no-op at `maxScreens()`, activates the new screen), `removeScreen(id)`
  (no-op at 1 screen; clamps `activeIndex`; deletes that screen's namespaced
  localStorage keys and IndexedDB image keys), `setActiveIndex(i)` (clamped),
  `setFace(screenId, faceId)`.
- `maxScreens(): number` returns `MAX_SCREENS` on Web — the method is the seam
  the Apple port swaps for an entitlement check (in-app purchase unlocks more
  screens). Callers never read the constant directly.
- Injector registry: screen hosts call `registerInjector(id, injector)` /
  `unregisterInjector(id)`; `injectorFor(id)` lets sheets render previews in a
  screen's DI context.
- `FacePreferenceService` is deleted; its storage key (`allyclock.face`)
  migrates into Screen 1's `faceId`.

## Screen host + scoped stores

New `layout/screen-host/screen-host.component.ts`:

- Input: `screen: ScreenConfig`. Renders the screen's active face component
  (from `face-registry`) via `NgComponentOutlet`, owning the two-layer face
  crossfade that currently lives in `AppComponent` (face switches happen inside
  a screen now).
- DI mechanics: component `providers` are static and cannot read an `@Input`,
  so the id comes from above — the strip instantiates each host through
  `NgComponentOutlet` with `ngComponentOutletInjector` =
  `Injector.create({ providers: [{ provide: SCREEN_ID, useValue: screen.id }] },
  parent)`. `SCREEN_ID` is a new `InjectionToken<number>`
  (`core/screens/screen-id.ts`). The host declares
  `providers: [FullscreenConfigStore, WorldCardsConfigStore, ScheduleStore]`;
  those stores inject `SCREEN_ID`, which resolves through the parent custom
  injector.
- Registers its `Injector` with `ScreensService` on init, unregisters on
  destroy.

Store changes (mechanical, no face-internal changes):

- `FullscreenConfigStore`, `WorldCardsConfigStore`, and the schedule stores
  drop `providedIn: 'root'` and inject `SCREEN_ID`.
- `storageKey()` becomes screen-namespaced:
  `allyclock.screen.<sid>.fullscreen.config`,
  `allyclock.screen.<sid>.world-cards.config`,
  `allyclock.screen.<sid>.schedule.presets`.
- Schedule images: IndexedDB keys become `s<sid>:image:<presetId>` so preset
  ids on different screens cannot collide.
- Face components and their Settings/Adjust panels already inject the stores;
  they now resolve the screen-scoped instance with **zero code change** (the
  panels render inside the face component subtree, hence inside the host's
  injector).

## Swipe strip (AppComponent)

- `AppComponent` renders a horizontal `.screens-strip`; only `activeIndex ± 1`
  screen hosts are mounted (3-window). Neighbors must be live for drag-follow;
  non-adjacent screens unmount so their timers stop.
- Touch: pointer events track a horizontal drag, the strip translates 1:1 with
  the finger; on release, snap to the nearest screen (a quick flick past a
  velocity threshold counts as a page turn). Snap-index math is a pure exported
  function for testability.
- Chevron click / ArrowLeft / ArrowRight: animated slide between neighbors
  using the existing `animation-timing` constants.
- Vertical gestures/scrolling inside faces are untouched (horizontal-intent
  detection before capturing the drag).
- Apple-port note: the strip maps to a paged `TabView(.page)`; the snap math
  and 3-window mounting are the Web-side equivalents.

## Chevrons

- `‹` / `›` buttons fixed at the left/right viewport edges, vertically
  centered. Left shows only when `activeIndex > 0`; right only when
  `activeIndex < screens().length - 1`.
- New SF icons `chevron.left` / `chevron.right` in the icon layer.
- `AutoHideDirective` + `revealBlocked` while `faceConfig.open()` — identical
  behavior to the face gear.

## Screen sheet + Screen button

- New bottom-left **Screen button** (fixed, mirrors the gear's styling at
  `left: 1rem; bottom: 1.5rem`), icon `square.grid.2x2` (moved from the Face
  button), auto-hides with the other controls.
- New `layout/screen-sheet/screen-sheet.component.ts` (uses `app-sheet` +
  nav-header, close = apply):
  - One tile per screen: a live scaled preview of that screen's face —
    rendered through `NgComponentOutlet` with `injector =
    screens.injectorFor(screen.id)` so the preview shows THAT screen's config —
    plus the face display name.
  - Tap tile → `setActiveIndex` + close.
  - Trash per tile (hidden when `screens().length === 1`) → `removeScreen`.
  - `+ Add Screen` tile → `addScreen()`; disabled at `maxScreens()`.
- Previews for non-adjacent screens need a live injector, so **the strip
  mounts every screen host while the sheet is open** (cap is small, ≤
  `maxScreens()`), reverting to the 3-window when it closes. Requirement:
  every tile shows its own screen's real config.

## Face picker changes

- The existing face-picker sheet now acts on the active screen:
  `screens.setFace(activeScreen().id, faceId)`.
- Its per-face previews render with the ACTIVE screen's injector so they show
  the active screen's config for each face.
- The **Face button icon** changes from `square.grid.2x2` to `clock` — and the
  `clock` SVG gains 12/3/6/9 tick marks so it reads as a true clock face (name
  unchanged; SF-valid).
- **Time Machine** switches from `clock` to a new `clock.arrow.circlepath`
  icon (real SF Symbol; "time travel" semantics) to avoid two clock-identical
  buttons.

## Migration

On first run with no `allyclock.screens` key, `ScreensService` seeds
`{ version: 1, screens: [{ id: 1, faceId: <legacy or default> }], activeIndex: 0 }`
and renames legacy storage so Screen 1 IS the user's current setup:

| Legacy | Becomes |
|---|---|
| `allyclock.face` | Screen 1 `faceId` (key removed) |
| `allyclock.fullscreen.config` | `allyclock.screen.1.fullscreen.config` |
| `allyclock.world-cards.config` | `allyclock.screen.1.world-cards.config` |
| `allyclock.schedule.presets` | `allyclock.screen.1.schedule.presets` |
| IDB `image:<id>` | `s1:image:<id>` |

Global (shared across screens, unchanged): Time Machine / clock mock
(`allyclock.clock.*`), dimension bands (`allyclock.dimensions`), the screens
list itself.

`removeScreen(id)` deletes `allyclock.screen.<id>.*` keys and `s<id>:image:*`
IDB entries.

## Testing

- **ScreensService:** seed/persist round-trip; add (activates, cap no-op via
  `maxScreens()`); remove (guard at 1, activeIndex clamp, storage cleanup);
  `setFace`; legacy migration (all five renames, nothing lost); injector
  registry.
- **Screen host:** provides scoped stores — two hosts mounted together hold
  independent configs writing to `allyclock.screen.<sid>.*` keys; face
  crossfade on `setFace`.
- **Strip:** chevron visibility at both ends and middle; ArrowLeft/Right moves
  `activeIndex`; snap-index pure function (position + velocity cases).
- **Screen sheet:** one tile per screen; add tile disabled at cap; trash hidden
  at 1; tap jumps; previews use `injectorFor`.
- **Icons:** face button renders `clock`; TM renders `clock.arrow.circlepath`;
  screen button renders `square.grid.2x2`.
- Fixed `Date` values for any time-dependent assertions (repo guidance).

## Out of scope (YAGNI)

Screen reordering; naming screens; cross-screen config copy; per-screen Time
Machine; actual IAP wiring (the `maxScreens()` seam is the entire Web-side
provision); rendering more than 3 screens live outside the screen sheet.
