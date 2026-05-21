# CLAUDE.md

Guidance for coding agents working in the AllyClock iOS app. Served to both Claude Code (via `CLAUDE.md`) and Codex (via the sibling `AGENTS.md` symlink). Edit this file; the agent harness stays consistent for both.

## App Overview

This directory contains the native SwiftUI iOS app for AllyClock.

- Xcode project: `AllyClock.xcodeproj`
- App target: `AllyClock`
- Test target: `AllyClockTests`
- Minimum deployment target: iOS 16.0 for iPhone 8 support
- Device family: iPhone and iPad

## Commands

Build for simulator:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Run unit tests:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Lint and format:

```sh
swiftlint
swiftformat AllyClock AllyClockTests
```

## Conventions

- Keep SwiftUI views small and focused.
- Guard APIs newer than iOS 16 with `if #available(...)`.
- Do not raise the deployment target without confirming iPhone 8 support is no longer required.
- Keep product logic out of the scaffold until shared clock requirements are designed.
