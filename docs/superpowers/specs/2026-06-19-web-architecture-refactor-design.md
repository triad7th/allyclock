# AllyClock Web Architecture Refactor — Design

**Date:** 2026-06-19
**Status:** Approved (brainstorm), pending implementation plan
**Area:** `apps/web` (Angular 21 web app)

## Goal

Restructure `apps/web/src/app` from its current mixed grouping (one feature
bucket `faces/` beside type buckets `controls/ services/ ui/ config/`) into a
clean, idiomatic, modern **`core/ · shared/ui/ · features/ · layout/`** tiering
with enforced one-way dependencies, tsconfig path aliases, and two behavior-
preserving cross-cutting cleanups. No functional behavior changes.

## Decisions (from brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| Organizing principle | by-type vs feature vs tiers | **Core/UI/Features/Layout tiers** (one-way deps: `layout → features → core/shared`; `shared → nothing`). |
| Shared layer name | `ui/` vs `shared/ui` | **`shared/ui/`** (UI primitives nested under `shared/`). |
| Chrome layer name | `shell/` vs `layout/` | **`layout/`** (clearer; avoids the App-Shell-prerender collision). |
| File naming | keep suffixes vs v20 suffix-light | **Keep `.component`/`.service`/`.directive` suffixes** (documented in `apps/web/CLAUDE.md`). |
| Path aliases | now vs defer | **Now** — `@core/* @shared/* @features/* @layout/*`. |
| Barrels | internal vs none | **No app-internal barrels**; a curated `index.ts` reserved for the future `packages/core`. |
| Scope | structural-only vs + cleanups | **Structural + cross-cutting cleanups** (auto-hide dedup, single-source timing). |
| Sequencing | big-bang vs incremental | **Incremental, alias-first**, each step a `git mv` with `build:web` + `test:web` green before the next. |

## Architecture

### Dependency tiers

```
layout/      app chrome / composition root  — depends on features, shared, core
features/    the clock-face experiences      — depends on shared, core
core/        app-wide singletons + models    — depends on shared (types only); no feature/layout import
shared/ui/   presentational primitives       — depends on nothing (the Apple-port seams)
```

The rule that fails today: `services/dimension-registry.service.ts` (a core
singleton) imports **up** into `faces/dimension-band.ts` and
`faces/band-config-store.ts` (the feature layer). Reuniting the dimension model,
service, and base store under `core/dimensions/` makes the import legal and
one-directional.

### Target structure + move map

Every move is `git mv` (preserves blame). `app.config.ts` and `main.ts` stay at
their roots; only their imports update.

```
apps/web/src/app/
  app.config.ts                                  (unchanged location)
  core/
    clock.service.ts(+spec)                       ← services/
    face-config.service.ts                        ← services/  (panel open/adjust state; no face knowledge)
    location.service.ts(+spec)                    ← services/  (future packages/core)
    animation-timing.ts                           ← config/    (config/ dir removed)
    dimensions/
      dimension-band.ts                           ← faces/
      dimension-registry.service.ts(+spec)        ← services/  (fixes the backwards import)
      band-config-store.ts(+spec)                 ← faces/
  shared/ui/
    icon/  icon-button/  sheet/  nav-header/  container-size/   ← ui/
    auto-hide.directive.ts(+spec)                 (NEW — §Cross-cutting A)
    tokens.scss                                   ← ui/   (see angular.json coupling)
    _range-slider.scss                            ← src/_range-slider.scss  (keep partial underscore)
  features/
    faces/
      face-registry.ts                            ← faces/
      face-preference.service.ts(+spec)           ← services/  (depends on the face
                                                     registry → a faces concern, NOT core)
      fullscreen/   (face, fullscreen-config/, fullscreen-toggles/, store,
                     presets, fullscreen-style, clock-formatter)   ← faces/fullscreen/
      schedule/     (face, schedule-config/, schedule-marker/ [extracted to own dir],
                     store, presets, schedule-formatter, default-schedule) ← faces/schedule/
      world-cards/  (face, card/)                 ← faces/world-cards/
  layout/
    app.component.{ts,html,scss,spec}             ← src/app/ root
    configure-button/  adjust-button/             ← controls/
    face-picker-sheet/  time-machine/  face-overlay/  ← controls/
```

The now-empty `controls/`, `services/`, `config/`, `ui/`, and `faces/` (its loose
files moved into `core/` and `features/faces/`) directories are removed.

### Path aliases

In the base `apps/web/tsconfig.json` (inherited by `tsconfig.app.json` +
`tsconfig.spec.json`):

```json
"compilerOptions": {
  "baseUrl": ".",
  "paths": {
    "@core/*": ["src/app/core/*"],
    "@shared/*": ["src/app/shared/*"],
    "@features/*": ["src/app/features/*"],
    "@layout/*": ["src/app/layout/*"]
  }
}
```

- Imports become `@core/dimensions/dimension-registry.service`, etc. An import
  from `@core/…` inside a feature visibly signals the (legal) dependency
  direction.
- **No app-internal barrels** (preserves tree-shaking). The future
  `packages/core` will be a separate workspace package (`@allyclock/core`) with
  one curated `index.ts` — a distinct namespace, no collision with `@core/*`.
- **First implementation step** adds the aliases and converts a single import,
  then runs `npm run test:web` to **prove the `@angular/build:unit-test` (Vitest)
  pipeline resolves the aliases** before any bulk conversion. (There is no Nx to
  wire this automatically.)

## Build-coupling fixes (must ride with the relevant move)

- **`angular.json` `stylePreprocessorOptions.includePaths`** is currently
  `["src/app/ui"]` — what makes the bare `@use 'tokens'` resolve for its ~11
  importers. Update it to `["src/app/shared/ui"]` **in the same commit** that
  moves `tokens.scss`. This is an invisible coupling — missing it silently breaks
  every `@use 'tokens'`.
- `src/_range-slider.scss` (detached at `src/`) moves into `shared/ui/` keeping
  its leading underscore (it stays a Sass partial). It is itself a `@use 'tokens'`
  consumer (resolves via the updated `includePaths`). Update the `@use './range-slider'`
  line in `src/styles.scss` (line ~2) to the new path.
- **Untouched:** `netlify.toml` (`base apps/web`, `publish dist/allyclock/browser`),
  the GitHub Actions workflow `apps/web` paths, `outputPath dist/allyclock`, and
  the Bootstrap `node_modules` asset paths — all moves are inside `src/app`.

## Cross-cutting cleanup A — auto-hide directive

The auto-hide-on-idle pattern (a `visible` signal + `document:pointermove/
pointerdown/keydown` listeners + an `AUTO_HIDE_MS` timer + `ngOnDestroy` clear)
appears at **six sites**: the 4 controls (`configure-button`, `adjust-button`,
`time-machine`, `face-overlay`) and the 2 face gears (`fullscreen-face`,
`schedule-face`). Three of them redeclare a local `HIDE_DELAY_MS = 4000` instead
of importing `AUTO_HIDE_MS`: `configure-button.component.ts:13`,
`adjust-button.component.ts:4`, `schedule-face.component.ts:11` (the other three
already import `AUTO_HIDE_MS`).

Introduce `shared/ui/auto-hide.directive.ts`:

```ts
@Directive({ selector: '[appAutoHide]', exportAs: 'autoHide' })
export class AutoHideDirective {
  // host listeners: document:pointermove/pointerdown/keydown → reveal()
  readonly revealBlocked = input(false); // reveal() no-ops while true
  readonly holdVisible = input(false);   // auto-hide timer suppressed while true
  readonly visible: Signal<boolean>;     // idle visibility, read by the host
}
```

**Critical: the directive owns ONLY the idle timer + `reveal()` + the `visible`
signal. It does NOT compute final visibility.** Each host KEEPS its own `hidden`
binding/computed, ORing `ah.visible()` with its host-specific force-visible
terms — otherwise the dedup would auto-hide controls that must stay pinned. Exact
per-site wiring (verified against current bindings):

- **face-overlay** — `revealBlocked = faceConfig.open()`; host keeps
  `hidden = !ah.visible() || faceConfig.open() || sheetOpen()` (already a computed
  at `face-overlay.component.ts:41`).
- **time-machine** — `holdVisible = panelOpen()` (reproduces the timer guard at
  `time-machine.component.ts:268`); host keeps
  `hidden = !ah.visible() && !panelOpen() && !isMocked()` — `isMocked()` stays a
  host term, NOT a directive input.
- **configure-button** — `pinned = sheetOpen()` stays a host OR-term:
  `hidden = !ah.visible() && !pinned()`. Do NOT route `pinned` through
  `holdVisible` (today `pinned` does not suppress the timer; doing so would change
  re-arm behavior).
- **adjust-button** — truly guard-free; binds bare `ah.visible()`.

The 2 face gears MAY also adopt it (**optional**), but they are asymmetric:
- **fullscreen-face** — `revealBlocked = faceConfig.open()`; binds bare
  `ah.visible()` (current `!controlsVisible()`).
- **schedule-face** — `revealBlocked = configOpen()` AND keeps
  `hidden = !ah.visible() || configOpen()` (config is both reveal-block and a host
  OR-term).
If either gear doesn't migrate cleanly, leave it on its local timer.

All migrated sites import `AUTO_HIDE_MS` from `@core/animation-timing` and delete
their local timer/listeners (and the three `HIDE_DELAY_MS` literals).

## Cross-cutting cleanup B — single-source timing

`core/animation-timing.ts` becomes the single source of truth. A tiny bootstrap
(e.g. in `app.config.ts` provider or `app.component` constructor) writes the
durations to CSS custom properties on `:root`:

```ts
document.documentElement.style.setProperty('--sheet-anim', `${SHEET_ANIMATION_MS}ms`);
document.documentElement.style.setProperty('--face-anim',  `${FACE_TRANSITION_MS}ms`);
```

SCSS animations switch from `t.$sheet-anim` / `t.$face-anim` to
`var(--sheet-anim, 0.28s)` / `var(--face-anim, 0.3s)` at all **six** usage sites
(verified): `sheet.component.scss:18,34,44,48` (`$sheet-anim`) and
`app.component.scss:11,16` (`$face-anim`). Remove the `$sheet-anim`/`$face-anim`
definitions + their "MUST equal" comments from `tokens.scss` (lines ~39–45), and
update the matching "MUST equal" comments in `animation-timing.ts` (lines ~3,11)
to note the value is now pushed to the `--sheet-anim`/`--face-anim` CSS vars at
bootstrap. Values already match (280ms↔0.28s, 300ms↔0.3s) → behavior frozen.
(`AUTO_HIDE_MS` has no SCSS twin; the cleanup-A directive is its single consumer.)
Add a guard test asserting the `:root` CSS vars equal the TS constants, so the
SCSS/TS link can't silently drift again.

## Apple-port seams (preserve + optional hardening)

`shared/ui/` IS the port layer and stays intact: `icon` (SF-Symbol-keyed →
`Image(systemName:)`), `container-size` (→ `GeometryReader`/`.onGeometryChange`),
`tokens.scss` (iOS system-color names). **Optional:** in `icon.component.ts`,
derive `export type SfSymbol = keyof typeof ICON_PATHS` and type the `name` input
as `SfSymbol`, so a bad icon name fails at compile time (mirroring how a missing
SF Symbol surfaces in Swift). Drop if undesired.

## Sequencing (incremental, alias-first)

Each step is its own commit; `git mv` for moves; `npm run build:web` +
`npm run test:web` must be green before the next step (the build is the only gate
— no alias-boundary lint exists to catch a missed relative-path fixup).

1. **Aliases + proof.** Add tsconfig `baseUrl`/`paths`; convert one import to an
   alias; verify build + Vitest green.
2. **`core/`.** Move the singletons + the `dimensions/` cluster (the backwards
   import dies here); rewrite imports to `@core/*`.
3. **`shared/ui/`.** Move `ui/*` + `tokens.scss` (+ update `angular.json
   includePaths` same commit) + `range-slider.scss` (+ fix `styles.scss`).
4. **`features/faces/`.** Move `faces/*` (registry + the three face dirs).
5. **`layout/`.** Move `app.component.*` + the former `controls/*`. The only
   import to update for the `app.component` move is `main.ts` (line ~3, the
   `AppComponent` import); `app.config.ts` imports nothing from `app.component`.
6. **Auto-hide directive** + migrate the 4 controls.
7. **Single-source timing.**
8. **Housekeeping.** Extract `schedule-marker` into its own dir; update
   `apps/web/CLAUDE.md` (new structure, "keep suffixes", path aliases) + the root
   `CLAUDE.md` "Important Files" paths; optional SF-Symbol union; optional fix of
   the CI Node-version doc drift (workflow 24.x vs CLAUDE.md 20.x).

## Constraints honored

- **1:1 SwiftUI-port rule** — abstraction seams (`icon`/`container-size`/`tokens`)
  preserved in `shared/ui/`; folder taxonomy stays Angular-idiomatic (the rule is
  about abstraction shape, not folder isomorphism).
- **Agent-harness symlinks** — no new subdir gets its own `CLAUDE.md`, so no new
  `AGENTS.md` symlink is required. `apps/web/CLAUDE.md` (canonical, mirrored by the
  existing `AGENTS.md` symlink) is edited in place.
- **`.DS_Store`** — already in `.gitignore` and untracked; nothing to clean
  (the working-tree files are ignored). No action.

## Testing / verification

- Every step gated by `npm run build:web` + `npm run test:web` green (run from
  repo root).
- Existing specs move with their code (colocated) and keep passing unchanged —
  the only spec edits are import-path rewrites.
- New `auto-hide.directive.spec.ts`: `visible` starts true; auto-hides after
  `AUTO_HIDE_MS`; `revealBlocked` makes `reveal()` a no-op; `holdVisible`
  suppresses the hide; listeners cleaned on destroy.
- After the timing change, a guard test asserts the CSS vars are set from the TS
  constants (so the SCSS/TS link can't silently drift again).
- Final manual smoke: faces render, controls + overlays auto-hide/reveal, sheets
  animate, across a wide and a portrait ratio (the "looks great in any dimension"
  rule).

## Scope / Non-goals

- **No `packages/core` extraction** (its own project; aliases only reserve the
  conceptual space).
- **No suffix-light rename** (keep `.component`/`.service`/`.directive`).
- **No new faces, features, or behavior**; no zoneless/DI/control-flow changes
  (already idiomatic). Behavior is preserved except the two intentional dedups,
  which are behavior-equivalent.
- **No consolidation of the duplicated Intl GMT-offset logic** across
  `clock-formatter`, `schedule-formatter`, `location.service` — that belongs to
  the future `packages/core` effort.
```
