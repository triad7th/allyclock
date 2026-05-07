# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

Allyclock is a small Angular 18 application that displays clocks for multiple regions. It uses:

- Angular standalone components under `src/app`
- SCSS component styles
- Bootstrap 5 loaded globally through `angular.json`
- `moment-timezone` for timezone offset formatting
- Karma/Jasmine for unit tests
- GitHub Actions deployment to Azure Web App from `dist/allyclock/browser`

The app currently has no routes beyond the root component. The visible UI is composed by `AppComponent`, which renders several `CardComponent` instances with `state` inputs.

## Important Files

- `src/main.ts` bootstraps the standalone Angular app.
- `src/app/app.config.ts` configures zone change detection and routing.
- `src/app/app.component.*` owns the page layout.
- `src/app/card/card.component.*` renders a single clock card.
- `src/app/services/location.service.ts` maps region IDs to flag URLs and timezone offsets.
- `src/styles.scss` contains global styles.
- `angular.json` defines Angular build, serve, test, assets, global styles, and scripts.
- `.github/workflows/allyclock.yml` builds on pushes to `main` and deploys to Azure.

## Development Commands

Install dependencies:

```sh
npm install
```

Run the app locally:

```sh
npm start
```

Build for production:

```sh
npm run build
```

Run unit tests:

```sh
npm test
```

Notes:

- `npm start` maps to `ng serve` and serves on `http://localhost:4200/` by default.
- `npm run build` maps to `ng build`; production output is expected under `dist/allyclock/browser`.
- `npm test` starts Karma in watch/browser mode unless Angular/Karma options are changed.

## Current Repo Caveats

- `angular.json` appears to contain a stray `d` after the development serve build target block: `"buildTarget": "allyclock:build:development" }d`. Fix this before relying on `ng serve`, `ng build`, or CI.
- `AppComponent`'s generated spec expects `Hello, allyclock` in an `h1`, but the current template renders clock cards instead. Update this test before expecting the test suite to pass.
- `CardComponent.ngOnInit` calls `setInterval` without an interval delay and without cleanup. If modifying this component, consider adding an explicit delay and teardown.
- The test target in `angular.json` does not include Bootstrap CSS or scripts, while the app build target does. Account for that if tests depend on Bootstrap behavior or styling.

## Coding Conventions

- Keep Angular code in standalone-component style unless a broader migration is requested.
- Follow the existing TypeScript strictness in `tsconfig.json`; avoid adding `any` unless there is a clear boundary reason.
- Use two-space indentation, UTF-8, final newlines, and single quotes in TypeScript, matching `.editorconfig`.
- Prefer Angular template bindings over string interpolation in attributes. For example, use `[src]="getFlag()"` rather than `src="{{ getFlag() }}"` when touching templates.
- Keep shared timezone/flag mapping logic in `LocationService`; avoid duplicating region switch logic in components.
- Keep UI changes consistent with the current Bootstrap utility-class approach unless intentionally introducing a design-system change.
- Avoid broad refactors in this small app. Make narrowly scoped changes and update the related spec at the same time.

## Testing Guidance

- For service logic, add focused Jasmine specs under the matching `*.spec.ts` file.
- For component behavior, prefer assertions against rendered DOM or component public API rather than implementation details.
- When changing time-related behavior, use fixed `Date` values in tests so timezone assertions are deterministic.
- Because `moment-timezone` is allowed as a CommonJS dependency in `angular.json`, keep timezone changes compatible with the current import style unless changing the build configuration too.

## Deployment Notes

The GitHub Actions workflow:

- Runs on `main` pushes and manual dispatch.
- Uses Node.js 20.x.
- Runs `npm install` and `npm run build --if-present`.
- Uploads `./dist/allyclock/browser`.
- Deploys that artifact to Azure Web App `app-allyclock-prod-001`.

Do not change deployment paths, app names, or Azure workflow secrets unless the task explicitly involves deployment.
