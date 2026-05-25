# AllyClock Web

Guidance for coding agents working in the AllyClock Web app. Served to both Claude Code (via `CLAUDE.md`) and Codex (via the sibling `AGENTS.md` symlink). Edit this file; the agent harness stays consistent for both.

## App Overview

This directory contains the Angular 21 Web app for AllyClock.

- Angular standalone components live under `src/app`.
- SCSS component styles are used throughout the app.
- Bootstrap 5 is loaded globally through `angular.json`.
- `moment-timezone` is used for timezone offset formatting.
- Vitest (via `@angular/build:unit-test`) is configured for unit tests; the app is zoneless and uses signals.

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
- `src/app/app.component.*` owns the page layout.
- `src/app/card/card.component.*` renders a single clock card.
- `src/app/services/location.service.ts` maps region IDs to flag URLs and timezone offsets.
- `src/styles.scss` contains global styles.
- `angular.json` defines Angular build, serve, test, assets, global styles, and scripts.

## Conventions

- Keep Angular code in standalone-component style unless a broader migration is requested.
- Follow the existing TypeScript strictness in `tsconfig.json`; avoid adding `any` unless there is a clear boundary reason.
- Use two-space indentation, UTF-8, final newlines, and single quotes in TypeScript.
- Prefer Angular template bindings over interpolation in attributes.
- Keep shared timezone/flag mapping logic in `LocationService` until a shared `packages/core` module exists.
- Keep UI changes consistent with the current Bootstrap utility-class approach unless intentionally introducing a design-system change.
