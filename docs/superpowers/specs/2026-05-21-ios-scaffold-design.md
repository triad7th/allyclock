# AllyClock iOS Scaffold Design

## Purpose

Scaffold a native iOS app for AllyClock inside the existing multi-app repository. The first iOS commit should establish a buildable Xcode project and app directory without adding product behavior or shared data extraction.

## Context

The repository currently contains the production Web app under `apps/web`. Deployment is handled through GitHub Actions and Netlify for Web only. Two sibling iOS repositories were reviewed for conventions:

- `allyfast` uses `AllyFast.xcodeproj`, app/test folders at the repository root, bundle ID `com.allyworld.AllyFast`, development team `77R8AFM4HU`, iOS deployment target `18.2`, iPhone + iPad support, and SwiftUI.
- `AllyMetronome` uses `AllyMetronome.xcodeproj`, bundle ID `AllyWorld.AllyMetronome`, development team `77R8AFM4HU`, iOS deployment target `18.2`, iPhone-only support, and SwiftUI.

AllyClock should follow the `allyfast` app naming and device-family pattern while living under `apps/ios`.
Unlike the sibling apps, AllyClock must support iPhone 8, which cannot run iOS 17 or later. The scaffold should therefore use an iOS 16 minimum deployment target.

## Target Structure

```text
apps/ios/
  AGENTS.md
  .swiftlint.yml
  .swiftformat
  AllyClock.xcodeproj/
  AllyClock/
    AllyClockApp.swift
    ContentView.swift
    Assets.xcassets/
    Preview Content/
  AllyClockTests/
    AllyClockTests.swift
```

## Xcode Project Settings

- Product name: `AllyClock`
- Bundle identifier: `com.allyworld.AllyClock`
- Development team: `77R8AFM4HU`
- Deployment target: `iOS 16.0`, to support iPhone 8
- Device family: iPhone + iPad
- Swift version: `5.0`, matching the existing sibling Xcode projects
- Info.plist generation: Xcode-generated, matching `allyfast`
- App icon: default generated asset catalog only

## Initial App

The first screen should be intentionally minimal:

- A SwiftUI `ContentView`
- Centered app title `AllyClock`
- Static supporting text such as `iOS scaffold ready`

The scaffold should not include timezone models, region lists, persistence, network code, widgets, or shared `packages/core` integration.

## Tooling

Add iOS-local formatting and lint configuration under `apps/ios`:

- `.swiftlint.yml`
- `.swiftformat`

Use the sibling projects as the style baseline, with paths adjusted for `AllyClock` and `AllyClockTests`.

Add `apps/ios/AGENTS.md` with iOS-specific instructions and expected commands. Do not add root `build:ios` or `test:ios` scripts until the generated project is verified and the command shape is clear.

## Validation

Validate the scaffold by building for an iOS simulator using XcodeBuildMCP when available, or `xcodebuild` as a fallback.

Expected validation target:

- Scheme: `AllyClock`
- Project: `apps/ios/AllyClock.xcodeproj`
- Platform: iOS Simulator
- Minimum supported runtime: iOS 16

## Out of Scope

- GitHub Actions iOS workflow
- TestFlight or App Store deployment
- Shared `packages/core` extraction
- Web app changes
- Real app icon or launch screen design
- Timezone/clock product logic
