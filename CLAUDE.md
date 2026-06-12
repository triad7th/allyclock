# AllyClock

Guidance for coding agents working in this repository. The same content is served to both Claude Code (via `CLAUDE.md`) and Codex (via `AGENTS.md`, which is a symlink to `CLAUDE.md`). Edit `CLAUDE.md` and the agent harness stays consistent for both.

## Project Overview

AllyClock is a multi-app repository for clock experiences across platforms.

Current layout:

- `apps/web` contains the Angular 21 Web app.
- `apps/ios` contains the native SwiftUI iOS app (minimum target iOS 16.0 for iPhone 8 support).
- `.github/workflows/allyclock.yml` builds and deploys the Web app to Netlify. iOS CI is intentionally not added yet.
- `.claude/skills` contains the canonical repository-local skills. Each `<name>/SKILL.md` is shared with Codex through a symlink (see "Agent Harness" below).
- `.agents/skills` is the Codex-facing view of the same skills. Each `<name>/SKILL.md` symlinks back to `.claude/skills/<name>/SKILL.md`; `<name>/agents/openai.yaml` is the Codex interface metadata.

Future layout:

- `packages/core` will contain shared region/timezone data when shared logic is extracted.

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

## Important Files

- `package.json` owns root orchestration scripts.
- `apps/web/package.json` owns Angular dependencies and app-local scripts.
- `apps/web/angular.json` defines Angular build, serve, test, assets, global styles, and scripts.
- `apps/web/src/main.ts` bootstraps the standalone Angular app.
- `apps/web/src/app/app.component.*` owns the page layout.
- `apps/web/src/app/faces/face-registry.ts` lists the selectable clock faces.
- `apps/web/src/app/faces/` contains one directory per clock face (fullscreen, world-cards).
- `apps/web/src/app/controls/` contains the configure button and face picker sheet.
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
- For iOS changes, validate the build via XcodeBuildMCP or `xcodebuild` from `apps/ios`; see `apps/ios/CLAUDE.md` for commands.
- For service logic, add focused Vitest specs under the matching `*.spec.ts` file.
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
