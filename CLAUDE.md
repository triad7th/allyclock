# AGENTS.md

Guidance for coding agents working in AllyClock. This is the only `AGENTS.md`
in the repository; per-app rules live in the App guidance section below.
`CLAUDE.md` at the repo root is a byte-identical copy of this file (a real
copy, never a symlink — symlinks break some agent harnesses) — edit
`AGENTS.md`, then refresh the copy in the same commit.

## Product

AllyClock is a family of clock experiences across platforms. The Angular Web
app is the production reference implementation; the native SwiftUI iOS app
ships to TestFlight and the App Store. watchOS and tvOS are future ports.

Current source-of-truth order:

1. Code, package manifests, and tests.
2. This file.
3. `README.md` for setup and deployment.
4. Approved designs and plans in `docs/superpowers/`.

Older specs describe intent and may lag the implementation. Confirm facts in
the current code before relying on them.

### Design principle: the Web app is the porting reference

Native Apple ports (iOS, watchOS, tvOS) are meant to be almost mechanical
translations of the Web app, not creative rewrites. When designing Web
abstractions, prefer shapes that map 1:1 onto Apple platform APIs:

- Icons go through an abstraction layer keyed to SF Symbol names
  (`pencil`, `photo`, `plus`, `trash`), rendered as SVG on the Web. Apple
  ports swap the same semantic names to `Image(systemName:)`.
- Apply the same principle to naming, component boundaries, and data models:
  choose the form an Apple-platform engineer would reach for.

### Design principle: faces look great in any dimension

Every clock face must render well in any viewport — portrait, landscape,
square, and small embedded previews (the face-picker thumbnails).

- Faces size to their actual host container, never to
  `window.innerWidth`/`window.innerHeight`. Measure the host (e.g. with a
  `ResizeObserver`) so the same component renders full-screen and inside a
  scaled preview.
- Never show awkward partial content such as a row cut in half at a viewport
  edge; frame complete content and letterbox cleanly when there is spare
  space.
- Validate visual changes across multiple aspect ratios and at the
  face-picker preview size before considering them done.

### Design principle: sheets apply live

Configuration sheets apply changes immediately and accept on any dismissal
(X, backdrop, Escape). There are no confirm/cancel buttons and no rollback,
on either platform.

## Repository layout

```text
apps/
  web/                    Angular 21 Web app — the reference implementation
  ios/                    native SwiftUI iOS app (AllyClock.xcodeproj)
packages/
  AllyClockCore/          local Swift package: face-config + dimension logic
assets/                   shared design assets (app icon, marketing)
docs/superpowers/         approved specs and implementation plans
.github/workflows/        allyclock.yml (Web → Netlify),
                          ios-testflight.yml (iOS → TestFlight)
.claude/skills/           ticket-flow skills (canonical)
.agents/skills/           byte-identical copies of .claude/skills
```

Shared time models (zone catalog, zone/country/flag mapping, zone-aware
formatting) and shared glass chrome (icon abstraction, sheet, icon button,
auto-hide model) live in the external Alloy repo
(`github.com/triad7th/Alloy`). The Web app consumes them as the
`@allyworld/alloy-time` and `@allyworld/alloy-ui` npm tarballs pinned to
Alloy release URLs; the iOS app consumes the `AlloyTime` and `AlloyUI` Swift
package products. Always pin apps to the latest Alloy release; never
hand-roll zone/region/offset data in an app.

## App guidance

### apps/web — Angular 21

- Standalone components, zoneless, signals; Vitest via
  `@angular/build:unit-test`; SCSS component styles; Bootstrap 5 loaded
  globally through `angular.json`; native `Intl.DateTimeFormat` for all
  time/timezone formatting.
- Four tiers with one-way dependencies (`layout → features → core/shared`):

  ```text
  src/app/
    core/           app-wide singletons (ClockService, FaceConfigService,
                    DimensionRegistryService, animation-timing constants)
    shared/ui/      reusable UI primitives (IconComponent, SheetComponent,
                    NavHeaderComponent, IconButtonComponent,
                    ContainerSizeDirective, AutoHideDirective, tokens.scss)
    features/faces/ face-specific logic and components (face-registry,
                    fullscreen, schedule, world-cards, FacePreferenceService)
    layout/         app shell and chrome (AppComponent, ConfigureButton,
                    AdjustButton, FacePickerSheet, TimeMachine, FaceOverlay)
  ```

  `core/` and `shared/ui/` must not import from `features/` or `layout/`;
  `features/` may import from `core/` and `shared/ui/` only; `layout/` may
  import from all lower tiers.
- Cross-tier imports use the tsconfig path aliases `@core/*`, `@shared/*`,
  `@features/*`, `@layout/*` (no app-internal barrel files). Imports within
  a subtree that moves together stay relative.
- Type suffixes are kept: `.component`, `.service`, `.directive`, `.spec`,
  `.pipe`. Use `git mv` (never delete+recreate) when moving files.
- `core/clock.service.ts` exposes `now()`; the Time Machine overrides it
  with `setMock()`/`clearMock()` so every face can be previewed at an
  arbitrary instant. `core/animation-timing.ts` is the single source of
  truth for animation duration constants.
- Timezone catalog, zone→country/flag mapping, and offset formatting come
  from `@allyworld/alloy-time` (via `core/zone-catalog.ts`).
- Render icons through the SF-symbol-named icon layer
  (`shared/ui/icon/icon.component.ts`), never ad-hoc emoji or one-off icon
  fonts.
- Two-space indentation, UTF-8, final newlines, single quotes; follow the
  existing TypeScript strictness in `tsconfig.json`; prefer template
  bindings over interpolation in attributes; keep UI consistent with the
  Bootstrap utility-class approach.

### apps/ios — SwiftUI

- Xcode project `AllyClock.xcodeproj`; app target `AllyClock`, test target
  `AllyClockTests`. Minimum deployment target iOS 26.0 — latest iOS only,
  no `if #available(...)` guards. iPhone and iPad, landscape-only
  (`UIRequiresFullScreen`).
- The app is the SwiftUI rendering layer over `packages/AllyClockCore`
  (face-config/dimension logic) plus Alloy's `AlloyTime` and `AlloyUI`
  products.
- Use modern SwiftUI freely — Liquid Glass (`glassEffect`,
  `.buttonStyle(.glass)`), `UnevenRoundedRectangle`, Swift concurrency.
- Sheets are content-hugging `GlassSheet` bottom panels (from `AlloyUI`),
  not full-screen system sheets; they apply live and accept on any
  dismissal.
- The project uses synchronized folder groups: any file added under
  `AllyClock/` or `AllyClockTests/` joins its target automatically. Never
  hand-edit `project.pbxproj` to add, move, or remove files — create,
  `git mv`, or delete them on disk.
- Layout debugging: launch with `-layoutDebug` (or
  `.environment(\.layoutDebug, true)` in a preview) to draw border
  guidelines and centering-delta panels; see `Shared/LayoutDebug.swift`.
- Swift files map mechanically from the Web app:
  - Web `<name>.component.ts` → `<Name>View.swift`. Every SwiftUI view type
    ends in `View` — including sheets (`AdjustSheetView`, never
    `AdjustSheet`).
  - Web `<name>.ts` models/stores/logic (dropping `.service`/`.data`
    suffixes) → `<Name>.swift` (`DimensionRegistry`, `WorldCardsPresets`).
  - Folders mirror the web top level: `layout/` → `App/`,
    `features/faces/` → `Faces/`, `shared/` → `Shared/`.
  - One primary type per file; the file is named after that type.
  - Sanctioned deviations (kept, not bugs): `FacePickerView` (web:
    `face-picker-sheet.component.ts`) and the `*SettingsView` pair
    normalizing web's inconsistent `fullscreen-config` /
    `world-cards-settings` names.
- Keep SwiftUI views small and focused. Lint/format with SwiftLint and
  SwiftFormat (`/lint-and-format`).

### packages/AllyClockCore — Swift package

- Holds only face-config and dimension logic; keep it UI-free. Shared time
  models belong in Alloy, not here.
- Test with `swift test` from `packages/AllyClockCore`; changes here also
  ship through the iOS pipeline, so validate the iOS build too.

## Workflow

Ticket-driven development runs on GitHub Issues, the AllyClock Kanban board
(project 8, owner `triad7th`), and pull requests, via the repo skills in
`.claude/skills/` (byte-identical copies in `.agents/skills/`; `.claude` is
canonical — sync the copy in the same commit, never symlink):

1. Brainstorm → `create-issue` files the issue (Status: Ready). Small tickets
   carry acceptance criteria in the body; large ones link spec/plan docs in
   `docs/superpowers/`.
2. `/implement <N>` → branch `feat/<N>-slug` off fresh `main`, Status: In
   progress, TDD plus the verification matrix, commits formatted
   `[#N] <subject>` (support work `[#N] chore: ...`, likewise
   `fix:`/`test:`/`docs:`). Subjects are all lowercase except proper nouns
   (GitHub, PR, SwiftUI, Angular, TestFlight). Multiple commits per ticket.
   Never pushes.
3. Local review → `/create-pr` pushes and opens the PR (`Closes #N`,
   Status: In review). Review fixes are more `[#N]` commits pushed with
   `/commit-and-push`.
4. `/approve-pr <N>` → rebase-merge into `main`, delete remote and local
   branch, issue closes, Status: Done.

General rules:

- Preserve unrelated user changes. The worktree is often active and may
  change while you work; re-check `git status` before editing and before
  handoff.
- Use TDD for behavior changes: write the focused test, observe the expected
  failure, implement the smallest change, then run broader verification.
- Keep specs and plans proportional. Record decisions and traps; do not
  produce line-by-line code transcripts that become larger than the feature.
- Re-read the active design/plan before declaring a planned feature complete.
- Direct commits to `main` are for meta work only (docs, config, skills);
  feature and fix work goes through the ticket flow. Remember that pushes to
  `main` deploy (see Deployment). Do not push, deploy, or modify CI unless
  the user requests it.

## Commands

Web (run from the repository root; root scripts delegate to `apps/web`):

```bash
npm run start:web         # ng serve on port 4310
npm run build:web         # production build → apps/web/dist/allyclock/browser
npm run test:web          # Vitest unit tests
npm run lint:web          # ESLint via angular-eslint
npm run format:web        # Prettier write over apps/web/src
npm run format:check:web  # Prettier verification
```

iOS (run from `apps/ios`; prefer XcodeBuildMCP when available):

```bash
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock \
  -destination 'platform=iOS Simulator,name=iPhone 17' build   # or: test
swiftlint
swiftformat AllyClock AllyClockTests
```

Core package: `swift test` from `packages/AllyClockCore`.

## Verification

Match verification to the touched surfaces, then run the complete relevant
gate. Do not call the repository green when any required command failed,
timed out, or never completed.

On AllyDrive, run heavy Angular and Xcode jobs sequentially. Concurrent
builds can spend minutes in filesystem wait and produce misleadingly
incomplete runs.

Minimum handoff matrix:

| Change            | Required evidence                                                     |
| ----------------- | --------------------------------------------------------------------- |
| Web               | focused specs, `npm run test:web`, `npm run lint:web`, `npm run build:web` |
| iOS               | simulator build, `xcodebuild ... test` when tests are affected, SwiftLint clean |
| AllyClockCore     | `swift test` in the package, iOS simulator build                       |
| Cross-surface     | all of the above for every touched surface                             |
| Docs/skills only  | skill copy-sync check, diff review                                      |

When changing time-related behavior, use fixed `Date` values in tests so
timezone assertions are deterministic. For web faces, validate across
portrait, landscape, and the face-picker preview size.

Production CI builds and deploys but does not run tests, lint, or
formatting. Local verification is therefore mandatory; do not infer those
gates from a successful deployment build.

Ports follow the Ally-family scheme — each product owns a hundred block,
surfaces take deciles (x10 primary, x20 second, x90-99 infra, x00 never
used): AllyClock is 43xx (web 4310); 42xx AllyScore, 44xx AllyPiano,
45xx Alloy, 46xx+ reserved. The official port 4310 belongs to the human
developer. Never kill or reuse an existing server on that port. Start
agent-owned servers on a free port with `--port` and stop only the process
you created.

## Deployment

The Web workflow (`.github/workflows/allyclock.yml`):

- Runs on `main` pushes and manual dispatch, on Node.js 24.x.
- `npm --prefix apps/web ci`, then `npm --prefix apps/web run build`.
- Deploys `apps/web/dist/allyclock/browser` to the Netlify site `allyclock`.

The iOS workflow (`.github/workflows/ios-testflight.yml`):

- Runs on `main` pushes touching `apps/ios/` or `packages/AllyClockCore/`,
  and manual dispatch.
- Archives the `AllyClock` scheme on a macOS runner with automatic (cloud)
  signing for team `77R8AFM4HU`.
- Sets the build number to the workflow run number, so build numbers never
  collide; `MARKETING_VERSION` stays manual.
- Uploads to App Store Connect / TestFlight, authenticating with an App
  Store Connect API key from repo secrets `ASC_API_KEY_ID`,
  `ASC_API_ISSUER_ID`, and `ASC_API_KEY_P8` (the raw `.p8` contents).

Do not change deployment site IDs, app names, or secrets unless the task
explicitly involves deployment.
