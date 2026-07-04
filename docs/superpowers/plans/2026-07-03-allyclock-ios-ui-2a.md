# AllyClock iOS UI — Plan 2a (Shell + Faces + Picker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the AllyClock iOS app rendering the Fullscreen and World Cards faces on `AllyClockCore` across every iPhone/iPad ratio, switchable via a face picker — the first on-device milestone.

**Architecture:** Link the `AllyClockCore` SwiftPM package into the existing Xcode app, then build a thin SwiftUI layer: `SFIcon`/`FlagView` primitives, a `FullscreenFaceView` and `WorldCardsFaceView` that read the core's config stores + formatters inside a `GeometryReader` + `TimelineView`, and a `RootFaceView` shell with an auto-hiding face picker that replaces `ContentView`. Editing panels (Adjust/Display/Settings) are deferred to Plans 2b/2c — this plan renders the built-in default config only.

**Tech Stack:** Swift 5 app target, SwiftUI (iOS 16), `AllyClockCore` (Swift 6 package), XCTest, `xcodebuild`.

## Global Constraints

- Xcode project: `apps/ios/AllyClock.xcodeproj`, app target `AllyClock`, test target `AllyClockTests`, deployment target iOS 16.0, `objectVersion = 56`. Do NOT change `DEVELOPMENT_TEAM`, bundle ids, or signing.
- The package lives at repo `packages/AllyClockCore`; from the `.xcodeproj` directory (`apps/ios`) its relative path is `../../packages/AllyClockCore`.
- Foundation/SwiftUI only in the app; all clock/zone/dimension/config logic comes from `AllyClockCore` — the app adds NO timezone, band, or persistence logic of its own.
- Icons via SF Symbol names (`globe`, `gearshape`, `square.grid.2x2`, `xmark`, `plus`). Flags are regional-indicator emoji from `ZoneCountry.flagEmoji(for:)`, globe fallback otherwise.
- Faces render full-bleed on a near-black background (`#050505`), text `#fafafa`; size to the measured container (`GeometryReader`), never the screen; pin faces to `.dynamicTypeSize(.medium)`.
- Sizing math comes from the core (`fullscreenFontSize`, `fieldsFor(ratio)`); do not re-derive it.
- Build/verify command (run from `apps/ios`):
  `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build`
- Two-space indentation, final newline. Commit after each task with the trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
  ```
- Web reference (read for intent, do not modify): `apps/web/src/app/features/faces/{fullscreen,world-cards}/` and `apps/web/src/app/shared/ui/`.

## File Structure

```
apps/ios/AllyClock.xcodeproj/project.pbxproj   — MODIFY: link AllyClockCore package; register new files; enable portrait
apps/ios/AllyClock/
  Shared/SFIcon.swift            — Image(systemName:) wrapper
  Shared/FlagView.swift          — emoji flag from a zone, globe fallback
  Shared/FontWeightMap.swift     — Int (100–700) → Font.Weight
  Faces/FaceKind.swift           — face registry enum (id, displayName)
  Faces/FullscreenFaceView.swift — Fullscreen render
  Faces/WorldCardsFaceView.swift — World Cards render
  Faces/WorldCardView.swift      — one card row
  App/RootFaceView.swift         — shell: face host + auto-hiding picker button
  App/FacePickerView.swift       — sheet listing faces
  ContentView.swift              — MODIFY: body becomes RootFaceView()
apps/ios/AllyClockTests/
  FaceKindTests.swift
  FlagResolutionTests.swift
```

The legacy `Views/{BigTime,InfoLine,ClockView}.swift` and `Time/{ClockFormatter,ClockSizing}.swift` remain in the target (untouched) — `ContentView` simply stops referencing `ClockView`. Removing them is out of scope.

---

### Task 1: Link AllyClockCore into the Xcode app

**Files:**
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`
- Create: `apps/ios/AllyClock/Shared/CoreBridge.swift` (temporary link-proof; replaced in Task 2)

**Interfaces:**
- Produces: the `AllyClock` app target links product `AllyClockCore`; `import AllyClockCore` compiles in app sources.

The project uses deterministic `AC0000…` object ids. Add a local package reference, a product dependency, and a framework link using the four new ids below. Make these exact edits to `project.pbxproj`:

- [ ] **Step 1: Add a PBXBuildFile for the linked product**

In the `PBXBuildFile` section (after line ending the section, before `/* End PBXBuildFile section */`), add:

```
		AC0000000000000000000102 /* AllyClockCore in Frameworks */ = {isa = PBXBuildFile; productRef = AC0000000000000000000101 /* AllyClockCore */; };
```

- [ ] **Step 2: Link the product in the app's Frameworks phase**

In `PBXFrameworksBuildPhase` object `AC0000000000000000000014` (the app target's, currently `files = ( );`), set:

```
		AC0000000000000000000014 /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				AC0000000000000000000102 /* AllyClockCore in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
```

- [ ] **Step 3: Register the local package on the app target and the project**

In the `PBXNativeTarget` object `AC0000000000000000000010` (app target), add a `packageProductDependencies` array (it currently has none) right after the `name = AllyClock;` line's block — insert before `productName = AllyClock;`:

```
			packageProductDependencies = (
				AC0000000000000000000101 /* AllyClockCore */,
			);
```

In the `PBXProject` object `AC0000000000000000000001`, add a `packageReferences` array right after `mainGroup = AC0000000000000000000002;`:

```
			packageReferences = (
				AC0000000000000000000100 /* XCLocalSwiftPackageReference "AllyClockCore" */,
			);
```

- [ ] **Step 4: Add the local package reference + product dependency objects**

Add these two new sections immediately before `/* Begin PBXBuildFile section */` (order among sections is not significant to Xcode):

```
/* Begin XCLocalSwiftPackageReference section */
		AC0000000000000000000100 /* XCLocalSwiftPackageReference "AllyClockCore" */ = {
			isa = XCLocalSwiftPackageReference;
			relativePath = "../../packages/AllyClockCore";
		};
/* End XCLocalSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
		AC0000000000000000000101 /* AllyClockCore */ = {
			isa = XCSwiftPackageProductDependency;
			productName = AllyClockCore;
		};
/* End XCSwiftPackageProductDependency section */
```

- [ ] **Step 5: Add a temporary link-proof source file**

Create `apps/ios/AllyClock/Shared/CoreBridge.swift`:

```swift
import AllyClockCore

// Temporary: proves AllyClockCore is linked and importable. Replaced by real
// Shared/ types in Task 2.
enum CoreBridge {
    static let coreVersion = AllyClockCore.version
}
```

Register it in `project.pbxproj`: add a `PBXFileReference` (`AC0000000000000000000110`), a `PBXBuildFile` (`AC0000000000000000000111`), a `Shared` `PBXGroup` (`AC0000000000000000000112`) as a child of the `AllyClock` group `AC0000000000000000000011`, and add `AC0000000000000000000111` to the app `Sources` phase `AC0000000000000000000013`. The file reference:

```
		AC0000000000000000000110 /* CoreBridge.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = CoreBridge.swift; sourceTree = "<group>"; };
```
Build file:
```
		AC0000000000000000000111 /* CoreBridge.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000110 /* CoreBridge.swift */; };
```
Group (add to `PBXGroup` section; and add `AC0000000000000000000112` to group `AC0000000000000000000011`'s `children`):
```
		AC0000000000000000000112 /* Shared */ = {
			isa = PBXGroup;
			children = (
				AC0000000000000000000110 /* CoreBridge.swift */,
			);
			path = Shared;
			sourceTree = "<group>";
		};
```
Add `AC0000000000000000000111 /* CoreBridge.swift in Sources */,` to the `files` list of the app `Sources` phase `AC0000000000000000000013`.

- [ ] **Step 6: Build to verify the link**

Run (from `apps/ios`):
```bash
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: `** BUILD SUCCEEDED **`. If Xcode reports the package can't be resolved, confirm the `relativePath` resolves: from `apps/ios`, `ls ../../packages/AllyClockCore/Package.swift` must exist.

- [ ] **Step 7: Commit**

```bash
git add apps/ios/AllyClock.xcodeproj/project.pbxproj apps/ios/AllyClock/Shared/CoreBridge.swift
git commit -m "feat(ios): link AllyClockCore package into the app"
```

---

### Task 2: Shared primitives — SFIcon, FlagView, font-weight map; enable portrait

**Files:**
- Create: `apps/ios/AllyClock/Shared/SFIcon.swift`
- Create: `apps/ios/AllyClock/Shared/FlagView.swift`
- Create: `apps/ios/AllyClock/Shared/FontWeightMap.swift`
- Delete: `apps/ios/AllyClock/Shared/CoreBridge.swift`
- Test: `apps/ios/AllyClockTests/FlagResolutionTests.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj` (register new files, drop CoreBridge, add portrait orientation)

**Interfaces:**
- Consumes: `AllyClockCore.ZoneCountry.flagEmoji(for:)`.
- Produces:
  - `struct SFIcon: View { init(_ name: String); var body }` — renders `Image(systemName: name).resizable().scaledToFit()`.
  - `enum FlagResolution { static func emoji(forZone zone: String) -> String? }` (thin pass-through to `ZoneCountry.flagEmoji`, kept app-side so views depend on one name and it's unit-testable).
  - `struct FlagView: View { init(zone: String) }` — the emoji in a `Text`, or `SFIcon("globe")` when nil.
  - `func fontWeight(_ w: Int) -> Font.Weight`.

- [ ] **Step 1: Write the failing test**

`apps/ios/AllyClockTests/FlagResolutionTests.swift`:

```swift
import XCTest
@testable import AllyClock

final class FlagResolutionTests: XCTestCase {
    func test_emojiForKnownZone() {
        XCTAssertEqual(FlagResolution.emoji(forZone: "America/Los_Angeles"), "\u{1F1FA}\u{1F1F8}")
        XCTAssertEqual(FlagResolution.emoji(forZone: "Asia/Seoul"), "\u{1F1F0}\u{1F1F7}")
    }
    func test_nilForCountrylessZone() {
        XCTAssertNil(FlagResolution.emoji(forZone: "UTC"))
    }
    func test_fontWeightMapsBands() {
        XCTAssertEqual(fontWeight(200), .thin)
        XCTAssertEqual(fontWeight(300), .light)
        XCTAssertEqual(fontWeight(700), .bold)
    }
}
```

- [ ] **Step 2: Run to verify FAIL**

Run (from `apps/ios`): `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test`
Expected: compile failure — `FlagResolution`/`fontWeight` undefined. (The test file must be registered in the test target — see Step 6.)

- [ ] **Step 3: Implement `FontWeightMap.swift`**

```swift
import SwiftUI

/// Maps the web's numeric font weights (100–700) to SwiftUI weights.
func fontWeight(_ w: Int) -> Font.Weight {
    switch w {
    case ..<150: return .ultraLight
    case ..<250: return .thin
    case ..<350: return .light
    case ..<450: return .regular
    case ..<550: return .medium
    case ..<650: return .semibold
    default: return .bold
    }
}
```

- [ ] **Step 4: Implement `SFIcon.swift`**

```swift
import SwiftUI

/// SF Symbol by semantic name — the iOS side of the shared icon abstraction.
struct SFIcon: View {
    let name: String
    init(_ name: String) { self.name = name }
    var body: some View {
        Image(systemName: name).resizable().scaledToFit()
    }
}
```

- [ ] **Step 5: Implement `FlagView.swift`**

```swift
import SwiftUI
import AllyClockCore

/// Country flag for an IANA zone as a regional-indicator emoji, or a globe when
/// the zone has no country (UTC, Etc/*, unknown).
enum FlagResolution {
    static func emoji(forZone zone: String) -> String? { ZoneCountry.flagEmoji(for: zone) }
}

struct FlagView: View {
    let zone: String
    var body: some View {
        if let flag = FlagResolution.emoji(forZone: zone) {
            Text(flag)
        } else {
            SFIcon("globe")
        }
    }
}
```

- [ ] **Step 6: Update `project.pbxproj`** — delete `CoreBridge.swift`, add the three new `Shared` files to the app target and `FlagResolutionTests.swift` to the test target, and enable portrait.

- Remove the `CoreBridge.swift` `PBXFileReference` (`…110`), its `PBXBuildFile` (`…111`) and its entry in the app `Sources` phase, and delete the file from disk (`rm apps/ios/AllyClock/Shared/CoreBridge.swift`).
- Add file references + build files for `SFIcon.swift` (`…113`/`…114`), `FlagView.swift` (`…115`/`…116`), `FontWeightMap.swift` (`…117`/`…118`); add the three build-file ids to the app `Sources` phase `AC0000000000000000000013`; add the three file refs to the `Shared` group `…112`.
- Add `FlagResolutionTests.swift` file ref (`…120`) + build file (`…121`); add `…121` to the test `Sources` phase `AC0000000000000000000042`; add `…120` to the `AllyClockTests` group `AC0000000000000000000041`.
- Enable portrait: in both app-target build configs (`AC0000000000000000000073` Debug and `AC0000000000000000000074` Release), change `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone` and `_iPad` to include portrait, e.g. `iPhone` → `"UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"`, `iPad` → the same plus `UIInterfaceOrientationPortraitUpsideDown`.

Each `PBXFileReference` follows the pattern:
```
		AC0000000000000000000113 /* SFIcon.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SFIcon.swift; sourceTree = "<group>"; };
```
and each build file:
```
		AC0000000000000000000114 /* SFIcon.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000113 /* SFIcon.swift */; };
```

- [ ] **Step 7: Run the test to verify PASS**

Run: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test`
Expected: build succeeds; `FlagResolutionTests` 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/ios
git commit -m "feat(ios): add SFIcon, FlagView, font-weight map; enable portrait"
```

---

### Task 3: FullscreenFaceView

**Files:**
- Create: `apps/ios/AllyClock/Faces/FullscreenFaceView.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj` (register file)

**Interfaces:**
- Consumes: `DimensionRegistry`, `FullscreenConfigStore` (`fieldsFor(_:)`), `TimeFormatting.bigTime/dateParts`, `fullscreenFontSize`, `SectionBase`, `FlagView`, `SFIcon`, `fontWeight`.
- Produces: `struct FullscreenFaceView: View { init(store: FullscreenConfigStore) }`.

Render mirrors `fullscreen-face.component.html`/`.scss`: centered column of `time` (digits + a leading flank with AM/PM top and seconds bottom), a `bar` (divider or progress), then a baseline date row (`weekday · month day · [globe]gmt`, with optional zone/flag — hidden by default). Uses the default config from Task 6 of the core (`bar.mode == .progress`, `secondsVisible`, `weekday`/`gmt` visible, `zoneVisible`/`flagVisible` false).

- [ ] **Step 1: Implement `FullscreenFaceView.swift`**

```swift
import SwiftUI
import AllyClockCore

struct FullscreenFaceView: View {
    let store: FullscreenConfigStore
    private let bg = Color(red: 0x05/255, green: 0x05/255, blue: 0x05/255)
    private let fg = Color(red: 0xfa/255, green: 0xfa/255, blue: 0xfa/255)

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let ratio = size.width / max(size.height, 1)
            let f = store.fieldsFor(ratio)
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
                content(f, size, ctx.date)
            }
        }
        .background(bg).ignoresSafeArea()
        .foregroundStyle(fg)
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }

    @ViewBuilder
    private func content(_ f: FullscreenFields, _ size: CGSize, _ now: Date) -> some View {
        let zone = f.timeZone.isEmpty ? TimeZone.current : (TimeZone(identifier: f.timeZone) ?? .current)
        let big = TimeFormatting.bigTime(now, locale: .current, timeZone: zone)
        let parts = TimeFormatting.dateParts(now, locale: .current, timeZone: zone)
        let timeSize = fullscreenFontSize(f.bases.time, sizeScale: f.sections.time.sizeScale,
                                          width: size.width, height: size.height)
        let dateBase = f.bases.date
        let gapUnit = min(size.width * 0.02, size.height * 0.03)

        VStack(spacing: 0) {
            timeRow(big, f, timeSize)
            bar(f, timeSize, now)
                .padding(.top, f.gaps.timeToBar * gapUnit)
                .padding(.bottom, f.gaps.barToDate * gapUnit)
            dateRow(parts, f, dateBase, size, now, zone)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func timeRow(_ big: TimeFormatting.BigTime, _ f: FullscreenFields, _ timeSize: CGFloat) -> some View {
        HStack(alignment: .top, spacing: timeSize * 0.04) {
            Text(big.digits)
                .font(.system(size: timeSize, weight: fontWeight(f.sections.time.weight)))
                .monospacedDigit()
                .opacity(f.sections.time.opacity)
            VStack(alignment: .leading, spacing: 0) {
                if let ampm = big.ampm {
                    Text(ampm).font(.system(size: timeSize * 0.15, weight: .light)).opacity(0.85)
                }
                Spacer(minLength: 0)
                if f.secondsVisible {
                    Text(big.seconds).font(.system(size: timeSize * 0.1, weight: .light)).opacity(0.28)
                }
            }
        }
    }

    @ViewBuilder
    private func bar(_ f: FullscreenFields, _ timeSize: CGFloat, _ now: Date) -> some View {
        let w = timeSize * 56 / 68
        switch f.bar.mode {
        case .off:
            EmptyView()
        case .divider:
            Rectangle().fill(fg).opacity(f.bar.opacity).frame(width: w, height: 1.5)
        case .progress:
            let d = Calendar.current.dateComponents([.second, .nanosecond], from: now)
            let progress = (Double(d.second ?? 0) + Double(d.nanosecond ?? 0) / 1e9) / 60
            ZStack(alignment: .leading) {
                Rectangle().fill(fg.opacity(0.16))
                Rectangle().fill(fg).opacity(0.85).frame(width: w * progress)
            }
            .frame(width: w, height: 2).clipShape(RoundedRectangle(cornerRadius: 2))
        }
    }

    private func dateRow(_ parts: TimeFormatting.DateParts, _ f: FullscreenFields,
                         _ base: SectionBase, _ size: CGSize, _ now: Date, _ zone: TimeZone) -> some View {
        func partSize(_ scale: Double) -> CGFloat {
            fullscreenFontSize(base, sizeScale: scale, width: size.width, height: size.height)
        }
        let gap = f.gaps.betweenDateParts * partSize(1) * 0.5
        return HStack(alignment: .firstTextBaseline, spacing: gap) {
            if f.sections.weekday.visible {
                Text(parts.weekday.uppercased())
                    .font(.system(size: partSize(f.sections.weekday.sizeScale), weight: fontWeight(f.sections.weekday.weight)))
                    .opacity(f.sections.weekday.opacity)
                Text("·").opacity(0.4)
            }
            Text(parts.month.uppercased())
                .font(.system(size: partSize(f.sections.month.sizeScale), weight: fontWeight(f.sections.month.weight)))
                .opacity(f.sections.month.opacity)
            Text(parts.day)
                .font(.system(size: partSize(f.sections.day.sizeScale), weight: fontWeight(f.sections.day.weight)))
                .opacity(f.sections.day.opacity)
            if f.zoneVisible {
                Text("·").opacity(0.4)
                Text(TimeFormatting.zoneCity(zone.identifier, abbreviate: f.flagVisible))
                    .font(.system(size: partSize(1), weight: .light)).opacity(0.6)
            }
            if f.sections.gmt.visible {
                Text("·").opacity(0.4)
                HStack(spacing: partSize(1) * 0.12) {
                    SFIcon("globe").frame(width: partSize(1) * 0.82, height: partSize(1) * 0.82)
                    Text(parts.gmt)
                        .font(.system(size: partSize(f.sections.gmt.sizeScale), weight: fontWeight(f.sections.gmt.weight)))
                }
                .opacity(f.sections.gmt.opacity)
            }
            if f.flagVisible, ZoneCountry.country(for: zone.identifier) != nil {
                FlagView(zone: zone.identifier)
                    .frame(width: partSize(1) * 0.9, height: partSize(1) * 0.9)
            }
        }
        .textCase(.uppercase)
        .tracking(partSize(1) * 0.32)
    }
}

#Preview("Fullscreen · devices") {
    FacePreviewGrid { FullscreenFaceView(store: FullscreenConfigStore(registry: DimensionRegistry())) }
}
```

Note: `FacePreviewGrid` is a preview helper defined in Task 5. If previewing this file before Task 5 exists, temporarily replace the `#Preview` body with `FullscreenFaceView(store: FullscreenConfigStore(registry: DimensionRegistry())).frame(width: 852, height: 393)`.

- [ ] **Step 2: Register the file** in `project.pbxproj`: file ref (`…130`) + build file (`…131`) added to the app `Sources` phase, plus a new `Faces` `PBXGroup` (`…132`) child of the `AllyClock` group `…011`, containing `…130`.

- [ ] **Step 3: Build to verify**

Run: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build`
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit**

```bash
git add apps/ios
git commit -m "feat(ios): render Fullscreen face on the core"
```

---

### Task 4: WorldCardsFaceView + WorldCardView

**Files:**
- Create: `apps/ios/AllyClock/Faces/WorldCardView.swift`
- Create: `apps/ios/AllyClock/Faces/WorldCardsFaceView.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `WorldCardsConfigStore` (`fieldsFor`, `sample`), `WorldCardConfig`, `WorldCardsFields`, `TimeFormatting.bigTime/compactOffset/zoneCity`, `FlagView`, `SFIcon`.
- Produces: `struct WorldCardsFaceView: View { init(store: WorldCardsConfigStore) }`, `struct WorldCardView: View { init(zone: String, timeScale: Double, dateScale: Double) }`.

Render mirrors `world-cards-face.component.html` (cards grouped into rows by `lineBreak`) and `card.component.*` (flag square + right-aligned time column: big digits with AM/PM-top/seconds-bottom flank, then a date line `MMM d, yyyy · CITY · [globe]offset`).

- [ ] **Step 1: Implement `WorldCardView.swift`**

```swift
import SwiftUI
import AllyClockCore

struct WorldCardView: View {
    let zone: String
    let timeScale: Double
    let dateScale: Double
    private let fg = Color.white

    var body: some View {
        let tz = TimeZone(identifier: zone) ?? .current
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
            let now = ctx.date
            let big = TimeFormatting.bigTime(now, locale: .current, timeZone: tz)
            HStack(spacing: 12) {
                FlagView(zone: zone)
                    .frame(width: 92 * timeScale, height: 92 * timeScale)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                VStack(alignment: .trailing, spacing: 3 * timeScale) {
                    HStack(alignment: .top, spacing: 4 * timeScale) {
                        Text(big.digits)
                            .font(.system(size: 72 * timeScale, weight: fontWeight(250)))
                            .monospacedDigit()
                        VStack(alignment: .leading, spacing: 0) {
                            if let ampm = big.ampm {
                                Text(ampm).font(.system(size: 17 * timeScale, weight: .light)).opacity(0.85)
                            }
                            Spacer(minLength: 0)
                            Text(big.seconds).font(.system(size: 17 * timeScale, weight: .light)).opacity(0.32)
                        }
                    }
                    dateLine(now, tz)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.vertical, 16)
            .overlay(alignment: .bottom) { Rectangle().fill(fg).frame(height: 1) }
            .foregroundStyle(fg)
        }
    }

    private func dateLine(_ now: Date, _ tz: TimeZone) -> some View {
        let df = DateFormatter()
        df.locale = .current; df.timeZone = tz
        df.setLocalizedDateFormatFromTemplate("MMMdyyyy")
        let cal = df.string(from: now)
        let city = TimeFormatting.zoneCity(zone, abbreviate: true)
        let offset = TimeFormatting.compactOffset(now, timeZone: tz)
        return HStack(alignment: .firstTextBaseline, spacing: 6 * dateScale) {
            Text(cal.uppercased())
            if !city.isEmpty { Text("·").opacity(0.5); Text(city) }
            Text("·").opacity(0.5)
            HStack(spacing: 3 * dateScale) {
                SFIcon("globe").frame(width: 15 * dateScale, height: 15 * dateScale)
                Text(offset)
            }
        }
        .font(.system(size: 14 * dateScale, weight: .regular))
        .textCase(.uppercase)
        .tracking(2)
        .opacity(0.7)
        .lineLimit(1)
    }
}
```

- [ ] **Step 2: Implement `WorldCardsFaceView.swift`**

```swift
import SwiftUI
import AllyClockCore

struct WorldCardsFaceView: View {
    let store: WorldCardsConfigStore
    private let bg = Color(red: 0x05/255, green: 0x05/255, blue: 0x05/255)

    var body: some View {
        GeometryReader { geo in
            let ratio = geo.size.width / max(geo.size.height, 1)
            let f = store.fieldsFor(ratio)
            let rows = Self.rows(f.cards)
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 32) {
                        ForEach(row, id: \.id) { card in
                            WorldCardView(zone: card.zone, timeScale: f.sizes.time, dateScale: f.sizes.date)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 24)
        }
        .background(bg).ignoresSafeArea()
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }

    /// Split cards into rows: a card with `lineBreak == true` ends its row.
    static func rows(_ cards: [WorldCardConfig]) -> [[WorldCardConfig]] {
        var out: [[WorldCardConfig]] = []
        var row: [WorldCardConfig] = []
        for c in cards {
            row.append(c)
            if c.lineBreak { out.append(row); row = [] }
        }
        if !row.isEmpty { out.append(row) }
        return out
    }
}

#Preview("World Cards · devices") {
    FacePreviewGrid { WorldCardsFaceView(store: WorldCardsConfigStore(registry: DimensionRegistry())) }
}
```

- [ ] **Step 3: Register both files** in `project.pbxproj` (WorldCardView `…133`/`…134`, WorldCardsFaceView `…135`/`…136`) — file refs in the `Faces` group `…132`, build files in the app `Sources` phase.

- [ ] **Step 4: Build to verify**

Run: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build`
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Commit**

```bash
git add apps/ios
git commit -m "feat(ios): render World Cards face on the core"
```

---

### Task 5: Face registry, picker, root shell; swap ContentView

**Files:**
- Create: `apps/ios/AllyClock/Faces/FaceKind.swift`
- Create: `apps/ios/AllyClock/App/FacePickerView.swift`
- Create: `apps/ios/AllyClock/App/RootFaceView.swift`
- Create: `apps/ios/AllyClock/App/FacePreviewGrid.swift` (preview helper used by Tasks 3–4 previews)
- Modify: `apps/ios/AllyClock/ContentView.swift`
- Test: `apps/ios/AllyClockTests/FaceKindTests.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `FullscreenFaceView`, `WorldCardsFaceView`, `DimensionRegistry`, `FullscreenConfigStore`, `WorldCardsConfigStore`, `SFIcon`.
- Produces: `enum FaceKind: String, CaseIterable, Identifiable { case fullscreen, worldCards; var displayName: String }`.

- [ ] **Step 1: Write the failing test**

`apps/ios/AllyClockTests/FaceKindTests.swift`:

```swift
import XCTest
@testable import AllyClock

final class FaceKindTests: XCTestCase {
    func test_twoFacesInOrderWithNames() {
        XCTAssertEqual(FaceKind.allCases, [.fullscreen, .worldCards])
        XCTAssertEqual(FaceKind.fullscreen.displayName, "Fullscreen")
        XCTAssertEqual(FaceKind.worldCards.displayName, "World Cards")
    }
    func test_rawValuesStableForPersistence() {
        XCTAssertEqual(FaceKind.fullscreen.rawValue, "fullscreen")
        XCTAssertEqual(FaceKind.worldCards.rawValue, "world-cards")
    }
}
```

- [ ] **Step 2: Run to verify FAIL**

Run: `xcodebuild ... test`. Expected: `FaceKind` undefined.

- [ ] **Step 3: Implement `FaceKind.swift`**

```swift
import Foundation

enum FaceKind: String, CaseIterable, Identifiable {
    case fullscreen = "fullscreen"
    case worldCards = "world-cards"

    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .fullscreen: return "Fullscreen"
        case .worldCards: return "World Cards"
        }
    }
}
```

- [ ] **Step 4: Implement `FacePreviewGrid.swift`** (shared preview helper)

```swift
import SwiftUI

/// Renders a face at a few representative device ratios for previews.
struct FacePreviewGrid<Content: View>: View {
    @ViewBuilder var content: () -> Content
    private let sizes: [(String, CGFloat, CGFloat)] = [
        ("iPhone portrait", 393, 852),
        ("iPhone landscape", 852, 393),
        ("iPad portrait", 834, 1194),
        ("iPad landscape", 1194, 834),
    ]
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(sizes, id: \.0) { name, w, h in
                    VStack(spacing: 4) {
                        Text(name).font(.caption).foregroundStyle(.secondary)
                        content().frame(width: w, height: h).clipped()
                            .overlay(Rectangle().stroke(.secondary))
                    }
                }
            }
            .padding()
        }
    }
}
```

- [ ] **Step 5: Implement `FacePickerView.swift`**

```swift
import SwiftUI

/// Sheet listing the faces. Applies on selection and on dismissal (the AllyClock
/// sheet rule: no confirm/cancel).
struct FacePickerView: View {
    @Binding var selection: FaceKind
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(FaceKind.allCases) { face in
                Button {
                    selection = face
                    dismiss()
                } label: {
                    HStack {
                        Text(face.displayName)
                        Spacer()
                        if face == selection { SFIcon("checkmark").frame(width: 16, height: 16) }
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Faces")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: { SFIcon("xmark").frame(width: 16, height: 16) }
                }
            }
        }
    }
}
```

- [ ] **Step 6: Implement `RootFaceView.swift`**

```swift
import SwiftUI
import AllyClockCore

/// App root: hosts the active face full-bleed with an auto-hiding picker button.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @State private var pickerOpen = false
    @State private var chromeVisible = true
    @State private var hideTask: DispatchWorkItem?

    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        fullscreenStore = FullscreenConfigStore(registry: reg)
        worldCardsStore = WorldCardsConfigStore(registry: reg)
    }

    private var face: FaceKind { FaceKind(rawValue: selectedRaw) ?? .fullscreen }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            switch face {
            case .fullscreen: FullscreenFaceView(store: fullscreenStore)
            case .worldCards: WorldCardsFaceView(store: worldCardsStore)
            }

            Button { pickerOpen = true } label: {
                SFIcon("square.grid.2x2").frame(width: 22, height: 22).padding(11)
            }
            .foregroundStyle(Color(white: 0.93))
            .background(Circle().fill(Color(white: 0.12, opacity: 0.85)))
            .overlay(Circle().stroke(Color.white.opacity(0.2)))
            .padding(.leading, 16).padding(.bottom, 24)
            .opacity(chromeVisible ? 1 : 0)
            .animation(.easeInOut(duration: 0.3), value: chromeVisible)
        }
        .contentShape(Rectangle())
        .onTapGesture { revealChrome() }
        .onAppear { scheduleHide() }
        .sheet(isPresented: $pickerOpen) { FacePickerView(selection: Binding(
            get: { face }, set: { selectedRaw = $0.rawValue })) }
    }

    private func revealChrome() {
        chromeVisible = true
        scheduleHide()
    }
    private func scheduleHide() {
        hideTask?.cancel()
        let task = DispatchWorkItem { chromeVisible = false }
        hideTask = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: task)
    }
}
```

- [ ] **Step 7: Swap `ContentView.swift`**

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        RootFaceView()
    }
}

#Preview {
    ContentView()
}
```

- [ ] **Step 8: Register new files + test** in `project.pbxproj`: `FaceKind.swift` (`…137`/`…138`) in `Faces` group; a new `App` `PBXGroup` (`…140`) child of `…011` containing `FacePickerView.swift` (`…141`/`…142`), `RootFaceView.swift` (`…143`/`…144`), `FacePreviewGrid.swift` (`…145`/`…146`); all build files into the app `Sources` phase; `FaceKindTests.swift` (`…147`/`…148`) into the test target `Sources` phase and `AllyClockTests` group.

- [ ] **Step 9: Run tests + build**

Run: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test`
Expected: build succeeds; `FaceKindTests` (2) + `FlagResolutionTests` (3) pass.

- [ ] **Step 10: Commit**

```bash
git add apps/ios
git commit -m "feat(ios): face registry, picker, and root shell; swap ContentView"
```

---

## Self-Review notes (author)

- **Spec coverage:** package linking (T1), SFIcon + emoji flags + portrait (T2), Fullscreen render with core sizing (T3), World Cards render (T4), picker + shell + ContentView swap (T5). Editing panels (Adjust/Display/Settings) and the zone picker are Plan 2b/2c — intentionally absent here.
- **Observation:** faces read config once per frame inside `TimelineView` (~30fps), so no `@Observable` is needed while config is static (2a is read-only). 2b/2c will introduce mutation + observation.
- **pbxproj ids:** the project uses deterministic `AC0000…` ids; new objects use the `…100`–`…148` range to avoid collisions with existing `…001`–`…091` ids.
- **Type consistency:** `FullscreenConfigStore(registry:)`, `WorldCardsConfigStore(registry:)`, `fieldsFor(_:)`, `fullscreenFontSize(_:sizeScale:width:height:)`, `TimeFormatting.bigTime/dateParts/compactOffset/zoneCity`, `ZoneCountry.flagEmoji(for:)/country(for:)`, `FaceKind`, `FlagResolution.emoji(forZone:)`, `fontWeight(_:)`, `SFIcon(_:)`, `FlagView(zone:)`, `FacePreviewGrid` are used identically across tasks and match the merged core's public API.
- **Risk:** Task 1 (pbxproj package linking) is the highest-risk step; it is verified by a build, and `CoreBridge.swift` proves the product actually links before any real code depends on it.
```
