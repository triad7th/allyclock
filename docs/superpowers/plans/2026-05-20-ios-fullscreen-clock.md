# iOS Full-Screen Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS app's placeholder `ContentView` with a minimalist, full-screen landscape clock that follows OS dark/light mode and locale, looks tuned on every iPhone (iOS 16+, incl. iPhone 8) and iPad, and stays awake while foregrounded.

**Architecture:** A single SwiftUI screen (`ClockView`) wraps `TimelineView` + `GeometryReader`, composes two child views (`BigTime`, `InfoLine`), and reads from a pure `ClockFormatter`. A `SizeBucket` enum maps `(size, horizontalSizeClass)` to one of three tuning buckets (`compactPhone`, `standardPhone`, `tablet`); each bucket owns the ratios that drive font sizes, weights, spacing, and padding. App-wide concerns (orientation lock, idle timer, status bar, system overlays) live in `AllyClockApp` / `ContentView`.

**Tech Stack:** SwiftUI on iOS 16.0+, `TimelineView(.animation(...))`, `DateFormatter` for locale-aware hour/minute, `Date.FormatStyle` for the date portion, XCTest for unit coverage, SwiftUI Previews for visual verification across the device matrix.

**Reference spec:** `docs/superpowers/specs/2026-05-20-ios-fullscreen-clock-design.md`.

---

## File Structure

- Create `apps/ios/AllyClock/Time/ClockFormatter.swift`: pure formatters for big time / precise time / date+TZ. Locale and time zone are injected so unit tests are deterministic.
- Create `apps/ios/AllyClock/Time/ClockSizing.swift`: `SizeBucket` enum + per-bucket ratio functions for font sizes, spacing, padding, and the big-time font weight.
- Create `apps/ios/AllyClock/Views/BigTime.swift`: renders the big `HH:MM` digits + optional right-side AM/PM superscript.
- Create `apps/ios/AllyClock/Views/InfoLine.swift`: renders the single info line `HH:mm:ss.SS · Month D, YYYY · GMT±HH:MM`, pinned LTR.
- Create `apps/ios/AllyClock/Views/ClockView.swift`: `TimelineView` + `GeometryReader` + bucket detection + composition; owns status-bar / overlay / Dynamic Type modifiers; ships the SwiftUI preview matrix.
- Modify `apps/ios/AllyClock/ContentView.swift`: body becomes `ClockView()`.
- Modify `apps/ios/AllyClock/AllyClockApp.swift`: observe `ScenePhase` and toggle `UIApplication.shared.isIdleTimerDisabled`.
- Modify `apps/ios/AllyClock.xcodeproj/project.pbxproj`: drop portrait from `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone`/`_iPad`; add the four new Swift sources to the `AllyClock` target's Sources build phase and to the `AllyClock` group.
- Modify `apps/ios/AllyClockTests/AllyClockTests.swift`: replace the placeholder `testContentViewCanBeCreated` with `ClockFormatterTests`. (File path stays so we don't have to touch the test target's pbxproj entries.)

---

## Task 1: Lock orientation to landscape

**Files:**
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Edit the iPhone orientation key (Debug and Release)**

In `apps/ios/AllyClock.xcodeproj/project.pbxproj`, find both occurrences of the `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone` line for the AllyClock app target. Each currently reads:

```
INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
```

Replace each with:

```
INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
```

- [ ] **Step 2: Edit the iPad orientation key (Debug and Release)**

Similarly, find both occurrences of `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad`. Each currently reads:

```
INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
```

Replace each with:

```
INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
```

- [ ] **Step 3: Verify the project still parses**

Run:

```bash
xcodebuild -list -project apps/ios/AllyClock.xcodeproj
```

Expected: output lists targets `AllyClock` and `AllyClockTests` plus scheme `AllyClock` (same as before — confirms the edit didn't corrupt the pbxproj).

- [ ] **Step 4: Build for the simulator**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: lock AllyClock to landscape orientations only" \
  -m "Why:" \
  -m "- The full-screen clock is a landscape-only experience; portrait support is intentionally out of scope for the first objective." \
  -m "What:" \
  -m "- Drop UIInterfaceOrientationPortrait (and PortraitUpsideDown for iPad) from the AllyClock target's Info.plist orientation keys in both Debug and Release configurations." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed"
```

---

## Task 2: Add `ClockFormatter` with full unit coverage (TDD)

**Files:**
- Create: `apps/ios/AllyClock/Time/ClockFormatter.swift`
- Modify: `apps/ios/AllyClockTests/AllyClockTests.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Create the Time directory**

Run:

```bash
mkdir -p apps/ios/AllyClock/Time
```

Expected: directory exists, `git status --short` shows no tracked changes yet.

- [ ] **Step 2: Replace the placeholder tests with the failing `ClockFormatter` suite**

Overwrite `apps/ios/AllyClockTests/AllyClockTests.swift` with:

```swift
@testable import AllyClock
import XCTest

final class ClockFormatterTests: XCTestCase {
    // 2026-05-20 14:42:38.27 UTC
    private func fixedDate() -> Date {
        var comps = DateComponents()
        comps.year = 2026; comps.month = 5; comps.day = 20
        comps.hour = 14;   comps.minute = 42; comps.second = 38
        comps.nanosecond = 270_000_000
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal.date(from: comps)!
    }

    private let pst = TimeZone(identifier: "America/Los_Angeles")!
    private let kst = TimeZone(identifier: "Asia/Seoul")!
    private let utc = TimeZone(identifier: "UTC")!
    private let enUS = Locale(identifier: "en_US")
    private let enGB = Locale(identifier: "en_GB")
    private let koKR = Locale(identifier: "ko_KR")

    // MARK: bigTime

    func test_bigTime_en_US_morning_AM() throws {
        let result = ClockFormatter.bigTime(fixedDate(), in: pst, locale: enUS)
        // 14:42 UTC = 07:42 PDT. en_US uses 12-hour.
        XCTAssertEqual(result.digits, "7:42")
        XCTAssertEqual(result.ampm, "AM")
    }

    func test_bigTime_en_US_evening_PM() throws {
        // Shift fixture: 2026-05-20 22:42 UTC = 15:42 PDT.
        let later = fixedDate().addingTimeInterval(8 * 3600)
        let result = ClockFormatter.bigTime(later, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "3:42")
        XCTAssertEqual(result.ampm, "PM")
    }

    func test_bigTime_en_US_midnight() throws {
        // Build local midnight directly.
        var comps = DateComponents(); comps.year = 2026; comps.month = 5; comps.day = 20
        comps.hour = 0; comps.minute = 0
        var cal = Calendar(identifier: .gregorian); cal.timeZone = pst
        let date = cal.date(from: comps)!
        let result = ClockFormatter.bigTime(date, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "12:00")
        XCTAssertEqual(result.ampm, "AM")
    }

    func test_bigTime_en_US_noon() throws {
        var comps = DateComponents(); comps.year = 2026; comps.month = 5; comps.day = 20
        comps.hour = 12; comps.minute = 0
        var cal = Calendar(identifier: .gregorian); cal.timeZone = pst
        let date = cal.date(from: comps)!
        let result = ClockFormatter.bigTime(date, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "12:00")
        XCTAssertEqual(result.ampm, "PM")
    }

    func test_bigTime_ko_KR_is24Hour() throws {
        // 14:42 UTC = 23:42 KST.
        let result = ClockFormatter.bigTime(fixedDate(), in: kst, locale: koKR)
        XCTAssertEqual(result.digits, "23:42")
        XCTAssertNil(result.ampm)
    }

    func test_bigTime_en_GB_is24Hour() throws {
        let result = ClockFormatter.bigTime(fixedDate(), in: utc, locale: enGB)
        XCTAssertEqual(result.digits, "14:42")
        XCTAssertNil(result.ampm)
    }

    // MARK: precise

    func test_precise_isAlways24Hour_withHundredths() throws {
        // 14:42:38.27 UTC = 07:42:38.27 PDT.
        XCTAssertEqual(ClockFormatter.precise(fixedDate(), in: pst), "07:42:38.27")
        // Same date in 24-hour locale stays identical.
        XCTAssertEqual(ClockFormatter.precise(fixedDate(), in: utc), "14:42:38.27")
    }

    // MARK: dateTZ

    func test_dateTZ_LosAngeles_enUS() throws {
        // Date.FormatStyle's exact glyphs (separators, spaces) can shift between OS
        // versions, so assert on the meaningful tokens rather than the whole string.
        let result = ClockFormatter.dateTZ(fixedDate(), in: pst, locale: enUS)
        XCTAssertTrue(result.contains("May"),      "month missing — got: \(result)")
        XCTAssertTrue(result.contains("20"),       "day missing — got: \(result)")
        XCTAssertTrue(result.contains("2026"),     "year missing — got: \(result)")
        XCTAssertTrue(result.contains("· GMT−07:00"),
                      "separator + offset wrong — got: \(result)")
    }

    func test_dateTZ_Seoul_koKR() throws {
        let result = ClockFormatter.dateTZ(fixedDate(), in: kst, locale: koKR)
        XCTAssertTrue(result.contains("2026"),     "year missing — got: \(result)")
        XCTAssertTrue(result.contains("5"),        "month missing — got: \(result)")
        XCTAssertTrue(result.contains("20"),       "day missing — got: \(result)")
        XCTAssertTrue(result.contains("· GMT+09:00"),
                      "separator + offset wrong — got: \(result)")
    }

    func test_dateTZ_UTC_includesZeroOffset() throws {
        let result = ClockFormatter.dateTZ(fixedDate(), in: utc, locale: enGB)
        XCTAssertTrue(result.contains("· GMT+00:00"), "got: \(result)")
    }
}
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: build fails because `ClockFormatter` doesn't exist yet (`error: cannot find 'ClockFormatter' in scope`). That's the failing-test signal we need before implementing.

- [ ] **Step 4: Implement `ClockFormatter`**

Write `apps/ios/AllyClock/Time/ClockFormatter.swift`:

```swift
import Foundation

enum ClockFormatter {
    /// Returns the locale-appropriate hour:minute string (no AM/PM symbol embedded)
    /// plus an optional AM/PM string. `ampm` is nil for 24-hour locales.
    static func bigTime(_ date: Date, in timeZone: TimeZone, locale: Locale) -> (digits: String, ampm: String?) {
        let isTwelveHour = locale.hourCycle == .oneToTwelve || locale.hourCycle == .zeroToEleven

        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.setLocalizedDateFormatFromTemplate(isTwelveHour ? "hmm" : "Hmm")

        var rendered = formatter.string(from: date)
        if isTwelveHour {
            // Some locales' template output may still include the AM/PM symbol; strip it.
            for symbol in [locale.amSymbol, locale.pmSymbol, "AM", "PM"] {
                rendered = rendered.replacingOccurrences(of: symbol, with: "")
            }
            rendered = rendered.trimmingCharacters(in: .whitespaces)
        }

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let hour24 = cal.component(.hour, from: date)
        let ampm: String? = isTwelveHour
            ? (hour24 < 12 ? (locale.amSymbol.isEmpty ? "AM" : locale.amSymbol)
                           : (locale.pmSymbol.isEmpty ? "PM" : locale.pmSymbol))
            : nil

        return (rendered, ampm)
    }

    /// 24-hour `HH:mm:ss.SS` with hundredths of a second. Locale-independent.
    static func precise(_ date: Date, in timeZone: TimeZone) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let comps = cal.dateComponents([.hour, .minute, .second, .nanosecond], from: date)
        let hundredths = ((comps.nanosecond ?? 0) / 10_000_000)
        return String(format: "%02d:%02d:%02d.%02d",
                      comps.hour ?? 0,
                      comps.minute ?? 0,
                      comps.second ?? 0,
                      hundredths)
    }

    /// Locale-formatted long date, middle dot, fixed `GMT±HH:MM` offset.
    /// Example: `May 20, 2026 · GMT−07:00`.
    static func dateTZ(_ date: Date, in timeZone: TimeZone, locale: Locale) -> String {
        let datePart = date.formatted(
            Date.FormatStyle()
                .year(.defaultDigits)
                .month(.wide)
                .day(.defaultDigits)
                .locale(locale)
                .calendar(Calendar(identifier: locale.calendar.identifier))
                .timeZone(timeZone)
        )
        return "\(datePart) · \(gmtOffset(timeZone, for: date))"
    }

    /// `GMT±HH:MM` using the Unicode minus sign (U+2212) for negative offsets.
    static func gmtOffset(_ timeZone: TimeZone, for date: Date) -> String {
        let totalSeconds = timeZone.secondsFromGMT(for: date)
        let sign = totalSeconds >= 0 ? "+" : "\u{2212}"  // − (Unicode minus, matches mock)
        let magnitude = abs(totalSeconds)
        let hours = magnitude / 3600
        let minutes = (magnitude % 3600) / 60
        return String(format: "GMT%@%02d:%02d", sign, hours, minutes)
    }
}
```

- [ ] **Step 5: Add the new file to the Xcode project**

Edit `apps/ios/AllyClock.xcodeproj/project.pbxproj`:

(a) In the `PBXBuildFile` section, after the existing `AC0000000000000000000031 /* ContentView.swift in Sources */` entry, add:

```
		AC0000000000000000000080 /* ClockFormatter.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000081 /* ClockFormatter.swift */; };
```

(b) In the `PBXFileReference` section, after the existing `AC0000000000000000000021 /* ContentView.swift */` entry, add:

```
		AC0000000000000000000081 /* ClockFormatter.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ClockFormatter.swift; sourceTree = "<group>"; };
```

(c) Add a new `Time` group. In the `PBXGroup` section, **before** the `AC0000000000000000000041 /* AllyClockTests */` group, add:

```
		AC0000000000000000000082 /* Time */ = {
			isa = PBXGroup;
			children = (
				AC0000000000000000000081 /* ClockFormatter.swift */,
			);
			path = Time;
			sourceTree = "<group>";
		};
```

(d) In the existing `AC0000000000000000000011 /* AllyClock */` group's `children` list, add a line referencing the `Time` group after the `Preview Content` line, so the children list reads:

```
			children = (
				AC0000000000000000000020 /* AllyClockApp.swift */,
				AC0000000000000000000021 /* ContentView.swift */,
				AC0000000000000000000022 /* Assets.xcassets */,
				AC0000000000000000000012 /* Preview Content */,
				AC0000000000000000000082 /* Time */,
			);
```

(e) In the `AC0000000000000000000013 /* Sources */` (app target's sources phase) `files` array, add a line for the new build file. The result:

```
			files = (
				AC0000000000000000000031 /* ContentView.swift in Sources */,
				AC0000000000000000000030 /* AllyClockApp.swift in Sources */,
				AC0000000000000000000080 /* ClockFormatter.swift in Sources */,
			);
```

- [ ] **Step 6: Verify the project still parses**

Run:

```bash
xcodebuild -list -project apps/ios/AllyClock.xcodeproj
```

Expected: same target and scheme list as before, no parse error.

- [ ] **Step 7: Run the tests and confirm they pass**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: `** TEST SUCCEEDED **` and the test output lists all ten `ClockFormatterTests` passing.

- [ ] **Step 8: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: SwiftFormat reports 0 files changed (or matches the existing style); SwiftLint reports 0 violations.

- [ ] **Step 9: Commit**

```bash
git add apps/ios/AllyClock/Time/ClockFormatter.swift apps/ios/AllyClockTests/AllyClockTests.swift apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: add ClockFormatter with locale-aware formatting" \
  -m "Why:" \
  -m "- The full-screen clock needs deterministic, locale-aware formatting for the big time, precise time, and date+TZ line. Pulling this into a pure type lets us unit-test every locale/timezone case without touching SwiftUI." \
  -m "What:" \
  -m "- Add ClockFormatter with bigTime/precise/dateTZ static functions parameterised on Date, TimeZone, and Locale." \
  -m "- Add the Time group and ClockFormatter.swift to the Xcode project." \
  -m "- Replace the placeholder ContentView smoke test with ClockFormatterTests covering en_US (12h), ko_KR/en_GB (24h), midnight, noon, hundredths precision, and GMT offset formatting for LA/Seoul/UTC." \
  -m "Checks:" \
  -m "- xcodebuild simulator test: passed (10 tests)" \
  -m "- swiftlint: passed" \
  -m "- swiftformat: clean"
```

---

## Task 3: Add `ClockSizing` (bucket detection + ratios)

**Files:**
- Create: `apps/ios/AllyClock/Time/ClockSizing.swift`
- Modify: `apps/ios/AllyClock/Time/ClockSizing.swift` test additions in `apps/ios/AllyClockTests/AllyClockTests.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Append bucket-detection tests**

Append the following to `apps/ios/AllyClockTests/AllyClockTests.swift` (inside the existing file, after the `ClockFormatterTests` class):

```swift
final class ClockSizingTests: XCTestCase {
    func test_detect_iPhoneSE_landscape_isCompactPhone() {
        // iPhone SE 3rd gen landscape: 667 × 375.
        let bucket = SizeBucket.detect(size: CGSize(width: 667, height: 375), horizontalSizeClass: .compact)
        XCTAssertEqual(bucket, .compactPhone)
    }

    func test_detect_iPhone16Pro_landscape_isStandardPhone() {
        // iPhone 16 Pro landscape: ~852 × 393.
        let bucket = SizeBucket.detect(size: CGSize(width: 852, height: 393), horizontalSizeClass: .compact)
        XCTAssertEqual(bucket, .standardPhone)
    }

    func test_detect_iPadPro_landscape_isTablet() {
        // iPad Pro 13" landscape: ~1366 × 1024.
        let bucket = SizeBucket.detect(size: CGSize(width: 1366, height: 1024), horizontalSizeClass: .regular)
        XCTAssertEqual(bucket, .tablet)
    }

    func test_detect_nilSizeClass_fallsBackToHeightHeuristic() {
        // Defensive: if size class is missing, height alone decides phone bucket.
        XCTAssertEqual(SizeBucket.detect(size: CGSize(width: 667, height: 375), horizontalSizeClass: nil), .compactPhone)
        XCTAssertEqual(SizeBucket.detect(size: CGSize(width: 852, height: 393), horizontalSizeClass: nil), .standardPhone)
    }

    func test_bigSize_tablet_usesWidthFloor() {
        // iPad Pro landscape: 0.46 * 1024 = 471.04; 0.32 * 1366 = 437.12 → height wins, ~471.
        let s = SizeBucket.tablet.bigSize(in: CGSize(width: 1366, height: 1024))
        XCTAssertEqual(s, 1024 * 0.46, accuracy: 0.01)
    }

    func test_bigSize_tablet_usesWidthFloor_whenHeightTooSmall() {
        // Stage Manager 16:9 iPad slice: width-driven big time.
        // 0.46 * 500 = 230; 0.32 * 1200 = 384 → width wins.
        let s = SizeBucket.tablet.bigSize(in: CGSize(width: 1200, height: 500))
        XCTAssertEqual(s, 1200 * 0.32, accuracy: 0.01)
    }
}
```

- [ ] **Step 2: Run the tests and confirm `ClockSizing` is missing**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: build fails because `SizeBucket` doesn't exist (`error: cannot find 'SizeBucket' in scope`).

- [ ] **Step 3: Implement `ClockSizing`**

Write `apps/ios/AllyClock/Time/ClockSizing.swift`:

```swift
import SwiftUI

/// Three size buckets that cover every current iPhone and iPad model.
/// Detection uses `horizontalSizeClass` first (regular → tablet) and falls
/// back to landscape height for phones.
enum SizeBucket {
    case compactPhone   // iPhone SE / 8 / 13 mini  (landscape height < 400 pt)
    case standardPhone  // iPhone 13 → 17 Pro Max
    case tablet         // every iPad, Stage Manager slices, future foldables

    static func detect(size: CGSize, horizontalSizeClass: UserInterfaceSizeClass?) -> SizeBucket {
        if horizontalSizeClass == .regular { return .tablet }
        return size.height < 400 ? .compactPhone : .standardPhone
    }

    // MARK: Sizes

    func bigSize(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:  return size.height * 0.58
        case .standardPhone: return size.height * 0.55
        case .tablet:        return max(size.height * 0.46, size.width * 0.32)
        }
    }

    func ampmSize(in size: CGSize) -> CGFloat {
        let big = bigSize(in: size)
        switch self {
        case .compactPhone:  return big * 0.22
        case .standardPhone: return big * 0.20
        case .tablet:        return big * 0.18
        }
    }

    func infoSize(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:  return size.height * 0.040
        case .standardPhone: return size.height * 0.035
        case .tablet:        return size.height * 0.030
        }
    }

    func stackGap(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:  return size.height * 0.030
        case .standardPhone: return size.height * 0.040
        case .tablet:        return size.height * 0.055
        }
    }

    func edgePadding(in size: CGSize) -> CGFloat {
        let unit = min(size.width, size.height)
        switch self {
        case .compactPhone:  return unit * 0.035
        case .standardPhone: return unit * 0.040
        case .tablet:        return unit * 0.050
        }
    }

    // MARK: Type

    var bigWeight: Font.Weight {
        switch self {
        case .compactPhone, .standardPhone: return .ultraLight
        case .tablet:                       return .thin
        }
    }
}
```

- [ ] **Step 4: Add `ClockSizing.swift` to the Xcode project**

Edit `apps/ios/AllyClock.xcodeproj/project.pbxproj`:

(a) Add a `PBXBuildFile` entry (next to the existing `ClockFormatter.swift in Sources`):

```
		AC0000000000000000000083 /* ClockSizing.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000084 /* ClockSizing.swift */; };
```

(b) Add a `PBXFileReference` entry (next to `ClockFormatter.swift`):

```
		AC0000000000000000000084 /* ClockSizing.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ClockSizing.swift; sourceTree = "<group>"; };
```

(c) Add it to the `Time` group's `children` list. The list becomes:

```
			children = (
				AC0000000000000000000081 /* ClockFormatter.swift */,
				AC0000000000000000000084 /* ClockSizing.swift */,
			);
```

(d) Add it to the app target's Sources build phase `files` array:

```
			files = (
				AC0000000000000000000031 /* ContentView.swift in Sources */,
				AC0000000000000000000030 /* AllyClockApp.swift in Sources */,
				AC0000000000000000000080 /* ClockFormatter.swift in Sources */,
				AC0000000000000000000083 /* ClockSizing.swift in Sources */,
			);
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: `** TEST SUCCEEDED **`, all ClockFormatterTests + ClockSizingTests pass (16 total).

- [ ] **Step 6: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 files changed, 0 violations.

- [ ] **Step 7: Commit**

```bash
git add apps/ios/AllyClock/Time/ClockSizing.swift apps/ios/AllyClockTests/AllyClockTests.swift apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: add SizeBucket tuning model for clock layout" \
  -m "Why:" \
  -m "- Pure ratio-based layout looks wrong on edge-aspect devices. A three-bucket model (compactPhone, standardPhone, tablet) lets us hand-tune per form factor while still covering every existing and future iOS device." \
  -m "What:" \
  -m "- Add SizeBucket with bucket detection from (size, horizontalSizeClass) plus per-bucket helpers for big-time/AMPM/info sizes, stack gap, edge padding, and the big-time font weight." \
  -m "- iPad uses max(0.46 * height, 0.32 * width) so wider Stage Manager slices stay legible." \
  -m "- Cover detection and the tablet width-floor with focused unit tests." \
  -m "Checks:" \
  -m "- xcodebuild simulator test: passed (16 tests)" \
  -m "- swiftlint: passed"
```

---

## Task 4: Add `BigTime` view

**Files:**
- Create: `apps/ios/AllyClock/Views/BigTime.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Create the Views directory**

Run:

```bash
mkdir -p apps/ios/AllyClock/Views
```

- [ ] **Step 2: Write `BigTime.swift`**

Write `apps/ios/AllyClock/Views/BigTime.swift`:

```swift
import SwiftUI

/// Renders the big hour:minute digits with an optional small AM/PM superscript
/// to the right. AM/PM is omitted when `ampm == nil` (24-hour locales).
struct BigTime: View {
    let digits: String
    let ampm: String?
    let bucket: SizeBucket
    let containerSize: CGSize

    var body: some View {
        let big = bucket.bigSize(in: containerSize)
        let ampmSz = bucket.ampmSize(in: containerSize)

        HStack(alignment: .firstTextBaseline, spacing: ampmSz * 0.4) {
            Text(digits)
                .font(.system(size: big, weight: bucket.bigWeight))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            if let ampm {
                Text(ampm)
                    .font(.system(size: ampmSz, weight: .regular))
                    .tracking(ampmSz * 0.08)
                    .baselineOffset(big * 0.55)
                    .lineLimit(1)
            }
        }
        .foregroundColor(.primary)
    }
}

#Preview("BigTime — standard phone 12h") {
    BigTime(
        digits: "10:42",
        ampm: "PM",
        bucket: .standardPhone,
        containerSize: CGSize(width: 852, height: 393)
    )
    .frame(width: 852, height: 393)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("BigTime — compact phone 12h") {
    BigTime(
        digits: "7:42",
        ampm: "AM",
        bucket: .compactPhone,
        containerSize: CGSize(width: 667, height: 375)
    )
    .frame(width: 667, height: 375)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("BigTime — tablet 24h (no AM/PM)") {
    BigTime(
        digits: "23:42",
        ampm: nil,
        bucket: .tablet,
        containerSize: CGSize(width: 1366, height: 1024)
    )
    .frame(width: 1366, height: 1024)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}
```

- [ ] **Step 3: Register the new file with the Xcode project**

Edit `apps/ios/AllyClock.xcodeproj/project.pbxproj`:

(a) `PBXBuildFile` section — add:

```
		AC0000000000000000000085 /* BigTime.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000086 /* BigTime.swift */; };
```

(b) `PBXFileReference` section — add:

```
		AC0000000000000000000086 /* BigTime.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = BigTime.swift; sourceTree = "<group>"; };
```

(c) Add a `Views` group before the `Time` group:

```
		AC0000000000000000000087 /* Views */ = {
			isa = PBXGroup;
			children = (
				AC0000000000000000000086 /* BigTime.swift */,
			);
			path = Views;
			sourceTree = "<group>";
		};
```

(d) Add the `Views` group to the `AllyClock` group's children (after `Preview Content`, before `Time`):

```
			children = (
				AC0000000000000000000020 /* AllyClockApp.swift */,
				AC0000000000000000000021 /* ContentView.swift */,
				AC0000000000000000000022 /* Assets.xcassets */,
				AC0000000000000000000012 /* Preview Content */,
				AC0000000000000000000087 /* Views */,
				AC0000000000000000000082 /* Time */,
			);
```

(e) Add to the app target's Sources build phase `files`:

```
			files = (
				AC0000000000000000000031 /* ContentView.swift in Sources */,
				AC0000000000000000000030 /* AllyClockApp.swift in Sources */,
				AC0000000000000000000080 /* ClockFormatter.swift in Sources */,
				AC0000000000000000000083 /* ClockSizing.swift in Sources */,
				AC0000000000000000000085 /* BigTime.swift in Sources */,
			);
```

- [ ] **Step 4: Build for the simulator**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 changes, 0 violations.

- [ ] **Step 6: Commit**

```bash
git add apps/ios/AllyClock/Views/BigTime.swift apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: add BigTime view for the hour:minute display" \
  -m "Why:" \
  -m "- The big time block is the dominant element of the clock screen and needs its own focused view with sizing hooks for every bucket and an optional superscript AM/PM segment for 12-hour locales." \
  -m "What:" \
  -m "- Add BigTime with ultraLight/thin numerals, monospaced digits, lineLimit(1) + minimumScaleFactor(0.6) defensive shrink, and a baseline-offset AM/PM that's omitted when ampm is nil." \
  -m "- Ship three SwiftUI previews (compact phone 12h, standard phone 12h, tablet 24h) so the view can be eyeballed in isolation." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed" \
  -m "- swiftlint: passed"
```

---

## Task 5: Add `InfoLine` view

**Files:**
- Create: `apps/ios/AllyClock/Views/InfoLine.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Write `InfoLine.swift`**

Write `apps/ios/AllyClock/Views/InfoLine.swift`:

```swift
import SwiftUI

/// One horizontal line: precise time (monospaced) · middle dot · date + GMT offset.
/// Pinned LTR so RTL locales (e.g. ar_SA) still render time on the left of the date.
struct InfoLine: View {
    let precise: String
    let dateTZ: String
    let bucket: SizeBucket
    let containerSize: CGSize

    var body: some View {
        let info = bucket.infoSize(in: containerSize)

        HStack(alignment: .firstTextBaseline, spacing: info * 0.6) {
            Text(precise)
                .font(.system(size: info, weight: .regular, design: .monospaced))

            Text("·")
                .font(.system(size: info, weight: .regular))
                .opacity(0.4)

            Text(dateTZ)
                .font(.system(size: info, weight: .regular))
        }
        .foregroundColor(.primary.opacity(0.55))
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .environment(\.layoutDirection, .leftToRight)
    }
}

#Preview("InfoLine — standard phone") {
    InfoLine(
        precise: "10:42:38.27",
        dateTZ: "May 20, 2026 · GMT−07:00",
        bucket: .standardPhone,
        containerSize: CGSize(width: 852, height: 393)
    )
    .padding()
    .frame(width: 852)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("InfoLine — tablet ko_KR") {
    InfoLine(
        precise: "23:42:38.27",
        dateTZ: "2026년 5월 20일 · GMT+09:00",
        bucket: .tablet,
        containerSize: CGSize(width: 1366, height: 1024)
    )
    .padding()
    .frame(width: 1366)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}
```

- [ ] **Step 2: Register the new file with the Xcode project**

Edit `apps/ios/AllyClock.xcodeproj/project.pbxproj`:

(a) `PBXBuildFile` section — add:

```
		AC0000000000000000000088 /* InfoLine.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000089 /* InfoLine.swift */; };
```

(b) `PBXFileReference` section — add:

```
		AC0000000000000000000089 /* InfoLine.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = InfoLine.swift; sourceTree = "<group>"; };
```

(c) Append to the `Views` group's `children`:

```
			children = (
				AC0000000000000000000086 /* BigTime.swift */,
				AC0000000000000000000089 /* InfoLine.swift */,
			);
```

(d) Append to the app target's Sources `files`:

```
			files = (
				AC0000000000000000000031 /* ContentView.swift in Sources */,
				AC0000000000000000000030 /* AllyClockApp.swift in Sources */,
				AC0000000000000000000080 /* ClockFormatter.swift in Sources */,
				AC0000000000000000000083 /* ClockSizing.swift in Sources */,
				AC0000000000000000000085 /* BigTime.swift in Sources */,
				AC0000000000000000000088 /* InfoLine.swift in Sources */,
			);
```

- [ ] **Step 3: Build for the simulator**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 changes, 0 violations.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/AllyClock/Views/InfoLine.swift apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: add InfoLine view for precise time + date + TZ" \
  -m "Why:" \
  -m "- The info line is the only place the user sees seconds/hundredths and the full date with GMT offset. Splitting it out keeps the layout simple and lets us preview the line on its own." \
  -m "What:" \
  -m "- Add InfoLine with monospaced precise time, dimmed middle-dot separator, and a default-design date+TZ segment, all at 55% primary opacity." \
  -m "- Pin the outer stack to leftToRight so RTL locales still render time-left/date-right." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed" \
  -m "- swiftlint: passed"
```

---

## Task 6: Add `ClockView` and the preview matrix

**Files:**
- Create: `apps/ios/AllyClock/Views/ClockView.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

- [ ] **Step 1: Write `ClockView.swift`**

Write `apps/ios/AllyClock/Views/ClockView.swift`:

```swift
import SwiftUI

/// Full-screen landscape clock. Drives off a 30 Hz TimelineView and composes
/// BigTime + InfoLine inside a centered VStack sized by SizeBucket.
struct ClockView: View {
    @Environment(\.horizontalSizeClass) private var hSizeClass

    var body: some View {
        GeometryReader { geo in
            let bucket = SizeBucket.detect(size: geo.size, horizontalSizeClass: hSizeClass)

            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                content(at: context.date, size: geo.size, bucket: bucket)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(bucket.edgePadding(in: geo.size))
        }
        .background(Color(.systemBackground))
        .ignoresSafeArea()
        .statusBar(hidden: true)
        .persistentSystemOverlays(.hidden)
        .dynamicTypeSize(.medium)
    }

    @ViewBuilder
    private func content(at date: Date, size: CGSize, bucket: SizeBucket) -> some View {
        let locale = Locale.current
        let timeZone = TimeZone.current
        let (digits, ampm) = ClockFormatter.bigTime(date, in: timeZone, locale: locale)
        let precise = ClockFormatter.precise(date, in: timeZone)
        let dateTZ = ClockFormatter.dateTZ(date, in: timeZone, locale: locale)

        VStack(spacing: bucket.stackGap(in: size)) {
            BigTime(digits: digits, ampm: ampm, bucket: bucket, containerSize: size)
            InfoLine(precise: precise, dateTZ: dateTZ, bucket: bucket, containerSize: size)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Previews

#Preview("iPhone SE landscape dark") {
    ClockView()
        .previewDevice("iPhone SE (3rd generation)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPhone SE landscape light") {
    ClockView()
        .previewDevice("iPhone SE (3rd generation)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.light)
}

#Preview("iPhone 13 mini landscape dark") {
    ClockView()
        .previewDevice("iPhone 13 mini")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPhone 14 landscape dark") {
    ClockView()
        .previewDevice("iPhone 14")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPhone 16 Pro landscape dark") {
    ClockView()
        .previewDevice("iPhone 16 Pro")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPhone 16 Pro Max landscape dark") {
    ClockView()
        .previewDevice("iPhone 16 Pro Max")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPad mini landscape dark") {
    ClockView()
        .previewDevice("iPad mini (6th generation)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPad Air 11\" landscape dark") {
    ClockView()
        .previewDevice("iPad Air 11-inch (M2)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPad Pro 11\" landscape dark") {
    ClockView()
        .previewDevice("iPad Pro 11-inch (M4)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPad Pro 13\" landscape dark") {
    ClockView()
        .previewDevice("iPad Pro 13-inch (M4)")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
}

#Preview("iPhone 16 Pro ko_KR (24h, no AM/PM)") {
    ClockView()
        .previewDevice("iPhone 16 Pro")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
        .environment(\.locale, Locale(identifier: "ko_KR"))
}

#Preview("iPhone 16 Pro ja_JP (CJK date)") {
    ClockView()
        .previewDevice("iPhone 16 Pro")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
        .environment(\.locale, Locale(identifier: "ja_JP"))
}

#Preview("iPhone 16 Pro ar_SA (RTL + 24h)") {
    ClockView()
        .previewDevice("iPhone 16 Pro")
        .previewInterfaceOrientation(.landscapeLeft)
        .preferredColorScheme(.dark)
        .environment(\.locale, Locale(identifier: "ar_SA"))
        .environment(\.layoutDirection, .rightToLeft)
}
```

- [ ] **Step 2: Register the new file with the Xcode project**

Edit `apps/ios/AllyClock.xcodeproj/project.pbxproj`:

(a) `PBXBuildFile` section — add:

```
		AC0000000000000000000090 /* ClockView.swift in Sources */ = {isa = PBXBuildFile; fileRef = AC0000000000000000000091 /* ClockView.swift */; };
```

(b) `PBXFileReference` section — add:

```
		AC0000000000000000000091 /* ClockView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ClockView.swift; sourceTree = "<group>"; };
```

(c) Append to the `Views` group's `children`:

```
			children = (
				AC0000000000000000000086 /* BigTime.swift */,
				AC0000000000000000000089 /* InfoLine.swift */,
				AC0000000000000000000091 /* ClockView.swift */,
			);
```

(d) Append to the app target's Sources `files`:

```
			files = (
				AC0000000000000000000031 /* ContentView.swift in Sources */,
				AC0000000000000000000030 /* AllyClockApp.swift in Sources */,
				AC0000000000000000000080 /* ClockFormatter.swift in Sources */,
				AC0000000000000000000083 /* ClockSizing.swift in Sources */,
				AC0000000000000000000085 /* BigTime.swift in Sources */,
				AC0000000000000000000088 /* InfoLine.swift in Sources */,
				AC0000000000000000000090 /* ClockView.swift in Sources */,
			);
```

- [ ] **Step 3: Build for the simulator**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 changes, 0 violations.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/AllyClock/Views/ClockView.swift apps/ios/AllyClock.xcodeproj/project.pbxproj
git commit -m "ios: add ClockView with TimelineView and preview matrix" \
  -m "Why:" \
  -m "- ClockView is the actual screen the user sees. Wrapping the body in TimelineView gives us a 30 Hz tick without manual Timer plumbing, and the preview matrix lets us eyeball every device size class before shipping." \
  -m "What:" \
  -m "- Compose BigTime and InfoLine inside a centered VStack sized by SizeBucket derived from GeometryReader size + horizontalSizeClass." \
  -m "- Apply statusBar/persistentSystemOverlays(hidden) and lock Dynamic Type to .medium so the layout never deforms under accessibility scaling." \
  -m "- Ship thirteen SwiftUI previews: every phone bucket and tablet form factor in dark, plus light on iPhone SE, plus ko_KR/ja_JP/ar_SA locale outliers." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed" \
  -m "- swiftlint: passed"
```

---

## Task 7: Wire `ClockView` in and disable the idle timer

**Files:**
- Modify: `apps/ios/AllyClock/ContentView.swift`
- Modify: `apps/ios/AllyClock/AllyClockApp.swift`

- [ ] **Step 1: Replace `ContentView`'s body with `ClockView`**

Overwrite `apps/ios/AllyClock/ContentView.swift` with:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        ClockView()
    }
}

#Preview {
    ContentView()
}
```

- [ ] **Step 2: Toggle the idle timer from `AllyClockApp`**

Overwrite `apps/ios/AllyClock/AllyClockApp.swift` with:

```swift
import SwiftUI
import UIKit

@main
struct AllyClockApp: App {
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { newPhase in
            UIApplication.shared.isIdleTimerDisabled = (newPhase == .active)
        }
    }
}
```

- [ ] **Step 3: Build for the simulator**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' build
```

Expected: `** BUILD SUCCEEDED **`. (A deprecation warning on `onChange(of:perform:)` is acceptable — the two-closure form is iOS 17 only and we target iOS 16.0.)

- [ ] **Step 4: Run unit tests to confirm nothing regressed**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: `** TEST SUCCEEDED **`, all ClockFormatterTests + ClockSizingTests pass.

- [ ] **Step 5: Boot the app on the simulator and visually confirm**

Run:

```bash
xcrun simctl boot 'iPhone 17' 2>/dev/null || true
open -a Simulator
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' -derivedDataPath build/DerivedData install 2>&1 | tail -5
xcrun simctl launch booted com.allyworld.AllyClock
```

Expected: the simulator opens in landscape, displays a black background with a large `H:MM`/`HH:MM` (depending on the simulator locale), a small superscript AM/PM (12-hour locales only), and a single info line below with the precise time + date + GMT offset. The hundredths digit on the precise line should be visibly ticking.

- [ ] **Step 6: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 changes, 0 violations.

- [ ] **Step 7: Commit**

```bash
git add apps/ios/AllyClock/ContentView.swift apps/ios/AllyClock/AllyClockApp.swift
git commit -m "ios: wire ClockView in and keep screen awake while foregrounded" \
  -m "Why:" \
  -m "- Replace the placeholder ContentView with the real clock, and let AllyClock behave like a bedside/desk clock by disabling the idle timer while it's frontmost." \
  -m "What:" \
  -m "- ContentView's body becomes ClockView()." \
  -m "- AllyClockApp observes ScenePhase and sets UIApplication.shared.isIdleTimerDisabled = true on .active, false on every other phase." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed" \
  -m "- xcodebuild simulator test: passed" \
  -m "- simulator smoke launch: full-screen clock renders, precise hundredths tick"
```

---

## Task 8: Tune ratios across the preview matrix

**Files:**
- Modify (only if previews look off): `apps/ios/AllyClock/Time/ClockSizing.swift`

This is the only task that doesn't follow strict TDD — it's a visual tuning pass against the preview matrix in `ClockView.swift`. Adjust the ratio constants in `ClockSizing.swift` if any preview looks wrong, then re-check the matrix.

- [ ] **Step 1: Open the preview matrix in Xcode**

```bash
open apps/ios/AllyClock.xcodeproj
```

Then in Xcode: open `apps/ios/AllyClock/Views/ClockView.swift`, ensure "Canvas" is visible (Editor → Canvas), and resume previews.

- [ ] **Step 2: Walk each preview top-to-bottom**

For every preview in the matrix, verify:

- Big time fills the screen with comfortable side margins. Not clipped, not floating.
- AM/PM (when shown) sits as a superscript next to the digits — not far above, not glued to the top.
- The info line is legible at arm's length but clearly secondary; the middle-dot separator is visibly dimmer than the surrounding text.
- The stack is vertically centered with breathing room above and below.
- Dark and light modes look intentional — no off-white halos, no contrast issues.
- ko_KR / ja_JP / ar_SA layouts don't jiggle compared to en_US.

- [ ] **Step 3: Tune ratios if anything looks wrong**

If a bucket reads as too cramped or too sparse:

- Big-time too large/small: nudge `bigSize` numerator by 0.02 increments (e.g., `0.55 → 0.53`).
- AM/PM offset off: tune the `0.55` in `BigTime.swift`'s `.baselineOffset(big * 0.55)` (this is the only magic number outside `ClockSizing`).
- Info line cramped: lift `infoSize` by 0.005.
- Stack too tight: bump `stackGap` by 0.01.
- Tablet looks short: raise the `0.32` width-floor multiplier (e.g., `0.34`).

Edit `apps/ios/AllyClock/Time/ClockSizing.swift` directly. Re-run the test suite after each edit:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: still `** TEST SUCCEEDED **`. (The unit tests pin only bucket detection and the tablet width-floor formula's direction, not exact numeric ratios, so small ratio tweaks won't break them.)

- [ ] **Step 4: Format and lint**

Run:

```bash
cd apps/ios && swiftformat AllyClock AllyClockTests && swiftlint
```

Expected: 0 violations.

- [ ] **Step 5: Commit (only if ratios changed)**

If you edited `ClockSizing.swift` or `BigTime.swift`:

```bash
git add apps/ios/AllyClock/Time/ClockSizing.swift apps/ios/AllyClock/Views/BigTime.swift
git commit -m "ios: tune clock layout ratios against the preview matrix" \
  -m "Why:" \
  -m "- The initial bucket ratios were a starting point; walking the preview matrix showed where some buckets needed nudging." \
  -m "What:" \
  -m "- Adjust per-bucket ratios in ClockSizing (and/or the BigTime superscript offset) so every device class in the preview matrix reads as intentional." \
  -m "Checks:" \
  -m "- xcodebuild simulator test: passed" \
  -m "- swiftlint: passed"
```

If no tuning was needed, skip this commit.

---

## Task 9: Final validation

**Files:** none.

- [ ] **Step 1: Build for both simulator and device archs**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' clean build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.2' test
```

Expected: `** TEST SUCCEEDED **`, ClockFormatterTests + ClockSizingTests all pass.

- [ ] **Step 3: Boot on a small simulator to verify iPhone 8-era layout**

Run:

```bash
xcrun simctl boot 'iPhone SE (3rd generation)' 2>/dev/null || true
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' build
xcrun simctl install booted "$(xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' -showBuildSettings | awk -F' = ' '/CODESIGNING_FOLDER_PATH/ {print $2; exit}')"
xcrun simctl launch booted com.allyworld.AllyClock
```

Expected: the clock renders legibly on the SE-class (375 pt) landscape screen. Manually verify in the simulator: rotate device (orientation should stay locked landscape), toggle Settings → Developer → Dark Appearance (the clock follows OS dark/light), put the app in background and re-foreground (clock resumes ticking, no glitches).

- [ ] **Step 4: Final lint pass**

Run:

```bash
cd apps/ios && swiftlint && swiftformat --lint AllyClock AllyClockTests
```

Expected: `0 violations, 0 serious` and `0/N files require formatting`.

- [ ] **Step 5: Repository hygiene check**

Run:

```bash
git status --short
git diff --check
```

Expected: no unintended changes, no whitespace errors.

- [ ] **Step 6: Finish the development branch**

Invoke the `superpowers:finishing-a-development-branch` skill to present integration options (merge to main locally / open a PR / keep as-is / discard). Do not push or merge before invoking it.
