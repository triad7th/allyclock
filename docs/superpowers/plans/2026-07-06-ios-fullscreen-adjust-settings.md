# iOS Fullscreen Adjustment + Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the iOS Fullscreen face: live-editing config stores, the web's two-slider Adjustment sheet, and the gear-opened Settings panel (toggles, bar mode, time zone picker).

**Architecture:** `BandConfigStore` in the `AllyClockCore` package becomes `@Observable` so SwiftUI re-renders on config edits (the 1:1 analog of the web's signal store). A `ZoneCatalog` port supplies picker options. The app gains three views — real Adjust sliders, `FullscreenSettingsView`, `ZonePickerView` — wired into `RootFaceView`'s existing GlassSheet/chrome pattern.

**Tech Stack:** Swift 6 / SwiftUI (iOS 26 app target), SwiftPM package `AllyClockCore` (Foundation + Observation only, no SwiftUI), XCTest.

**Spec:** `docs/superpowers/specs/2026-07-05-ios-fullscreen-adjust-settings-design.md`

## Global Constraints

- Web is the reference implementation; port mechanically. Web sources: `apps/web/src/app/features/faces/fullscreen/` (`fullscreen-config.component`, `fullscreen-toggles.component`), `apps/web/src/app/core/zone-catalog.ts`, `apps/web/src/app/shared/ui/zone-picker/`.
- Adjust sliders: range **0.5–2.0, step 0.05**, readout format `%.2f`. Time writes `sections.time.sizeScale`; Date broadcasts one value to weekday/month/day/gmt.
- The `""` zone id means "follow the device zone"; its picker label is **"Follow System"** (web says "Follow Time Machine"; iOS has no Time Machine).
- Offset strings use **U+2212 (−)** for minus, `+HH:MM` zero-padded form.
- `AllyClockCore` stays Foundation + Observation only — **no SwiftUI, no UIKit**.
- GlassSheet convention: apply live, accept on any dismissal (X/backdrop) — no confirm/cancel, no rollback.
- Core tests are **XCTest** (house style — the spec's "Swift Testing" note is overridden by the existing test suite), with fixed `Date` values for zone assertions.
- Swift code style: 4-space indent, `swiftformat`/`swiftlint` clean (run from `apps/ios`).
- All shell commands below run from the **repository root** unless stated otherwise.

---

### Task 1: Observable BandConfigStore + package platform bump

`@Observable` requires iOS 17 / watchOS 10 / tvOS 17 / macOS 14; the package floor is iOS 16, protecting nothing real (the app targets iOS 26). Bump platforms, annotate the store, verify observation fires on mutation. Subclasses (`FullscreenConfigStore`, `WorldCardsConfigStore`) inherit observation — `state` lives in the base and every mutation funnels through one `state` assignment in `commit`.

**Files:**
- Modify: `packages/AllyClockCore/Package.swift`
- Modify: `packages/AllyClockCore/Sources/AllyClockCore/Dimensions/BandConfigStore.swift`
- Test: `packages/AllyClockCore/Tests/AllyClockCoreTests/BandConfigStoreTests.swift`

**Interfaces:**
- Consumes: existing `BandConfigStore<T: Codable>` (unchanged API).
- Produces: `BandConfigStore` conforming to `Observation.Observable`; reading `store.state` (or anything derived: `config(_:)`, `sample()`, `fieldsFor(_:)`) inside a SwiftUI `body` now subscribes the view to changes.

- [ ] **Step 1: Write the failing test**

Append to `BandConfigStoreTests.swift` (inside the existing `BandConfigStoreTests` class), and add `import Observation` below the existing imports:

```swift
func test_observationFiresOnPatch() {
    let store = TestStore(defaults: freshDefaults())
    let exp = expectation(description: "state change observed")
    withObservationTracking {
        _ = store.state.byBand.count
    } onChange: {
        exp.fulfill()
    }
    store.patch("phone") { var f = $0; f.scale = 1.1; return f }
    wait(for: [exp], timeout: 1)
}

func test_observationFiresOnPatchAll() {
    let store = TestStore(defaults: freshDefaults())
    let exp = expectation(description: "state change observed")
    withObservationTracking {
        _ = store.state.version
    } onChange: {
        exp.fulfill()
    }
    store.patchAll { var f = $0; f.visible = false; return f }
    wait(for: [exp], timeout: 1)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `swift test --package-path packages/AllyClockCore --filter BandConfigStoreTests`
Expected: FAIL — `withObservationTracking` compiles (Observation ships with the toolchain) but `onChange` never fires because `BandConfigStore` is not `@Observable`, so both new tests time out. (If the compiler instead errors on availability, that confirms the platform floor — proceed to Step 3.)

- [ ] **Step 3: Bump package platforms**

In `packages/AllyClockCore/Package.swift` replace:

```swift
  platforms: [.iOS(.v16), .tvOS(.v16), .watchOS(.v9)],
```

with:

```swift
  platforms: [.iOS(.v17), .tvOS(.v17), .watchOS(.v10), .macOS(.v14)],
```

(macOS floor added because Observation needs macOS 14 when the package builds for `swift test` on the Mac; there is no macOS app.)

- [ ] **Step 4: Annotate the store**

In `BandConfigStore.swift`, add the import and macro. Replace:

```swift
import Foundation
```

with:

```swift
import Foundation
import Observation
```

and replace the class declaration line (keep the existing doc comment above it, appending one sentence):

```swift
open class BandConfigStore<T: Codable> {
```

with:

```swift
/// `@Observable`: SwiftUI views that read `state` (or `config`/`sample`)
/// re-render when a patch commits — the analog of the web store's signals.
@Observable
open class BandConfigStore<T: Codable> {
```

Note: the existing doc comment block stays where it is; the two new lines sit between it and the class keyword. If the macro complains about the `defaults` constant, mark it `@ObservationIgnored private let defaults: UserDefaults` — `let` properties normally need no annotation.

- [ ] **Step 5: Run tests to verify they pass**

Run: `swift test --package-path packages/AllyClockCore`
Expected: PASS — all existing suites (BandConfigStore, DimensionRegistry, FullscreenConfigStore, FullscreenSizing, TimeFormatting, WorldCardsConfigStore, ZoneCountry, PackageSmoke) plus the two new observation tests.

- [ ] **Step 6: Verify the app still builds against the bumped package**

Run: `cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 7: Commit**

```bash
git add packages/AllyClockCore/Package.swift packages/AllyClockCore/Sources/AllyClockCore/Dimensions/BandConfigStore.swift packages/AllyClockCore/Tests/AllyClockCoreTests/BandConfigStoreTests.swift
git commit -m "feat(core): make BandConfigStore @Observable for live config editing"
```

---

### Task 2: ZoneCatalog port in AllyClockCore

Port `apps/web/src/app/core/zone-catalog.ts` onto Foundation. `TimeZone.knownTimeZoneIdentifiers` plays `Intl.supportedValuesOf('timeZone')`; `secondsFromGMT(for:)` replaces longOffset parsing. No cache — the web caches because the Intl scan is slow; Foundation's is cheap, so options build on demand (noted deviation). `resolve(_:)` also handles ASCII fixed-offset ids (`"+05:30"`), which `TimeZone(identifier:)` rejects but the web's Intl accepts.

**Files:**
- Create: `packages/AllyClockCore/Sources/AllyClockCore/Zones/ZoneCatalog.swift`
- Test: `packages/AllyClockCore/Tests/AllyClockCoreTests/ZoneCatalogTests.swift`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `struct TimeZoneOption: Equatable, Sendable { let id: String; let label: String; let offset: Int }` (offset = minutes east of UTC)
  - `ZoneCatalog.buildOptions(localZone: String = TimeZone.current.identifier, at: Date = Date()) -> [TimeZoneOption]`
  - `ZoneCatalog.buildSpecialZones() -> [TimeZoneOption]`
  - `ZoneCatalog.formatOffset(_ minutes: Int) -> String`
  - `ZoneCatalog.zoneOffsetMinutes(_ id: String, at: Date) -> Int`
  - `ZoneCatalog.resolve(_ id: String) -> TimeZone?`

- [ ] **Step 1: Write the failing tests**

Create `packages/AllyClockCore/Tests/AllyClockCoreTests/ZoneCatalogTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class ZoneCatalogTests: XCTestCase {
    // Fixed instants so DST assertions are deterministic.
    private let jan = Date(timeIntervalSince1970: 1_768_435_200) // 2026-01-15T00:00:00Z
    private let jul = Date(timeIntervalSince1970: 1_784_073_600) // 2026-07-15T00:00:00Z

    func test_offsetMinutesTracksDST() {
        XCTAssertEqual(ZoneCatalog.zoneOffsetMinutes("America/Los_Angeles", at: jan), -480)
        XCTAssertEqual(ZoneCatalog.zoneOffsetMinutes("America/Los_Angeles", at: jul), -420)
        XCTAssertEqual(ZoneCatalog.zoneOffsetMinutes("Asia/Seoul", at: jan), 540)
    }

    func test_formatOffsetUsesU2212AndPadding() {
        XCTAssertEqual(ZoneCatalog.formatOffset(540), "+09:00")
        XCTAssertEqual(ZoneCatalog.formatOffset(-450), "\u{2212}07:30")
        XCTAssertEqual(ZoneCatalog.formatOffset(0), "+00:00")
    }

    func test_buildOptionsLabelsAndSorts() {
        let options = ZoneCatalog.buildOptions(localZone: "Asia/Seoul", at: jan)
        let seoul = options.first { $0.id == "Asia/Seoul" }
        XCTAssertEqual(seoul?.label, "Asia/Seoul  +09:00")
        XCTAssertEqual(seoul?.offset, 540)
        // Sorted by offset then id.
        let offsets = options.map(\.offset)
        XCTAssertEqual(offsets, offsets.sorted())
        // Unknown local zone is prepended, not dropped.
        XCTAssertTrue(ZoneCatalog.buildTimeZones(localZone: "Not/AZone").contains("Not/AZone"))
    }

    func test_specialZonesSpanMinus12ToPlus14() {
        let special = ZoneCatalog.buildSpecialZones()
        XCTAssertEqual(special.count, 53) // UTC + 52 half-hour offsets
        XCTAssertEqual(special.first?.offset, -720)
        XCTAssertEqual(special.last?.offset, 840)
        let bombay = special.first { $0.id == "+05:30" }
        XCTAssertEqual(bombay?.offset, 330)
        let pst = special.first { $0.id == "-08:00" }
        XCTAssertEqual(pst?.label, "GMT\u{2212}08:00")
        XCTAssertEqual(special.first { $0.id == "UTC" }?.label, "UTC")
    }

    func test_resolveHandlesIANAAndFixedOffsetIds() {
        XCTAssertEqual(ZoneCatalog.resolve("Asia/Seoul")?.identifier, "Asia/Seoul")
        XCTAssertEqual(ZoneCatalog.resolve("+05:30")?.secondsFromGMT(), 19_800)
        XCTAssertEqual(ZoneCatalog.resolve("-08:00")?.secondsFromGMT(), -28_800)
        XCTAssertNil(ZoneCatalog.resolve("Not/AZone"))
        XCTAssertNil(ZoneCatalog.resolve(""))
        XCTAssertNil(ZoneCatalog.resolve("+5:30")) // malformed: must be +HH:MM
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `swift test --package-path packages/AllyClockCore --filter ZoneCatalogTests`
Expected: COMPILE ERROR — `ZoneCatalog` and `TimeZoneOption` not defined.

- [ ] **Step 3: Write the implementation**

Create `packages/AllyClockCore/Sources/AllyClockCore/Zones/ZoneCatalog.swift`:

```swift
import Foundation

/// One picker row: a zone id, display label, and current UTC offset (minutes
/// east) for sorting. Port of `TimeZoneOption` in `zone-catalog.ts`.
public struct TimeZoneOption: Equatable, Sendable {
    public let id: String
    public let label: String
    public let offset: Int
    public init(id: String, label: String, offset: Int) {
        self.id = id; self.label = label; self.offset = offset
    }
}

/// Zone list + labels for pickers. Port of `zone-catalog.ts` onto Foundation:
/// `TimeZone.knownTimeZoneIdentifiers` plays `Intl.supportedValuesOf` and
/// `secondsFromGMT(for:)` replaces longOffset parsing. Built on demand — the
/// web caches only because the Intl scan is slow; Foundation's is cheap.
public enum ZoneCatalog {
    /// All known zone ids, with `localZone` prepended when Foundation doesn't
    /// know it (parity with the web's local-zone injection).
    public static func buildTimeZones(localZone: String) -> [String] {
        let base = TimeZone.knownTimeZoneIdentifiers
        return base.contains(localZone) ? base : [localZone] + base
    }

    /// Current UTC offset (minutes east) for a zone id at an instant; 0 for
    /// unresolvable ids (the web's bare-"GMT" fallback).
    public static func zoneOffsetMinutes(_ id: String, at date: Date) -> Int {
        guard let zone = resolve(id) else { return 0 }
        return zone.secondsFromGMT(for: date) / 60
    }

    /// "+09:00" / "−07:30" (U+2212 minus, matching the rest of the app).
    public static func formatOffset(_ minutes: Int) -> String {
        let sign = minutes < 0 ? "\u{2212}" : "+"
        let abs = Swift.abs(minutes)
        return String(format: "%@%02d:%02d", sign, abs / 60, abs % 60)
    }

    /// Picker options: each zone labelled with its current GMT offset, sorted
    /// by offset then zone id.
    public static func buildOptions(localZone: String = TimeZone.current.identifier,
                                    at date: Date = Date()) -> [TimeZoneOption]
    {
        buildTimeZones(localZone: localZone)
            .map { id in
                let offset = zoneOffsetMinutes(id, at: date)
                return TimeZoneOption(id: id, label: "\(id)  \(formatOffset(offset))",
                                      offset: offset)
            }
            .sorted { ($0.offset, $0.id) < ($1.offset, $1.id) }
    }

    /// Fixed-offset "special" zones: UTC plus every 30-minute GMT offset from
    /// −12:00 to +14:00. Ids are ASCII offset strings ("+05:30") resolved via
    /// `resolve`; labels use U+2212.
    public static func buildSpecialZones() -> [TimeZoneOption] {
        var zones = [TimeZoneOption(id: "UTC", label: "UTC", offset: 0)]
        for minutes in stride(from: -720, through: 840, by: 30) where minutes != 0 {
            let abs = Swift.abs(minutes)
            let id = String(format: "%@%02d:%02d", minutes < 0 ? "-" : "+", abs / 60, abs % 60)
            zones.append(TimeZoneOption(id: id, label: "GMT\(formatOffset(minutes))",
                                        offset: minutes))
        }
        return zones.sorted { ($0.offset, $0.id) < ($1.offset, $1.id) }
    }

    /// TimeZone for an id: IANA identifier, or an ASCII fixed-offset id
    /// ("+05:30" / "-08:00") via `secondsFromGMT` — Foundation doesn't parse
    /// those as identifiers the way the web's Intl does.
    public static func resolve(_ id: String) -> TimeZone? {
        if let zone = TimeZone(identifier: id) { return zone }
        return fixedOffsetMinutes(id).flatMap { TimeZone(secondsFromGMT: $0 * 60) }
    }

    /// Parse "+HH:MM"/"-HH:MM" (exactly 6 ASCII chars) to signed minutes.
    private static func fixedOffsetMinutes(_ id: String) -> Int? {
        guard id.count == 6, id.first == "+" || id.first == "-",
              id[id.index(id.startIndex, offsetBy: 3)] == ":",
              let h = Int(id.dropFirst().prefix(2)), let m = Int(id.suffix(2)),
              h <= 14, m <= 59 else { return nil }
        let minutes = h * 60 + m
        return id.first == "-" ? -minutes : minutes
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `swift test --package-path packages/AllyClockCore`
Expected: PASS — ZoneCatalogTests plus all existing suites.

- [ ] **Step 5: Commit**

```bash
git add packages/AllyClockCore/Sources/AllyClockCore/Zones/ZoneCatalog.swift packages/AllyClockCore/Tests/AllyClockCoreTests/ZoneCatalogTests.swift
git commit -m "feat(core): port zone-catalog — picker options, offsets, fixed-offset resolve"
```

---

### Task 3: Real Adjust sliders + live ratio wiring

Replace the Adjust stub for the Fullscreen face with the web's two sliders (`fullscreen-config.component` port), targeting the band resolved from the live full-bleed ratio. `RootFaceView` keeps its `DimensionRegistry` and passes ratio + store down. World Cards keeps its placeholder.

**Files:**
- Modify: `apps/ios/AllyClock/App/AdjustSheetView.swift` (full rewrite)
- Modify: `apps/ios/AllyClock/App/RootFaceView.swift`
- Modify: `packages/AllyClockCore/Sources/AllyClockCore/Faces/Fullscreen/FullscreenFields.swift` (add `SectionKey.dateKeys`)

**Interfaces:**
- Consumes: `@Observable BandConfigStore` (Task 1); existing `FullscreenConfigStore.updateSection(_:_:_:)`, `config(_:)`, `DimensionRegistry.resolveForRatio(_:)`.
- Produces: `AdjustSheetView(face:fullscreenStore:registry:ratio:)` — new signature `RootFaceView` calls; `SectionKey.dateKeys: [SectionKey]` in core (used again by any future panel).

- [ ] **Step 1: Add `SectionKey.dateKeys` to core**

In `packages/AllyClockCore/Sources/AllyClockCore/Faces/Fullscreen/FullscreenFields.swift`, replace:

```swift
public enum SectionKey: CaseIterable { case time, weekday, month, day, gmt }
```

with:

```swift
public enum SectionKey: CaseIterable { case time, weekday, month, day, gmt }

public extension SectionKey {
    /// Date-row sections the Date slider broadcasts to (web `DATE_SECTION_KEYS`).
    static let dateKeys: [SectionKey] = [.weekday, .month, .day, .gmt]
}
```

- [ ] **Step 2: Rewrite AdjustSheetView**

Replace the entire contents of `apps/ios/AllyClock/App/AdjustSheetView.swift` with:

```swift
import AllyClockCore
import SwiftUI

/// Adjust panel for the active face. Fullscreen gets the web's Adjustment
/// panel (`fullscreen-config.component`): Time and Date size sliders editing
/// the band resolved from the live face ratio. World Cards still lists its
/// planned controls until its own panel is ported.
struct AdjustSheetView: View {
    let face: FaceKind
    let fullscreenStore: FullscreenConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    var body: some View {
        switch face {
        case .fullscreen:
            FullscreenAdjustView(store: fullscreenStore, registry: registry, ratio: ratio)
        case .worldCards:
            VStack(alignment: .leading, spacing: 12) {
                Text(face.displayName)
                    .font(.subheadline.weight(.semibold))
                Text("Live layout editing for this face is coming next.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(
                        ["Add & remove cities", "Card size", "Row breaks", "Seconds & date detail"],
                        id: \.self
                    ) { item in
                        Label(item, systemImage: "slider.horizontal.3")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
        }
    }
}

/// Time + Date size sliders, per dimension band. The Date slider broadcasts
/// one value to all four date sections, like the web's `onDateSize`. Slider
/// range/step and the `%.2f` readout match the web knobs exactly.
struct FullscreenAdjustView: View {
    let store: FullscreenConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    private var bandId: String { registry.resolveForRatio(ratio).id }

    var body: some View {
        let fields = store.config(bandId)
        VStack(spacing: 16) {
            sliderRow("Time", value: fields.sections.time.sizeScale) { value in
                store.updateSection(bandId, .time) { var s = $0; s.sizeScale = value; return s }
            }
            sliderRow("Date", value: fields.sections.month.sizeScale) { value in
                for key in SectionKey.dateKeys {
                    store.updateSection(bandId, key) { var s = $0; s.sizeScale = value; return s }
                }
            }
        }
        .padding(.horizontal, 24)
    }

    private func sliderRow(_ label: String, value: Double,
                           set: @escaping (Double) -> Void) -> some View
    {
        HStack(spacing: 12) {
            Text(label)
                .font(.subheadline.weight(.semibold))
                .frame(width: 48, alignment: .leading)
            Slider(value: Binding(get: { value }, set: set), in: 0.5 ... 2.0, step: 0.05)
            Text(String(format: "%.2f", value))
                .font(.footnote.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 36, alignment: .trailing)
        }
    }
}
```

- [ ] **Step 3: Wire RootFaceView — keep the registry, compute the full-bleed ratio, pass both down**

In `apps/ios/AllyClock/App/RootFaceView.swift`:

3a. Replace the stored properties + init:

```swift
    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        fullscreenStore = FullscreenConfigStore(registry: reg)
        worldCardsStore = WorldCardsConfigStore(registry: reg)
    }
```

with:

```swift
    private let registry: DimensionRegistry
    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        registry = reg
        fullscreenStore = FullscreenConfigStore(registry: reg)
        worldCardsStore = WorldCardsConfigStore(registry: reg)
    }
```

3b. Inside the `GeometryReader { outer in` closure, replace:

```swift
            let hInset = max(outer.safeAreaInsets.leading, outer.safeAreaInsets.trailing)
```

with:

```swift
            let hInset = max(outer.safeAreaInsets.leading, outer.safeAreaInsets.trailing)
            // Full-bleed ratio: `outer` reads the safe-area frame, but the face
            // fills the whole screen (the ZStack ignores the safe area), so add
            // the insets back to match the ratio the face itself resolves.
            let fullWidth = outer.size.width
                + outer.safeAreaInsets.leading + outer.safeAreaInsets.trailing
            let fullHeight = outer.size.height
                + outer.safeAreaInsets.top + outer.safeAreaInsets.bottom
            let ratio = fullWidth / max(fullHeight, 1)
```

3c. Replace the Adjust sheet block:

```swift
                if adjustOpen {
                    GlassSheet(title: "Adjust", hInset: hInset, onClose: { close($adjustOpen) }) {
                        AdjustSheetView(face: face)
                    }
                    .zIndex(1)
                }
```

with (title matches the web's "Adjustment" header):

```swift
                if adjustOpen {
                    GlassSheet(title: "Adjustment", hInset: hInset,
                               onClose: { close($adjustOpen) })
                    {
                        AdjustSheetView(face: face, fullscreenStore: fullscreenStore,
                                        registry: registry, ratio: ratio)
                    }
                    .zIndex(1)
                }
```

3d. In `.onAppear`, add an Adjust test hook after the `-openPicker` line:

```swift
            if ProcessInfo.processInfo.arguments.contains("-openAdjust") { adjustOpen = true }
```

- [ ] **Step 4: Build**

Run: `cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Run core + app tests**

Run: `swift test --package-path packages/AllyClockCore && cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test`
Expected: PASS (core suites; app FaceKindTests + FlagResolutionTests).

- [ ] **Step 6: Commit**

```bash
git add packages/AllyClockCore/Sources/AllyClockCore/Faces/Fullscreen/FullscreenFields.swift apps/ios/AllyClock/App/AdjustSheetView.swift apps/ios/AllyClock/App/RootFaceView.swift
git commit -m "feat(ios): real Adjustment sliders for the Fullscreen face, per live band"
```

---

### Task 4: ZonePickerView (shared searchable zone list)

Port of `zone-picker.component`: a search field over a scrollable filtered list, flag per row, live-apply on tap. Hosts supply the options (including any synthetic leading entry) and the selected id, and place this inside their own sheet with a back/cancel control.

**Files:**
- Create: `apps/ios/AllyClock/Shared/ZonePickerView.swift`

**Interfaces:**
- Consumes: `TimeZoneOption` (Task 2), existing `FlagView(zone:)` (globe fallback for countryless/synthetic ids), `SFIcon`.
- Produces: `ZonePickerView(options: [TimeZoneOption], selectedId: String, onPick: @escaping (String) -> Void)` — used by `FullscreenSettingsView` in Task 5.

- [ ] **Step 1: Write the view**

Create `apps/ios/AllyClock/Shared/ZonePickerView.swift`:

```swift
import AllyClockCore
import SwiftUI

/// Searchable zone list: a search field over a scrollable, filtered list.
/// Live-apply on tap (calls `onPick` immediately — no draft/commit). Hosts
/// supply the options (incl. any synthetic leading entry like "Follow
/// System") and the selected id, and place this inside their own sheet with
/// a back/cancel control. Port of `zone-picker.component`.
struct ZonePickerView: View {
    let options: [TimeZoneOption]
    let selectedId: String
    let onPick: (String) -> Void

    @State private var query = ""

    private var filtered: [TimeZoneOption] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return q.isEmpty ? options : options.filter { $0.label.lowercased().contains(q) }
    }

    var body: some View {
        VStack(spacing: 8) {
            TextField("Search time zone", text: $query)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .accessibilityLabel("Search time zone")
            ScrollView {
                LazyVStack(spacing: 2) {
                    ForEach(filtered, id: \.id) { zone in
                        row(zone)
                    }
                    if filtered.isEmpty {
                        Text("No matching time zone")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .padding(.top, 12)
                    }
                }
            }
            .frame(height: 280)
        }
    }

    private func row(_ zone: TimeZoneOption) -> some View {
        Button { onPick(zone.id) } label: {
            HStack(spacing: 10) {
                FlagView(zone: zone.id).frame(width: 18, height: 18)
                Text(zone.label).font(.subheadline).lineLimit(1)
                Spacer(minLength: 0)
                if zone.id == selectedId {
                    SFIcon("checkmark").frame(width: 14, height: 14)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
            .background(
                zone.id == selectedId ? Color.white.opacity(0.12) : .clear,
                in: RoundedRectangle(cornerRadius: 8)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview("Zone picker") {
    ZonePickerView(
        options: [TimeZoneOption(id: "", label: "Follow System", offset: -100_000)]
            + ZoneCatalog.buildOptions(),
        selectedId: ""
    ) { _ in }
    .padding(24)
    .background(Color.black)
    .preferredColorScheme(.dark)
}
```

- [ ] **Step 2: Build**

Run: `cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`
(New files under `apps/ios/AllyClock/` are picked up automatically — the target uses folder-synchronized groups. If the build can't find `ZonePickerView`, check `AllyClock.xcodeproj` membership.)

- [ ] **Step 3: Commit**

```bash
git add apps/ios/AllyClock/Shared/ZonePickerView.swift
git commit -m "feat(ios): searchable ZonePickerView — port of the web zone picker"
```

---

### Task 5: FullscreenSettingsView + gear entry + fixed-offset zone resolution

The Settings panel (web `fullscreen-toggles.component`): Seconds/Weekday pair, Zone/GMT/Flag row, Bar segmented control, Time Zone field pushing into the zone picker. Entry is a gear button overlaid bottom-trailing on the fullscreen face only, riding the existing chrome auto-hide. The face's zone resolution also gains the `ZoneCatalog.resolve` fallback so fixed-offset ids render (future-proofing per spec; the fullscreen picker itself lists IANA zones + "Follow System" only, matching web).

**Files:**
- Create: `apps/ios/AllyClock/Faces/FullscreenSettingsView.swift`
- Modify: `apps/ios/AllyClock/App/RootFaceView.swift`
- Modify: `apps/ios/AllyClock/Faces/FullscreenFaceView.swift:47-48`

**Interfaces:**
- Consumes: `FullscreenConfigStore` broadcast setters (`setSecondsVisibleAll`, `setSectionVisibleAll`, `setZoneVisibleAll`, `setFlagVisibleAll`, `setBarModeAll`, `setTimeZoneAll`), `sample()`; `ZonePickerView` (Task 4); `ZoneCatalog.buildOptions()`/`resolve(_:)` (Task 2); existing `GlassSheet`, `GlassIconButton`.
- Produces: `FullscreenSettingsView(store: FullscreenConfigStore)`; `RootFaceView` gains `settingsOpen` state + gear button; `-openSettings` launch-arg test hook.

- [ ] **Step 1: Write FullscreenSettingsView**

Create `apps/ios/AllyClock/Faces/FullscreenSettingsView.swift`:

```swift
import AllyClockCore
import SwiftUI

/// Settings panel for the Fullscreen face — port of the web's
/// `fullscreen-toggles.component`, opened from the face's gear. Toggles and
/// the bar mode broadcast to every band ("applies to all"); the zone row
/// pushes into the shared zone picker. Applies live, accepts on any
/// dismissal (GlassSheet rule).
struct FullscreenSettingsView: View {
    let store: FullscreenConfigStore

    @State private var zonePickerOpen = false
    // Built once per presentation: "Follow System" + the IANA catalog (the
    // web prepends the same synthetic '' entry; its label mentions the Time
    // Machine, which iOS doesn't have).
    @State private var zoneOptions: [TimeZoneOption] =
        [TimeZoneOption(id: "", label: "Follow System", offset: -100_000)]
            + ZoneCatalog.buildOptions()

    var body: some View {
        let fields = store.sample()
        if zonePickerOpen {
            VStack(spacing: 12) {
                ZonePickerView(options: zoneOptions, selectedId: fields.timeZone) { id in
                    store.setTimeZoneAll(id)
                    zonePickerOpen = false
                }
                Button("Cancel") { zonePickerOpen = false }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 24)
        } else {
            VStack(spacing: 20) {
                HStack(spacing: 24) {
                    toggleCell("Seconds", isOn: fields.secondsVisible) {
                        store.setSecondsVisibleAll($0)
                    }
                    toggleCell("Weekday", isOn: fields.sections.weekday.visible) {
                        store.setSectionVisibleAll(.weekday, $0)
                    }
                }
                HStack(spacing: 24) {
                    toggleCell("Zone", isOn: fields.zoneVisible) { store.setZoneVisibleAll($0) }
                    toggleCell("GMT", isOn: fields.sections.gmt.visible) {
                        store.setSectionVisibleAll(.gmt, $0)
                    }
                    toggleCell("Flag", isOn: fields.flagVisible) { store.setFlagVisibleAll($0) }
                }
                barRow(fields.bar.mode)
                zoneRow(fields.timeZone)
            }
            .padding(.horizontal, 24)
        }
    }

    private func toggleCell(_ label: String, isOn: Bool,
                            set: @escaping (Bool) -> Void) -> some View
    {
        Toggle(label, isOn: Binding(get: { isOn }, set: set))
            .font(.subheadline)
            .toggleStyle(.switch)
    }

    private func barRow(_ mode: BarMode) -> some View {
        HStack(spacing: 12) {
            Text("Bar")
                .font(.subheadline)
                .frame(width: 48, alignment: .leading)
            Picker("Bar mode", selection: Binding(get: { mode },
                                                  set: { store.setBarModeAll($0) }))
            {
                Text("Off").tag(BarMode.off)
                Text("Divider").tag(BarMode.divider)
                Text("Progress").tag(BarMode.progress)
            }
            .pickerStyle(.segmented)
        }
    }

    private func zoneRow(_ timeZone: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Time Zone")
                .font(.subheadline)
            Button { zonePickerOpen = true } label: {
                HStack(spacing: 10) {
                    FlagView(zone: timeZone).frame(width: 18, height: 18)
                    Text(zoneOptions.first { $0.id == timeZone }?.label ?? timeZone)
                        .font(.subheadline)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    SFIcon("chevron.right").frame(width: 12, height: 12)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Time Zone")
        }
    }
}

#Preview("Fullscreen settings") {
    FullscreenSettingsView(store: FullscreenConfigStore(registry: DimensionRegistry()))
        .padding(.vertical, 24)
        .background(Color.black)
        .preferredColorScheme(.dark)
}
```

- [ ] **Step 2: Add the gear + Settings sheet to RootFaceView**

In `apps/ios/AllyClock/App/RootFaceView.swift`:

2a. Add state below `@State private var adjustOpen = false`:

```swift
    @State private var settingsOpen = false
```

2b. Extend `sheetOpen`:

```swift
    private var sheetOpen: Bool {
        pickerOpen || adjustOpen || settingsOpen
    }
```

2c. Inside the `ZStack(alignment: .bottom)`, after the `controlsBar` block (before the `if pickerOpen` sheet), add the gear — fullscreen face only, bottom-trailing, same auto-hide rhythm as the controls bar (web: the gear "auto-hides with the controls" and sits on the controls bar's bottom line):

```swift
                if face == .fullscreen {
                    GlassIconButton(icon: "gearshape", label: "Display options") {
                        withAnimation(.easeOut(duration: 0.25)) { settingsOpen = true }
                    }
                    .debugFrame("gear", .mint)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, max(16, hInset))
                    .padding(.bottom, 16)
                    .opacity(chromeVisible && !sheetOpen ? 1 : 0)
                    .animation(.easeInOut(duration: 0.3), value: chromeVisible)
                }
```

2d. After the `if adjustOpen { ... }` sheet block, add:

```swift
                if settingsOpen {
                    GlassSheet(title: "Settings", hInset: hInset,
                               onClose: { close($settingsOpen) })
                    {
                        FullscreenSettingsView(store: fullscreenStore)
                    }
                    .zIndex(1)
                }
```

2e. In `.onAppear`, add the test hook after the `-openAdjust` line:

```swift
            if ProcessInfo.processInfo.arguments.contains("-openSettings") { settingsOpen = true }
```

- [ ] **Step 3: Fixed-offset zone resolution in the face**

In `apps/ios/AllyClock/Faces/FullscreenFaceView.swift`, replace (lines 47–48):

```swift
        let zone = f.timeZone.isEmpty ? TimeZone
            .current : (TimeZone(identifier: f.timeZone) ?? .current)
```

with:

```swift
        // ZoneCatalog.resolve also accepts fixed-offset ids ("+05:30") that
        // TimeZone(identifier:) rejects; unknown ids fall back to the device.
        let zone = f.timeZone.isEmpty ? TimeZone.current
            : (ZoneCatalog.resolve(f.timeZone) ?? .current)
```

- [ ] **Step 4: Build**

Run: `cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add apps/ios/AllyClock/Faces/FullscreenSettingsView.swift apps/ios/AllyClock/App/RootFaceView.swift apps/ios/AllyClock/Faces/FullscreenFaceView.swift
git commit -m "feat(ios): Fullscreen Settings panel — gear entry, toggles, bar mode, zone picker"
```

---

### Task 6: Full verification pass

Everything is wired; verify the whole loop end-to-end and leave the tree lint-clean. The simulator checks exercise the live-edit path that unit tests can't.

**Files:**
- Possibly modified by formatting: any `apps/ios` Swift file.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified feature; clean lint/format; final commit if formatters changed files.

- [ ] **Step 1: Core + app test suites**

Run: `swift test --package-path packages/AllyClockCore && cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test`
Expected: PASS everywhere.

- [ ] **Step 2: Lint + format**

Run from `apps/ios`: `swiftlint` then `swiftformat AllyClock AllyClockTests`
Expected: swiftlint 0 violations; swiftformat either "0/N files formatted" or a small diff — review any diff, rebuild if nonempty.

- [ ] **Step 3: Simulator — live Adjustment loop**

Boot a simulator, install, and launch with the Adjust hook:

```bash
xcrun simctl boot "iPhone 17" || true
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build
xcrun simctl install "iPhone 17" ~/Library/Developer/Xcode/DerivedData/AllyClock-*/Build/Products/Debug-iphonesimulator/AllyClock.app
xcrun simctl launch "iPhone 17" $(defaults read "$(ls ~/Library/Developer/Xcode/DerivedData/AllyClock-*/Build/Products/Debug-iphonesimulator/AllyClock.app/Info.plist | head -1)" CFBundleIdentifier 2>/dev/null || echo io.allyclock.AllyClock) -openAdjust
```

(If the bundle-id lookup is awkward, read it once with `plutil -extract CFBundleIdentifier raw .../AllyClock.app/Info.plist` and inline it.)

Verify by driving the UI (XcodeBuildMCP if available, else `simctl io screenshot` before/after):
- Dragging the Time slider visibly resizes the digits **while dragging**.
- Dragging the Date slider resizes the whole date row; readout shows two decimals.
- Kill and relaunch: values persisted.

- [ ] **Step 4: Simulator — Settings loop**

Relaunch with `-openSettings` and verify:
- All five toggles flip their sections live (Seconds flank, Weekday, Zone city, GMT block, Flag) behind the sheet.
- Bar segment: Off hides the bar, Divider shows the thin line, Progress animates within the minute.
- Time Zone row opens the picker; searching "Seoul" filters; picking Asia/Seoul re-renders the clock time behind the sheet; "Follow System" restores the device zone; Cancel returns without changes.
- Close via X and via backdrop tap: both accept (values stay).
- Gear only appears on the Fullscreen face (switch to World Cards via the picker: no gear) and auto-hides with the chrome after ~3s.

- [ ] **Step 5: Rotation / band check**

Verify in landscape and portrait (rotate the simulator): the Adjustment slider edits the current orientation's band only — set Time to 1.5 in landscape, rotate to portrait, confirm the portrait size is unchanged, rotate back, confirm 1.5 stuck.

- [ ] **Step 6: Commit any formatter fallout**

```bash
git add -A apps/ios packages/AllyClockCore
git diff --cached --quiet || git commit -m "style(ios): swiftformat/swiftlint pass after fullscreen panels"
```

---

## Plan self-review notes

- **Spec coverage:** observability (Task 1), ZoneCatalog + fixed-offset resolve (Task 2), Adjust sliders + live-ratio band (Task 3), zone picker (Task 4), Settings + gear + face resolve fallback (Task 5), verification checklist incl. persistence/rotation/auto-hide (Task 6). Spec's "Swift Testing" corrected to XCTest (house style); fullscreen picker options exclude special GMT zones, matching the web (`fullscreen-toggles` uses `catalog.options()` only — special zones are World Cards-only there too).
- **Placement note:** the gear + Settings sheet are hosted by `RootFaceView` (which owns chrome visibility, `hInset`, and sheet z-ordering) rather than inside `FullscreenFaceView`; placement and behavior — bottom-trailing gear on the fullscreen face only, auto-hiding — match the approved design. `FullscreenFaceView` stays a pure renderer, which keeps its previews store-only.
- **Type consistency:** `TimeZoneOption(id:label:offset:)`, `ZonePickerView(options:selectedId:onPick:)`, `AdjustSheetView(face:fullscreenStore:registry:ratio:)`, `FullscreenSettingsView(store:)`, `SectionKey.dateKeys` used consistently across tasks.
