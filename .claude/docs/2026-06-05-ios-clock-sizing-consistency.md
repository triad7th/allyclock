# Session Summary — iOS Clock Sizing Consistency

**Date:** 2026-06-05
**Area:** `apps/ios` (SwiftUI clock layout)
**Outcome:** Shipped to `origin/main` (commits `516511d`, `883bdfc`)

## Problem

The clock typography looked inconsistent across devices:

1. **iPhone 17 Pro vs Pro Max** — fonts looked smaller on the Pro even after
   accounting for the screen-size difference.
2. **iPads** — mini and Air 11" looked good, but the iPad Pro 13" looked bigger
   than the others.

The app is **landscape-locked** on both iPhone and iPad
(`UISupportedInterfaceOrientations` = LandscapeLeft/Right).

## Root Causes (both verified on simulators, not just reasoned)

### 1. Max-class iPhones routed into the tablet bucket

`SizeBucket.detect` decided "tablet" from `horizontalSizeClass == .regular`.
Max-class iPhones report `.regular` in **landscape** (long-standing iOS
behaviour), while non-Max iPhones report `.compact`. So:

| Device | size class | bucket | big digits |
|---|---|---|---|
| iPhone 17 Pro | compact | standardPhone | 221pt (`height·0.55`, ultraLight) |
| iPhone 17 Pro Max | regular | **tablet** | 305pt (`width·0.32`, thin) |

The Pro Max was being sized with the **iPad tuning** — 1.38× larger digits while
the screen was only 1.09× taller → the Pro looked ~27% too small. Confirmed by a
temporary on-device debug overlay that printed the detected bucket/size class.

### 2. Tablet digits inflated on squarer iPads

Tablet `bigSize` was `max(height·0.46, width·0.32)`. For most iPads the width
term wins, but the Pro 13" is squarer (4:3 ≈ 1.33 aspect vs the others'
1.44–1.52), so its **height** term won and inflated the digits — filling ~91% of
width vs ~85% on the others. Because the two terms cross over *within* the iPad
aspect-ratio range, neither `max` nor `min` is consistent.

## Fixes (`apps/ios/AllyClock/Time/ClockSizing.swift`)

1. **Tablet detection by size, not size class:**
   ```swift
   static func detect(size: CGSize) -> SizeBucket {
       if min(size.width, size.height) >= 600 { return .tablet }  // real iPads only
       return size.height < 390 ? .compactPhone : .standardPhone
   }
   ```
   The shorter side cleanly separates phones (≤440pt) from iPads (iPad mini
   landscape is 744pt). The now-unused `horizontalSizeClass` plumbing was removed
   from `detect` and from `ClockView` (`@Environment(\.horizontalSizeClass)`).

2. **Width-driven tablet digits:**
   ```swift
   case .tablet:
       return size.width * 0.32
   ```
   The time is a wide horizontal string, so a fixed fraction of width gives every
   iPad the same fill regardless of aspect ratio. Leaves mini/Air/Pro 11
   essentially unchanged; only brings the Pro 13" down (471pt → 437pt).

## Tests (`apps/ios/AllyClockTests/AllyClockTests.swift`)

- Updated `SizeBucket.detect` tests to the size-only signature.
- Added regression test: **Pro Max landscape (956×440) stays `standardPhone`**.
- Added iPad mini tablet test.
- Replaced the old `max`-based tablet tests with width-driven assertions.
- All `ClockSizingTests` pass (`** TEST SUCCEEDED **`).

## Verification

- Unit tests via `xcodebuild ... test` on iPhone 17 Pro simulator.
- Visual: launched the app on iPhone 17 Pro / Pro Max and on iPad mini / Pro 11 /
  Pro 13 simulators in landscape and compared screenshots. Phones render as true
  scaled copies; iPads fill the same fraction of width.

## How to reproduce the visual check

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/allyclock-dd build
APP=/tmp/allyclock-dd/Build/Products/Debug-iphonesimulator/AllyClock.app
BID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")
xcrun simctl boot "iPhone 17 Pro Max"; sleep 8
xcrun simctl install "iPhone 17 Pro Max" "$APP"
xcrun simctl launch "iPhone 17 Pro Max" "$BID"
xcrun simctl io "iPhone 17 Pro Max" screenshot /tmp/shot.png
```

## Notes / Follow-ups

- The `600pt` tablet threshold is the shorter screen dimension. If Apple ships a
  phone taller than ~440pt in landscape, revisit (still well under 600).
- `infoSize` / `stackGap` remain height-driven; they were not the visible
  outlier, but if future tuning wants stricter iPad consistency, consider making
  them width-driven for the tablet bucket too.
- An Xcode-generated shared scheme (`AllyClock.xcodeproj/xcshareddata/`) was left
  untracked — it is a build artifact, not part of this change.
