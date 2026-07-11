# AllyClock

Guidance for coding agents working in this repository. The same content is served to both Claude Code (via `CLAUDE.md`) and Codex (via `AGENTS.md`, which is a symlink to `CLAUDE.md`). Edit `CLAUDE.md` and the agent harness stays consistent for both.

## Project Overview

AllyClock is a multi-app repository for clock experiences across platforms.

Current layout:

- `apps/web` contains the Angular 21 Web app.
- `apps/ios` contains the native SwiftUI iOS app (targets the latest iOS; modern SwiftUI — including Liquid Glass — is used freely, with no legacy-OS availability guards).
- `packages/AllyClockCore` is the local Swift package backing the iOS app; it now holds only face-config and dimension logic. Shared time models (zone catalog, zone/country/flag mapping, zone-aware formatting) live in the external Alloy repo (`github.com/triad7th/Alloy`), consumed via the `AlloyTime` package product.
- `.github/workflows/allyclock.yml` builds and deploys the Web app to Netlify. `.github/workflows/ios-testflight.yml` archives the iOS app and uploads it to TestFlight on `main` pushes that touch `apps/ios/` or `packages/AllyClockCore/`.
- `.claude/skills` contains the canonical repository-local skills. Each `<name>/SKILL.md` is shared with Codex through a symlink (see "Agent Harness" below).
- `.agents/skills` is the Codex-facing view of the same skills. Each `<name>/SKILL.md` symlinks back to `.claude/skills/<name>/SKILL.md`; `<name>/agents/openai.yaml` is the Codex interface metadata.

Future layout:

- `packages/core` will contain shared region/timezone data when shared logic is extracted.

## Platform Porting Goal

The Web app is the reference implementation for native Apple ports (iOS, watchOS, tvOS). The goal is for porting to be almost mechanical, not a creative rewrite. When designing Web abstractions, prefer shapes that map 1:1 onto Apple platform APIs so the port is a direct translation:

- Build an icon abstraction layer keyed to SF Symbol names (e.g. `pencil`, `photo`, `plus`, `trash`), rendered as SVG on the Web. The Apple ports swap the same semantic names to `Image(systemName:)`.
- Apply the same principle to other abstractions (naming, component boundaries, data models): choose the form that an Apple-platform engineer would reach for, so native ports stay close to the Web source.

## Faces Look Great in Any Dimension

Every clock face must render well in any viewport dimension — portrait, landscape, square, and small embedded previews (e.g. the face-picker thumbnails). The guiding rule: in any given dimension, the clock must look great.

- Faces size to their actual host container, never to `window.innerWidth`/`window.innerHeight`. Measure the host (e.g. with a `ResizeObserver`) so the same component renders correctly full-screen and inside a scaled preview.
- Never show awkward partial content such as a row cut in half at a viewport edge; frame complete content (e.g. whole schedule rows/segments) and letterbox cleanly when there is spare space.
- Validate visual changes across multiple aspect ratios and at the face-picker preview size before considering them done.

## Agent Harness

This repo supports both Claude Code and Codex. The two harnesses share content through symlinks so switching agents never requires duplicating edits.

- `CLAUDE.md` files are canonical. `AGENTS.md` at the repo root, `apps/web`, and `apps/ios` are symlinks to the sibling `CLAUDE.md`.
- `.claude/skills/<name>/SKILL.md` is canonical. `.agents/skills/<name>/SKILL.md` is a symlink to it.
- `.agents/skills/<name>/agents/openai.yaml` is Codex-only interface metadata and has no Claude Code counterpart.
- Slash commands invoke the same skill from either harness: Claude Code uses `/<name>`, Codex uses `$<name>`.

When adding, removing, or renaming a skill:

1. Author or edit the body at `.claude/skills/<name>/SKILL.md`.
2. Add or refresh `.agents/skills/<name>/agents/openai.yaml` so Codex's launcher picks the skill up.
3. If creating a new skill, also create the `.agents/skills/<name>/SKILL.md` symlink: `ln -s ../../../.claude/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.md`.

When adding a new `CLAUDE.md` in a subdirectory, mirror it with an `AGENTS.md` symlink: `ln -s CLAUDE.md <dir>/AGENTS.md`.

## Development Commands

Run from the repository root:

```sh
npm run start:web
npm run build:web
npm run test:web
```

Root scripts delegate to `apps/web`. App-local commands can also be run from `apps/web`.

AllyClock's official dev-serve port is **4200** (Angular's default). Each Ally project owns a fixed port so several can run side by side: AllyClock 4200, AllyPiano 4201, AllyScore 4202, Alloy 4205. The official port belongs to the human dev: if it is already serving, never kill or reuse that server — agents doing their own debugging or checking start their own instance on a free port with `--port`.

## Important Files

- `package.json` owns root orchestration scripts.
- `apps/web/package.json` owns Angular dependencies and app-local scripts.
- `apps/web/angular.json` defines Angular build, serve, test, assets, global styles, and scripts.
- `apps/web/src/main.ts` bootstraps the standalone Angular app.
- `apps/web/src/app/layout/app.component.*` owns the page layout.
- `apps/web/src/app/features/faces/face-registry.ts` lists the selectable clock faces.
- `apps/web/src/app/features/faces/` contains one directory per clock face (fullscreen, world-cards).
- `apps/web/src/app/layout/` contains the configure button and face picker sheet.
- `apps/web/src/app/core/location.service.ts` maps region IDs to flag URLs and timezone offsets.
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
- For iOS changes, validate the build via XcodeBuildMCP or `xcodebuild` from `apps/ios`; see `apps/ios/CLAUDE.md` for commands.
- For service logic, add focused Vitest specs under the matching `*.spec.ts` file.
- For component behavior, prefer assertions against rendered DOM or component public API.
- When changing time-related behavior, use fixed `Date` values in tests so timezone assertions are deterministic.

## Deployment Notes

The Web workflow (`allyclock.yml`):

- Runs on `main` pushes and manual dispatch.
- Uses Node.js 24.x.
- Runs `npm --prefix apps/web ci`.
- Runs `npm --prefix apps/web run build --if-present`.
- Deploys `apps/web/dist/allyclock/browser` to Netlify site `allyclock`.

The iOS workflow (`ios-testflight.yml`):

- Runs on `main` pushes touching `apps/ios/` or `packages/AllyClockCore/`, and manual dispatch.
- Archives the `AllyClock` scheme on a macOS runner with automatic (cloud) signing for team `77R8AFM4HU`.
- Sets the build number to the workflow run number, so build numbers never collide; `MARKETING_VERSION` stays manual.
- Uploads to App Store Connect / TestFlight, authenticating with an App Store Connect API key from repo secrets `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, and `ASC_API_KEY_P8` (the raw `.p8` contents).

Do not change deployment site IDs, app names, or secrets unless the task explicitly involves deployment.
