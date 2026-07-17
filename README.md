# AllyClock

**Beautiful clock faces for every screen — on the web and on iOS.**

AllyClock turns any display into a purpose-built clock: a fullscreen clock,
world-time cards with country flags, and a daily-schedule face that overlays
the day's plan on the time. Faces are designed to look great in **any**
dimension — portrait, landscape, square, or a tiny picker thumbnail.

> **Status:** the Angular Web app is live in production (Netlify); the
> native SwiftUI iOS app (iPhone + iPad, landscape) ships to TestFlight on
> every `main` push and has been submitted to the App Store (v1.0).

## Architecture

**One principle: the Web app is the porting reference.** The Angular app is
the canonical implementation; native Apple ports (iOS today, watchOS/tvOS
later) are near-mechanical translations of it. Abstractions are chosen to
map 1:1 onto Apple APIs — icons are keyed to SF Symbol names (SVG on the
web, `Image(systemName:)` on iOS), components and files translate by naming
convention, and sheets behave identically (apply live, accept on any
dismissal).

Shared logic lives in the external **[Alloy](https://github.com/triad7th/Alloy)**
repo: time models (zone catalog, zone→country/flag mapping, zone-aware
formatting) and glass UI chrome, consumed by the web as `@allyworld/alloy-time`
/ `@allyworld/alloy-ui` and by iOS as the `AlloyTime` / `AlloyUI` Swift
package products.

## Repo layout

```text
apps/
  web/               Angular 21 Web app — reference implementation
                     (standalone components, zoneless + signals, Vitest)
  ios/               native SwiftUI iOS app (iOS 26+, Liquid Glass)
packages/
  AllyClockCore/     local Swift package: face-config + dimension logic
assets/              app icon and marketing assets
docs/superpowers/    approved specs and implementation plans
.github/workflows/   Web → Netlify, iOS → TestFlight
.claude/skills/      ticket-flow skills (canonical; .agents/skills/ holds
                     byte-identical copies)
```

## Development workflow

Work is ticket-driven on GitHub Issues + the AllyClock Kanban board
(project 8) via repo skills: brainstorm → `create-issue` (Status: Ready) →
`/implement <N>` (feature branch, TDD, `[#N]`-prefixed commits) → local
review → `/create-pr` (Status: In review) → PR review → `/approve-pr <N>`
(rebase-merge to `main`, branch cleanup, Status: Done). Direct commits to
`main` are reserved for meta work (docs, config, skills).

Agent guidance lives in `AGENTS.md` (with `CLAUDE.md` as a byte-identical
copy for the Claude Code harness).

## Getting started — Web

```bash
npm --prefix apps/web ci   # install web dependencies
npm run start:web          # ng serve → http://localhost:4310
```

Commands (run from the repo root; they delegate to `apps/web`):

```bash
npm run start:web          # dev server on port 4310
npm run build:web          # production build → apps/web/dist/allyclock/browser
npm run test:web           # Vitest unit tests
npm run lint:web           # ESLint (angular-eslint)
npm run format:web         # Prettier write
npm run format:check:web   # Prettier check
```

Ports follow the Ally-family scheme (each product owns a hundred block):
AllyClock is 43xx with the web app on **4310**.

## Getting started — iOS

Open `apps/ios/AllyClock.xcodeproj` in Xcode, or build from the CLI:

```bash
cd apps/ios
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock \
  -destination 'platform=iOS Simulator,name=iPhone 17' build   # or: test
```

Core-package tests: `swift test` from `packages/AllyClockCore`.
Lint/format: `swiftlint` and `swiftformat AllyClock AllyClockTests` from
`apps/ios`.

## Tooling

- **Web:** Angular 21, Bootstrap 5, SCSS, Vitest, ESLint + Prettier.
- **iOS:** SwiftUI (iOS 26+, Liquid Glass), SwiftLint + SwiftFormat,
  synchronized folder groups (files on disk join targets automatically).
- **Shared:** Alloy packages pinned to the latest Alloy release.

## Deployment

- **Web:** GitHub Actions builds `apps/web` on every `main` push and deploys
  `apps/web/dist/allyclock/browser` to the Netlify site `allyclock`.
- **iOS:** `main` pushes touching `apps/ios/` or `packages/AllyClockCore/`
  archive the app with cloud signing and upload to TestFlight; the build
  number is the workflow run number, the marketing version is manual.
