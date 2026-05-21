# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

AllyClock is a multi-app repository for clock experiences across platforms.

Current layout:

- `apps/web` contains the Angular 18 Web app.
- `apps/ios` contains the native SwiftUI iOS app (minimum target iOS 16.0 for iPhone 8 support).
- `.github/workflows/allyclock.yml` builds and deploys the Web app to Netlify. iOS CI is intentionally not added yet.
- `.agents/skills` contains repository-local Codex skills.

Future layout:

- `packages/core` will contain shared region/timezone data when shared logic is extracted.

## Development Commands

Run from the repository root:

```sh
npm run start:web
npm run build:web
npm run test:web
```

Root scripts delegate to `apps/web`. App-local commands can also be run from `apps/web`.

## Important Files

- `package.json` owns root orchestration scripts.
- `apps/web/package.json` owns Angular dependencies and app-local scripts.
- `apps/web/angular.json` defines Angular build, serve, test, assets, global styles, and scripts.
- `apps/web/src/main.ts` bootstraps the standalone Angular app.
- `apps/web/src/app/app.component.*` owns the page layout.
- `apps/web/src/app/card/card.component.*` renders a single clock card.
- `apps/web/src/app/services/location.service.ts` maps region IDs to flag URLs and timezone offsets.
- `netlify.toml` defines the Netlify build base and publish directory.

## Coding Conventions

- Keep changes narrowly scoped to the app or package they affect.
- Prefer app-local configuration and commands over adding global repo tooling.
- Keep Angular code in standalone-component style unless a broader migration is requested.
- Follow the existing TypeScript strictness in `apps/web/tsconfig.json`.
- Use two-space indentation, UTF-8, final newlines, and single quotes in TypeScript.
- Avoid broad refactors during structural moves.

## Testing Guidance

- For Web changes, run `npm run build:web` before finishing.
- For iOS changes, validate the build via XcodeBuildMCP or `xcodebuild` from `apps/ios`; see `apps/ios/AGENTS.md` for commands.
- For service logic, add focused Jasmine specs under the matching `*.spec.ts` file.
- For component behavior, prefer assertions against rendered DOM or component public API.
- When changing time-related behavior, use fixed `Date` values in tests so timezone assertions are deterministic.

## Deployment Notes

The GitHub Actions workflow:

- Runs on `main` pushes and manual dispatch.
- Uses Node.js 20.x.
- Runs `npm --prefix apps/web ci`.
- Runs `npm --prefix apps/web run build --if-present`.
- Deploys `apps/web/dist/allyclock/browser` to Netlify site `allyclock`.

Do not change deployment site IDs, app names, or secrets unless the task explicitly involves deployment.
