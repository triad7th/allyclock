# AllyClock iOS

Guidance for coding agents working in the AllyClock iOS app. Served to both Claude Code (via `CLAUDE.md`) and Codex (via the sibling `AGENTS.md` symlink). Edit this file; the agent harness stays consistent for both.

## App Overview

This directory contains the native SwiftUI iOS app for AllyClock.

- Xcode project: `AllyClock.xcodeproj`
- App target: `AllyClock`
- Test target: `AllyClockTests`
- Minimum deployment target: iOS 26.0 (latest iOS only — no legacy support)
- Device family: iPhone and iPad, landscape-only (`UIRequiresFullScreen`)
- Pure clock logic lives in the local Swift package `packages/AllyClockCore` (now just face-config/dimension logic); this app is the SwiftUI rendering layer over it. Shared time models (zone catalog, zone/country/flag mapping, zone-aware formatting) come from the external Alloy repo (`github.com/triad7th/Alloy`) via the `AlloyTime` package product.

## Commands

Build for simulator:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Run unit tests:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Lint and format:

```sh
swiftlint
swiftformat AllyClock AllyClockTests
```

## Conventions

- Keep SwiftUI views small and focused.
- Use modern SwiftUI freely — Liquid Glass (`glassEffect`, `.buttonStyle(.glass)`), `UnevenRoundedRectangle`, Swift concurrency. No `if #available(...)` guards for older iOS.
- Sheets are content-hugging `GlassSheet` bottom panels (see `Shared/GlassSheet.swift`), not full-screen system sheets; they apply live and accept on any dismissal (X/backdrop) — no confirm/cancel.
- Layout debugging: launch with `-layoutDebug` (or `.environment(\.layoutDebug, true)` in a preview) to draw border guidelines and centering-delta panels; see `Shared/LayoutDebug.swift`.
