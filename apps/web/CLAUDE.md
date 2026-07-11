# AllyClock Web

Guidance for coding agents working in the AllyClock Web app. Served to both Claude Code (via `CLAUDE.md`) and Codex (via the sibling `AGENTS.md` symlink). Edit this file; the agent harness stays consistent for both.

## App Overview

This directory contains the Angular 21 Web app for AllyClock.

- Angular standalone components live under `src/app`.
- SCSS component styles are used throughout the app.
- Bootstrap 5 is loaded globally through `angular.json`.
- Native `Intl.DateTimeFormat` is used for all time/timezone formatting.
- Vitest (via `@angular/build:unit-test`) is configured for unit tests; the app is zoneless and uses signals.

## Architecture

The app is structured into four tiers with one-way dependencies (`layout → features → core / shared`):

```
src/app/
  core/           — app-wide singletons (ClockService, FaceConfigService,
                    DimensionRegistryService, animation-timing constants)
  shared/ui/      — reusable UI primitives (IconComponent, SheetComponent, NavHeaderComponent,
                    IconButtonComponent, ContainerSizeDirective, AutoHideDirective, tokens.scss)
  features/faces/ — face-specific logic and components (face-registry, fullscreen, schedule,
                    world-cards, FacePreferenceService)
  layout/         — app shell and chrome (AppComponent, ConfigureButtonComponent,
                    AdjustButtonComponent, FacePickerSheetComponent, TimeMachineComponent,
                    FaceOverlayComponent)
```

### Dependency rule

- `core/` and `shared/ui/` must not import from `features/` or `layout/`.
- `features/` may import from `core/` and `shared/ui/` only.
- `layout/` may import from all lower tiers.

### Path aliases

Use these tsconfig path aliases for cross-tier imports (no app-internal barrel files):

| Alias | Resolves to |
|-------|-------------|
| `@core/*` | `src/app/core/*` |
| `@shared/*` | `src/app/shared/*` |
| `@features/*` | `src/app/features/*` |
| `@layout/*` | `src/app/layout/*` |

### Naming conventions

- Type suffixes are **kept**: `.component`, `.service`, `.directive`, `.spec`, `.pipe`.
- Use `git mv` (never delete+recreate) when moving files to preserve blame history.
- Imports *within* a subtree that moves together stay relative. Cross-tier imports use the `@tier/…` alias.

## Commands

Run these commands from the repository root:

```sh
npm run start:web
npm run build:web
npm run test:web
```

Or from this directory:

```sh
npm start
npm run build
npm test
```

## Important Files

- `src/main.ts` bootstraps the standalone Angular app.
- `src/app/layout/app.component.*` owns the page layout.
- `src/app/features/faces/face-registry.ts` lists the selectable clock faces; each face lives in its own directory under `src/app/features/faces/`.
- `src/app/features/faces/schedule/` contains the Daily Schedule face: image panning, drag-marker config, and IndexedDB image storage.
- `src/app/layout/` contains the "Face" button (opens the face picker sheet) and the Time Machine control (mocks the clock via `ClockService`).
- `src/app/core/clock.service.ts` exposes `now()`; the Time Machine overrides it with `setMock()`/`clearMock()` so every face can be previewed at an arbitrary instant.
- `src/app/core/animation-timing.ts` is the single source of truth for animation duration constants (also pushed to CSS custom properties at bootstrap).
- `src/app/shared/ui/icon/icon.component.ts` is the icon abstraction layer keyed to SF Symbol names.
- `src/styles.scss` contains global styles.
- `angular.json` defines Angular build, serve, test, assets, global styles, and scripts.

## Conventions

- Keep Angular code in standalone-component style unless a broader migration is requested.
- Follow the existing TypeScript strictness in `tsconfig.json`; avoid adding `any` unless there is a clear boundary reason.
- Use two-space indentation, UTF-8, final newlines, and single quotes in TypeScript.
- Prefer Angular template bindings over interpolation in attributes.
- Timezone catalog, zone→country/flag mapping, and offset formatting come from `@allyworld/alloy-time` (`ZoneCountry`, `ZoneFormat`, via `core/zone-catalog.ts`); never hand-roll region/offset maps in the app.
- Keep UI changes consistent with the current Bootstrap utility-class approach unless intentionally introducing a design-system change.
- This app is the reference implementation for native Apple ports (iOS/watchOS/tvOS); prefer abstractions that map 1:1 onto Apple APIs so porting is mechanical (see the root `CLAUDE.md` "Platform Porting Goal").
- Use SF Symbol names for iconography. Render icons through the icon abstraction layer keyed to SF Symbol names (e.g. `pencil`, `photo`, `plus`, `trash`) as SVG, rather than ad-hoc emoji or one-off Bootstrap Icons, so the Apple ports swap to `Image(systemName:)` with the same names.
- Clock faces must look great in any dimension: size to the host container (e.g. via `ResizeObserver`), not `window.innerWidth`/`window.innerHeight`, and frame complete content (no half-rows) across portrait, landscape, and the face-picker preview size. See the root `CLAUDE.md` "Faces Look Great in Any Dimension".
