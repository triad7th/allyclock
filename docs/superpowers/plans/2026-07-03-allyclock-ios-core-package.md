# AllyClockCore Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `AllyClockCore`, a pure-Foundation Swift package that ports the AllyClock web app's clock formatting, timezone data, aspect-ratio "dimension bands", per-band config persistence, and face field models — the shared foundation the iOS app (and later tvOS/watchOS) render on top of.

**Architecture:** A local SwiftPM package at `packages/AllyClockCore` with one library product. All logic is Foundation-only (no SwiftUI, no Xcode project), so it builds and tests via `swift build` / `swift test` on the macOS host. It mirrors the web's `core` + face-model tiers 1:1: `DimensionRegistry` (ratio→band), generic `BandConfigStore<T>` (Codable + UserDefaults), `TimeFormatting`, `ZoneCountry`, and the `Fullscreen`/`WorldCards` field models + presets + stores.

**Tech Stack:** Swift 6.2, SwiftPM, Foundation, XCTest.

## Global Constraints

- Package name: `AllyClockCore`; single library product of the same name; local package at repo path `packages/AllyClockCore`.
- Platforms declared in `Package.swift`: `.iOS(.v16)`, `.tvOS(.v16)`, `.watchOS(.v9)`. Tests run on the macOS host.
- Foundation-only. No `import SwiftUI`, no `import UIKit`, no CoreGraphics. Sizing math uses plain `Double`.
- Flags are **regional-indicator emoji** derived from ISO country codes (never image assets).
- Time-dependent tests use fixed `Date` values and explicit `TimeZone`/`Locale` so assertions are deterministic (repo testing rule).
- The 8 dimension bands, all preset field values, and `MIN_CARDS`/`MAX_CARDS` are copied verbatim from the web source — exact values are given in each task.
- Web source of truth (read, do not modify): `apps/web/src/app/core/` and `apps/web/src/app/features/faces/`.
- Two-space file layout, one type family per file, UTF-8, final newline.
- Commit after each task with the trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UxoDX9SeNTRX7ZHaiKU8oi
  ```

## File Structure

```
packages/AllyClockCore/
  Package.swift
  Sources/AllyClockCore/
    Dimensions/DimensionBand.swift          — band value type + the 8 built-ins
    Dimensions/DimensionRegistry.swift       — ratio → band resolution
    Dimensions/BandConfigStore.swift         — generic Codable per-band store (UserDefaults)
    Clock/TimeFormatting.swift               — bigTime/dateParts/precise/offset/zoneCity
    Zones/ZoneCountry.swift                  — IANA→ISO table + flag emoji
    Faces/Fullscreen/FullscreenFields.swift  — field model + sizing math
    Faces/Fullscreen/FullscreenPresets.swift — per-band defaults
    Faces/Fullscreen/FullscreenConfigStore.swift
    Faces/WorldCards/WorldCardsFields.swift  — field model + MIN/MAX
    Faces/WorldCards/WorldCardsPresets.swift — per-band defaults
    Faces/WorldCards/WorldCardsConfigStore.swift
  Tests/AllyClockCoreTests/
    DimensionRegistryTests.swift
    BandConfigStoreTests.swift
    TimeFormattingTests.swift
    ZoneCountryTests.swift
    FullscreenConfigStoreTests.swift
    FullscreenSizingTests.swift
    WorldCardsConfigStoreTests.swift
```

Run all package commands from `packages/AllyClockCore`. `swift test` builds and runs the whole suite.

---

### Task 1: Package scaffold

**Files:**
- Create: `packages/AllyClockCore/Package.swift`
- Create: `packages/AllyClockCore/Sources/AllyClockCore/AllyClockCore.swift`
- Test: `packages/AllyClockCore/Tests/AllyClockCoreTests/PackageSmokeTests.swift`

**Interfaces:**
- Produces: module `AllyClockCore`; `public enum AllyClockCore { public static let version: String }`.

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/PackageSmokeTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class PackageSmokeTests: XCTestCase {
    func test_moduleExposesVersion() {
        XCTAssertEqual(AllyClockCore.version, "0.1.0")
    }
}
```

- [ ] **Step 2: Create `Package.swift`**

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AllyClockCore",
    platforms: [.iOS(.v16), .tvOS(.v16), .watchOS(.v9)],
    products: [
        .library(name: "AllyClockCore", targets: ["AllyClockCore"]),
    ],
    targets: [
        .target(name: "AllyClockCore"),
        .testTarget(name: "AllyClockCoreTests", dependencies: ["AllyClockCore"]),
    ]
)
```

- [ ] **Step 3: Create the module entry file**

`Sources/AllyClockCore/AllyClockCore.swift`:

```swift
import Foundation

/// Namespace marker for the AllyClock shared core.
public enum AllyClockCore {
    public static let version = "0.1.0"
}
```

- [ ] **Step 4: Run the test**

Run: `cd packages/AllyClockCore && swift test`
Expected: builds; `PackageSmokeTests` passes.

- [ ] **Step 5: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): scaffold AllyClockCore SwiftPM package"
```

---

### Task 2: Dimension bands + registry

**Files:**
- Create: `Sources/AllyClockCore/Dimensions/DimensionBand.swift`
- Create: `Sources/AllyClockCore/Dimensions/DimensionRegistry.swift`
- Test: `Tests/AllyClockCoreTests/DimensionRegistryTests.swift`

Port of `apps/web/src/app/core/dimensions/dimension-band.ts` and `dimension-registry.service.ts`. Band editing/persistence is out of scope (no band-editor UI on iOS v1), so the registry holds the static built-ins only.

**Interfaces:**
- Produces:
  - `public struct DimensionBand: Equatable { public let id: String; public let name: String; public let minRatio: Double; public let maxRatio: Double }`
  - `public let builtInBands: [DimensionBand]`
  - `public final class DimensionRegistry { public init(); public var bands: [DimensionBand]; public func resolveForRatio(_ ratio: Double) -> DimensionBand }`

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/DimensionRegistryTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class DimensionRegistryTests: XCTestCase {
    private let registry = DimensionRegistry()

    func test_eightBuiltInBandsInOrder() {
        XCTAssertEqual(builtInBands.map(\.id),
                       ["phone", "tall", "pad", "lap", "wide", "mini", "ultra", "super"])
    }

    func test_resolvesRatioIntoContainingBand() {
        XCTAssertEqual(registry.resolveForRatio(0.46).id, "phone")   // portrait phone
        XCTAssertEqual(registry.resolveForRatio(0.75).id, "tall")    // portrait pad
        XCTAssertEqual(registry.resolveForRatio(1.33).id, "pad")     // landscape pad
        XCTAssertEqual(registry.resolveForRatio(2.16).id, "mini")    // landscape phone
    }

    func test_boundariesAreMinInclusiveMaxExclusive() {
        XCTAssertEqual(registry.resolveForRatio(0.62).id, "tall")    // 0.62 belongs to tall
        XCTAssertEqual(registry.resolveForRatio(0.0).id, "phone")
    }

    func test_openTopBandAndNearestFallback() {
        XCTAssertEqual(registry.resolveForRatio(8.56).id, "super")   // ratio above all → super
        XCTAssertEqual(registry.resolveForRatio(-1.0).id, "phone")   // below all → nearest = phone
    }
}
```

- [ ] **Step 2: Run the test**

Run: `swift test --filter DimensionRegistryTests`
Expected: FAIL — `DimensionBand`/`DimensionRegistry` undefined.

- [ ] **Step 3: Implement `DimensionBand.swift`**

```swift
import Foundation

/// A width/height ratio band ("dimension preset"). Sorted by `minRatio` ascending;
/// the top band uses `.infinity` for `maxRatio`. Ported verbatim from the web's
/// `dimension-band.ts` BUILT_IN_BANDS (DIMENSIONS_VERSION 1).
public struct DimensionBand: Equatable {
    public let id: String       // 'phone' … 'super'
    public let name: String     // 'PHONE' … 'SUPER'
    public let minRatio: Double // inclusive (ratio = width / height)
    public let maxRatio: Double // exclusive; top band uses .infinity

    public init(id: String, name: String, minRatio: Double, maxRatio: Double) {
        self.id = id; self.name = name; self.minRatio = minRatio; self.maxRatio = maxRatio
    }
}

public let builtInBands: [DimensionBand] = [
    DimensionBand(id: "phone", name: "PHONE", minRatio: 0,    maxRatio: 0.62),
    DimensionBand(id: "tall",  name: "TALL",  minRatio: 0.62, maxRatio: 1.05),
    DimensionBand(id: "pad",   name: "PAD",   minRatio: 1.05, maxRatio: 1.45),
    DimensionBand(id: "lap",   name: "LAP",   minRatio: 1.45, maxRatio: 1.7),
    DimensionBand(id: "wide",  name: "WIDE",  minRatio: 1.7,  maxRatio: 1.95),
    DimensionBand(id: "mini",  name: "MINI",  minRatio: 1.95, maxRatio: 2.2),
    DimensionBand(id: "ultra", name: "ULTRA", minRatio: 2.2,  maxRatio: 2.8),
    DimensionBand(id: "super", name: "SUPER", minRatio: 2.8,  maxRatio: .infinity),
]
```

- [ ] **Step 4: Implement `DimensionRegistry.swift`**

```swift
import Foundation

/// Owns the app-wide ratio bands and resolves the active band for a given
/// width/height ratio. Port of `dimension-registry.service.ts` (built-ins only;
/// band editing is out of scope for the iOS v1 port).
public final class DimensionRegistry {
    public var bands: [DimensionBand]

    public init() { self.bands = builtInBands }

    /// The band containing `ratio` (min inclusive, max exclusive); if none
    /// contains it, the band whose range is nearest, matching the web fallback.
    public func resolveForRatio(_ ratio: Double) -> DimensionBand {
        if let hit = bands.first(where: { ratio >= $0.minRatio && ratio < $0.maxRatio }) {
            return hit
        }
        return bands.min(by: { distance($0, ratio) < distance($1, ratio) }) ?? bands[0]
    }

    private func distance(_ b: DimensionBand, _ ratio: Double) -> Double {
        if ratio < b.minRatio { return b.minRatio - ratio }
        if ratio >= b.maxRatio { return ratio - b.maxRatio }
        return 0
    }
}
```

- [ ] **Step 5: Run the test**

Run: `swift test --filter DimensionRegistryTests`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port dimension bands and ratio registry"
```

---

### Task 3: Generic band config store

**Files:**
- Create: `Sources/AllyClockCore/Dimensions/BandConfigStore.swift`
- Test: `Tests/AllyClockCoreTests/BandConfigStoreTests.swift`

Port of `apps/web/src/app/core/dimensions/band-config-store.ts`. Generic per-band config, `Codable`, persisted to `UserDefaults` (replacing `localStorage`+JSON), with the web's version + additive `migrate`/`mergeBand` semantics. `UserDefaults` is injectable for tests.

**Interfaces:**
- Produces:
  - `public struct BandConfigState<T: Codable>: Codable { public var version: Int; public var byBand: [String: T] }`
  - `open class BandConfigStore<T: Codable>` with:
    - `public init(defaults: UserDefaults = .standard)`
    - overridable: `open var storageKey: String`, `open var version: Int`, `open func buildDefaults() -> [String: T]`, `open func mergeBand(default d: T, persisted p: T) -> T` (default returns `p`)
    - `public private(set) var state: BandConfigState<T>`
    - `public func config(_ bandId: String) -> T`
    - `public func patch(_ bandId: String, _ transform: (T) -> T)`
    - `public func patchAll(_ transform: (T) -> T)`

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/BandConfigStoreTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

private struct Fields: Codable, Equatable {
    var scale: Double
    var visible: Bool
    var label: String?   // added in "v2" to exercise field-level migration
}

private final class TestStore: BandConfigStore<Fields> {
    override var storageKey: String { "test.store" }
    override var version: Int { 2 }
    override func buildDefaults() -> [String: Fields] {
        ["phone": Fields(scale: 1, visible: true, label: "def"),
         "super": Fields(scale: 2, visible: true, label: "def")]
    }
    override func mergeBand(default d: Fields, persisted p: Fields) -> Fields {
        Fields(scale: p.scale, visible: p.visible, label: p.label ?? d.label)
    }
}

final class BandConfigStoreTests: XCTestCase {
    private func freshDefaults() -> UserDefaults {
        let d = UserDefaults(suiteName: "band-store-\(UUID().uuidString)")!
        return d
    }

    func test_seedsDefaultsWhenEmpty() {
        let store = TestStore(defaults: freshDefaults())
        XCTAssertEqual(store.config("phone"), Fields(scale: 1, visible: true, label: "def"))
    }

    func test_patchUpdatesOneBandAndPersists() {
        let d = freshDefaults()
        let store = TestStore(defaults: d)
        store.patch("phone") { var f = $0; f.scale = 1.5; return f }
        XCTAssertEqual(store.config("phone").scale, 1.5)
        XCTAssertEqual(TestStore(defaults: d).config("phone").scale, 1.5) // reloads persisted
        XCTAssertEqual(store.config("super").scale, 2) // untouched
    }

    func test_patchAllUpdatesEveryBand() {
        let store = TestStore(defaults: freshDefaults())
        store.patchAll { var f = $0; f.visible = false; return f }
        XCTAssertFalse(store.config("phone").visible)
        XCTAssertFalse(store.config("super").visible)
    }

    func test_migrationFillsMissingFieldsFromDefaults() throws {
        let d = freshDefaults()
        // Persist a v1 state whose band lacks `label` (nil) under a lower version.
        let legacy = BandConfigState(version: 1,
            byBand: ["phone": Fields(scale: 1.25, visible: false, label: nil)])
        d.set(try JSONEncoder().encode(legacy), forKey: "test.store")
        let store = TestStore(defaults: d)
        let phone = store.config("phone")
        XCTAssertEqual(phone.scale, 1.25)      // persisted tuning kept
        XCTAssertFalse(phone.visible)          // persisted tuning kept
        XCTAssertEqual(phone.label, "def")     // new field filled via mergeBand
        XCTAssertNotNil(store.config("super")) // default band added
    }
}
```

- [ ] **Step 2: Run the test**

Run: `swift test --filter BandConfigStoreTests`
Expected: FAIL — `BandConfigStore` undefined.

- [ ] **Step 3: Implement `BandConfigStore.swift`**

```swift
import Foundation

public struct BandConfigState<T: Codable>: Codable {
    public var version: Int
    public var byBand: [String: T]
    public init(version: Int, byBand: [String: T]) { self.version = version; self.byBand = byBand }
}

/// Generic per-face config keyed by `DimensionBand.id`. Subclasses supply the
/// storage key, version, and per-band defaults; persistence and immutable
/// updates are shared. Port of `band-config-store.ts`. Persists to UserDefaults
/// as JSON. Overridable hooks are pure (no subclass stored state), so calling
/// them from `init` is safe.
open class BandConfigStore<T: Codable> {
    private let defaults: UserDefaults
    public private(set) var state: BandConfigState<T>

    open var storageKey: String { fatalError("subclass must override storageKey") }
    open var version: Int { fatalError("subclass must override version") }
    open func buildDefaults() -> [String: T] { fatalError("subclass must override buildDefaults") }

    /// Combine one band's default with its persisted value. Default: take the
    /// persisted value wholesale. Override for field-level migration.
    open func mergeBand(default d: T, persisted p: T) -> T { p }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.state = BandConfigState(version: 0, byBand: [:])
        self.state = load()
    }

    /// Current fields for a band id, never nil: falls back to a fresh default,
    /// then to any present band.
    public func config(_ bandId: String) -> T {
        state.byBand[bandId] ?? buildDefaults()[bandId] ?? state.byBand.values.first!
    }

    public func patch(_ bandId: String, _ transform: (T) -> T) {
        var byBand = state.byBand
        byBand[bandId] = transform(config(bandId))
        commit(BandConfigState(version: state.version, byBand: byBand))
    }

    public func patchAll(_ transform: (T) -> T) {
        var byBand: [String: T] = [:]
        for (id, fields) in state.byBand { byBand[id] = transform(fields) }
        commit(BandConfigState(version: state.version, byBand: byBand))
    }

    // MARK: - Persistence

    private func load() -> BandConfigState<T> {
        if let data = defaults.data(forKey: storageKey),
           let parsed = try? JSONDecoder().decode(BandConfigState<T>.self, from: data),
           !parsed.byBand.isEmpty {
            return migrate(parsed)
        }
        let seeded = BandConfigState(version: version, byBand: buildDefaults())
        persist(seeded)
        return seeded
    }

    /// Additive: every default band id is present; a persisted band is combined
    /// with its default via `mergeBand`. Persisted-only ids are carried untouched.
    private func migrate(_ persisted: BandConfigState<T>) -> BandConfigState<T> {
        let defs = buildDefaults()
        var byBand: [String: T] = [:]
        for id in defs.keys {
            if let p = persisted.byBand[id] { byBand[id] = mergeBand(default: defs[id]!, persisted: p) }
            else { byBand[id] = defs[id]! }
        }
        for (id, p) in persisted.byBand where byBand[id] == nil { byBand[id] = p }
        let migrated = BandConfigState(version: version, byBand: byBand)
        if persisted.version != version || byBand.count != persisted.byBand.count { persist(migrated) }
        return migrated
    }

    private func commit(_ next: BandConfigState<T>) { state = next; persist(next) }

    private func persist(_ state: BandConfigState<T>) {
        if let data = try? JSONEncoder().encode(state) { defaults.set(data, forKey: storageKey) }
    }
}
```

- [ ] **Step 4: Run the test**

Run: `swift test --filter BandConfigStoreTests`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port generic band config store to UserDefaults"
```

---

### Task 4: Time formatting

**Files:**
- Create: `Sources/AllyClockCore/Clock/TimeFormatting.swift`
- Test: `Tests/AllyClockCoreTests/TimeFormattingTests.swift`

Port of `apps/web/src/app/features/faces/fullscreen/clock-formatter.ts`. The web uses `Intl.DateTimeFormat`; Swift uses `DateFormatter`/`Calendar`. The web's `zoneOffsetMinutes` (from `zone-catalog.ts`) is replaced by native `TimeZone.secondsFromGMT(for:) / 60`. `zoneCity` operates on the IANA id string.

**Interfaces:**
- Produces `public enum TimeFormatting` with:
  - `public struct BigTime: Equatable { public let digits, seconds: String; public let ampm: String? }`
  - `public struct DateParts: Equatable { public let weekday, month, day, gmt: String }`
  - `static func bigTime(_ date: Date, locale: Locale, timeZone: TimeZone) -> BigTime`
  - `static func dateParts(_ date: Date, locale: Locale, timeZone: TimeZone) -> DateParts`
  - `static func compactOffset(_ date: Date, timeZone: TimeZone) -> String`
  - `static func zoneCity(_ ianaId: String, abbreviate: Bool) -> String`

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/TimeFormattingTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class TimeFormattingTests: XCTestCase {
    // 2026-01-15 09:05:07 UTC
    private let date = Date(timeIntervalSince1970: 1_768_468_907)
    private let enUS = Locale(identifier: "en_US")

    func test_bigTime_splitsDigitsAmpmSeconds_inZone() {
        let la = TimeZone(identifier: "America/Los_Angeles")!  // UTC-8 in January
        let t = TimeFormatting.bigTime(date, locale: enUS, timeZone: la)
        XCTAssertEqual(t.digits, "1:05")
        XCTAssertEqual(t.ampm, "AM")
        XCTAssertEqual(t.seconds, "07")
    }

    func test_bigTime_24hLocaleHasNoAmpm() {
        // de_DE is reliably 24-hour across ICU versions ("18:05", no AM/PM).
        let seoul = TimeZone(identifier: "Asia/Seoul")!       // UTC+9
        let t = TimeFormatting.bigTime(date, locale: Locale(identifier: "de_DE"), timeZone: seoul)
        XCTAssertNil(t.ampm)
        XCTAssertEqual(t.digits, "18:05")
        XCTAssertEqual(t.seconds, "07")
    }

    func test_dateParts_weekdayMonthDayAndCompactOffset() {
        let seoul = TimeZone(identifier: "Asia/Seoul")!
        let p = TimeFormatting.dateParts(date, locale: enUS, timeZone: seoul)
        XCTAssertEqual(p.weekday, "Thu")   // 2026-01-15 18:05 KST is a Thursday
        XCTAssertEqual(p.month, "Jan")
        XCTAssertEqual(p.day, "15")
        XCTAssertEqual(p.gmt, "+9")
    }

    func test_compactOffset_wholeAndHalfHours_useMinusSign() {
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "UTC")!), "+0")
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "America/Los_Angeles")!), "\u{2212}8")
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "Asia/Kolkata")!), "+5:30")
    }

    func test_zoneCity_fullAndAbbreviated() {
        XCTAssertEqual(TimeFormatting.zoneCity("America/Los_Angeles", abbreviate: false), "LOS ANGELES")
        XCTAssertEqual(TimeFormatting.zoneCity("America/Los_Angeles", abbreviate: true), "LA")
        XCTAssertEqual(TimeFormatting.zoneCity("Europe/London", abbreviate: true), "LON")
        XCTAssertEqual(TimeFormatting.zoneCity("UTC", abbreviate: true), "UTC")
        XCTAssertEqual(TimeFormatting.zoneCity("+05:30", abbreviate: false), "")
    }
}
```

- [ ] **Step 2: Run the test**

Run: `swift test --filter TimeFormattingTests`
Expected: FAIL — `TimeFormatting` undefined.

- [ ] **Step 3: Implement `TimeFormatting.swift`**

```swift
import Foundation

/// Timezone- and locale-aware formatting. Port of `clock-formatter.ts`
/// (`Intl.DateTimeFormat` → `DateFormatter`/`Calendar`). Native
/// `TimeZone.secondsFromGMT(for:)` replaces the web's zone-offset catalog.
public enum TimeFormatting {
    public struct BigTime: Equatable {
        public let digits: String     // "1:05"
        public let seconds: String    // "07"
        public let ampm: String?      // "AM"/"PM", nil for 24h locales
    }

    public struct DateParts: Equatable {
        public let weekday: String    // "Thu"
        public let month: String      // "Jan"
        public let day: String        // "15"
        public let gmt: String        // "+9", "\u{2212}8", "+5:30"
    }

    private static func formatter(_ locale: Locale, _ tz: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = tz
        return f
    }

    public static func bigTime(_ date: Date, locale: Locale, timeZone: TimeZone) -> BigTime {
        let f = formatter(locale, timeZone)
        // Hour + minute in the locale's convention (12h or 24h) with no seconds.
        f.setLocalizedDateFormatFromTemplate("jmm")
        let hm = f.string(from: date)

        let uses24h = (DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: locale) ?? "")
            .contains("H")

        // Split trailing AM/PM (if any) from the digits.
        var digits = hm
        var ampm: String? = nil
        if !uses24h {
            let symbols = [f.amSymbol ?? "AM", f.pmSymbol ?? "PM"]
            for s in symbols where hm.contains(s) {
                ampm = s
                digits = hm.replacingOccurrences(of: s, with: "")
            }
            digits = digits.trimmingCharacters(in: .whitespaces)
        }

        let sf = formatter(Locale(identifier: "en_US_POSIX"), timeZone)
        sf.dateFormat = "ss"
        return BigTime(digits: digits, seconds: sf.string(from: date), ampm: ampm)
    }

    public static func dateParts(_ date: Date, locale: Locale, timeZone: TimeZone) -> DateParts {
        let wf = formatter(locale, timeZone); wf.setLocalizedDateFormatFromTemplate("EEE")
        let mf = formatter(locale, timeZone); mf.setLocalizedDateFormatFromTemplate("MMM")
        let df = formatter(locale, timeZone); df.setLocalizedDateFormatFromTemplate("d")
        return DateParts(weekday: wf.string(from: date),
                         month: mf.string(from: date),
                         day: df.string(from: date),
                         gmt: compactOffset(date, timeZone: timeZone))
    }

    /// Sign + hours, with ":mm" only when the zone is off a whole hour.
    /// Uses U+2212 MINUS for negatives, matching the app.
    public static func compactOffset(_ date: Date, timeZone: TimeZone) -> String {
        let minutes = timeZone.secondsFromGMT(for: date) / 60
        let sign = minutes < 0 ? "\u{2212}" : "+"
        let abs = Swift.abs(minutes)
        let h = abs / 60, m = abs % 60
        return m == 0 ? "\(sign)\(h)" : "\(sign)\(h):\(String(format: "%02d", m))"
    }

    /// City label from an IANA id: last path segment, underscores spaced,
    /// uppercased. `abbreviate` collapses multi-word to initials, single word to
    /// first three letters. Fixed-offset ids ("+05:30") have no city.
    public static func zoneCity(_ ianaId: String, abbreviate: Bool) -> String {
        if ianaId.range(of: "^[+\u{2212}-]\\d", options: .regularExpression) != nil { return "" }
        let city = (ianaId.split(separator: "/").last.map(String.init) ?? ianaId)
            .replacingOccurrences(of: "_", with: " ")
        if !abbreviate { return city.uppercased() }
        let words = city.split(whereSeparator: { $0 == " " || $0 == "-" }).map(String.init)
        let label = words.count > 1 ? words.map { String($0.prefix(1)) }.joined()
                                    : String(city.prefix(3))
        return label.uppercased()
    }
}
```

- [ ] **Step 4: Run the test**

Run: `swift test --filter TimeFormattingTests`
Expected: PASS (5 tests). If a locale-symbol assertion differs on the CI toolchain's ICU, adjust the expected string to the value the toolchain's `DateFormatter` produces for that fixed date — do not change the date.

- [ ] **Step 5: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port timezone/locale time formatting"
```

---

### Task 5: Zone→country table + flag emoji

**Files:**
- Create: `Sources/AllyClockCore/Zones/ZoneCountry.swift`
- Test: `Tests/AllyClockCoreTests/ZoneCountryTests.swift`

Port of `apps/web/src/app/core/zone-country.ts` (418 entries, auto-generated from IANA `zone.tab`). The country code becomes a regional-indicator emoji flag.

**Interfaces:**
- Produces `public enum ZoneCountry` with:
  - `public static let table: [String: String]` (IANA id → lowercase ISO-3166 alpha-2)
  - `public static func country(for zone: String) -> String?`
  - `public static func flagEmoji(for zone: String) -> String?` (nil when no country)

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/ZoneCountryTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class ZoneCountryTests: XCTestCase {
    func test_tableHasAllEntries() {
        XCTAssertEqual(ZoneCountry.table.count, 418)
    }

    func test_knownZonesMapToCountry() {
        XCTAssertEqual(ZoneCountry.country(for: "America/Los_Angeles"), "us")
        XCTAssertEqual(ZoneCountry.country(for: "Asia/Seoul"), "kr")
        XCTAssertEqual(ZoneCountry.country(for: "Europe/London"), "gb")
    }

    func test_unknownAndFixedOffsetHaveNoCountry() {
        XCTAssertNil(ZoneCountry.country(for: "UTC"))
        XCTAssertNil(ZoneCountry.country(for: "+05:30"))
    }

    func test_flagEmojiFromCountryCode() {
        XCTAssertEqual(ZoneCountry.flagEmoji(for: "America/Los_Angeles"), "\u{1F1FA}\u{1F1F8}") // 🇺🇸
        XCTAssertEqual(ZoneCountry.flagEmoji(for: "Asia/Seoul"), "\u{1F1F0}\u{1F1F7}")           // 🇰🇷
        XCTAssertNil(ZoneCountry.flagEmoji(for: "UTC"))
    }
}
```

- [ ] **Step 2: Run the test**

Run: `swift test --filter ZoneCountryTests`
Expected: FAIL — `ZoneCountry` undefined.

- [ ] **Step 3: Implement `ZoneCountry.swift`**

Port the table verbatim. The web file `apps/web/src/app/core/zone-country.ts` holds 418 lines of the form `'America/Los_Angeles': 'us',`. Transform each into a Swift dictionary literal entry `"America/Los_Angeles": "us",` — same keys, same lowercase values, same order. Do not add, drop, or re-case any entry. Generate the body with:

```bash
# From repo root — emits the Swift dictionary body to paste between the braces.
grep -E "^  '" apps/web/src/app/core/zone-country.ts \
  | sed -E "s/^  '([^']+)': '([^']+)',?/    \"\1\": \"\2\",/"
```

Then wrap it:

```swift
import Foundation

/// IANA time-zone id → primary ISO 3166-1 alpha-2 country code (lowercase).
/// Ported verbatim from the web's `zone-country.ts` (auto-generated from
/// `/usr/share/zoneinfo/zone.tab`; regenerate both when tzdata updates).
public enum ZoneCountry {
    public static let table: [String: String] = [
        // <<< paste the 418 generated entries here >>>
    ]

    public static func country(for zone: String) -> String? { table[zone] }

    /// Regional-indicator emoji flag for the zone's country, or nil.
    public static func flagEmoji(for zone: String) -> String? {
        guard let code = table[zone], code.count == 2 else { return nil }
        let base: UInt32 = 0x1F1E6  // 🇦, offset from 'a'
        var scalars = String.UnicodeScalarView()
        for ch in code.lowercased().unicodeScalars {
            guard ch.value >= 97, ch.value <= 122,
                  let s = Unicode.Scalar(base + (ch.value - 97)) else { return nil }
            scalars.append(s)
        }
        return String(scalars)
    }
}
```

- [ ] **Step 4: Run the test**

Run: `swift test --filter ZoneCountryTests`
Expected: PASS (4 tests). If `test_tableHasAllEntries` fails, re-run the `grep|sed` and confirm the pasted count is exactly 418.

- [ ] **Step 5: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port IANA zone→country table and flag emoji"
```

---

### Task 6: Fullscreen fields, presets, store, and sizing

**Files:**
- Create: `Sources/AllyClockCore/Faces/Fullscreen/FullscreenFields.swift`
- Create: `Sources/AllyClockCore/Faces/Fullscreen/FullscreenPresets.swift`
- Create: `Sources/AllyClockCore/Faces/Fullscreen/FullscreenConfigStore.swift`
- Test: `Tests/AllyClockCoreTests/FullscreenConfigStoreTests.swift`
- Test: `Tests/AllyClockCoreTests/FullscreenSizingTests.swift`

Port of `fullscreen-preset.ts`, `fullscreen-presets.data.ts`, `fullscreen-config-store.service.ts`, and the `base()` math from `fullscreen-style.ts`. The web keys `sections` by name — modeled here as an explicit struct for `Codable` ergonomics.

**Interfaces:**
- Consumes: `BandConfigStore<T>`, `DimensionRegistry`.
- Produces:
  - `public enum BarMode: String, Codable { case off, divider, progress }`
  - `public struct SectionStyle: Codable, Equatable { var visible: Bool; var sizeScale: Double; var weight: Int; var opacity: Double }`
  - `public struct BarStyle: Codable, Equatable { var mode: BarMode; var sizeScale: Double; var opacity: Double }`
  - `public struct SectionBase: Codable, Equatable { var cqw: Double; var cqh: Double; var minCqh: Double? }`
  - `public struct FullscreenSections/Bases/Gaps` and `public struct FullscreenFields: Codable, Equatable { ... }`
  - `public func fullscreenFontSize(_ base: SectionBase, sizeScale: Double, width: Double, height: Double) -> Double`
  - `public final class FullscreenConfigStore: BandConfigStore<FullscreenFields>` with `init(registry:defaults:)`, `func fieldsFor(_ ratio: Double) -> FullscreenFields`, `func sample() -> FullscreenFields`, and the `setSecondsVisibleAll/setZoneVisibleAll/setFlagVisibleAll/setBarModeAll/setTimeZoneAll/updateSection/updateBar/updateGap` mutators.

- [ ] **Step 1: Write the failing sizing test**

`Tests/AllyClockCoreTests/FullscreenSizingTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class FullscreenSizingTests: XCTestCase {
    func test_blendTakesTheSmallerOfWidthAndHeightBound() {
        // cqw=120 → 1.2*W, cqh=68 → 0.68*H. For 800x600: min(960, 408)=408.
        let b = SectionBase(cqw: 120, cqh: 68, minCqh: nil)
        XCTAssertEqual(fullscreenFontSize(b, sizeScale: 1, width: 800, height: 600), 408, accuracy: 0.001)
    }

    func test_minCqhFloorWinsWhenBlendIsSmaller() {
        // Phone time: cqw=24, cqh=200, minCqh=7.44. For 300x900:
        // blend = min(0.24*300=72, 2.0*900=1800)=72; floor=0.0744*900=66.96; max=72.
        let b = SectionBase(cqw: 24, cqh: 200, minCqh: 7.44)
        XCTAssertEqual(fullscreenFontSize(b, sizeScale: 1, width: 300, height: 900), 72, accuracy: 0.001)
        // Very narrow: 120x900 → blend=min(28.8,1800)=28.8; floor=66.96 wins.
        XCTAssertEqual(fullscreenFontSize(b, sizeScale: 1, width: 120, height: 900), 66.96, accuracy: 0.001)
    }

    func test_sizeScaleMultipliesResult() {
        let b = SectionBase(cqw: 100, cqh: 100, minCqh: nil)
        XCTAssertEqual(fullscreenFontSize(b, sizeScale: 1.5, width: 400, height: 400), 600, accuracy: 0.001)
    }
}
```

- [ ] **Step 2: Write the failing store test**

`Tests/AllyClockCoreTests/FullscreenConfigStoreTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class FullscreenConfigStoreTests: XCTestCase {
    private func store() -> FullscreenConfigStore {
        FullscreenConfigStore(registry: DimensionRegistry(),
                              defaults: UserDefaults(suiteName: "fs-\(UUID().uuidString)")!)
    }

    func test_defaultsPerBand_phoneUsesPhoneBaseAndProgressBar() {
        let s = store()
        let phone = s.config("phone")
        XCTAssertEqual(phone.bases.time.cqw, 24)
        XCTAssertEqual(phone.bases.time.minCqh, 7.44)
        XCTAssertEqual(phone.bar.mode, .progress)
        XCTAssertTrue(phone.secondsVisible)
        XCTAssertFalse(phone.flagVisible)
    }

    func test_fieldsForRatioResolvesThroughRegistry() {
        let s = store()
        XCTAssertEqual(s.fieldsFor(0.46).bases.time.cqw, 24)   // phone
        XCTAssertEqual(s.fieldsFor(1.8).bases.time.cqw, 120)   // wide → LANDSCAPE
    }

    func test_toggleAllBroadcastsToEveryBand() {
        let s = store()
        s.setFlagVisibleAll(true)
        XCTAssertTrue(s.config("phone").flagVisible)
        XCTAssertTrue(s.config("super").flagVisible)
    }

    func test_updateSectionIsPerBand() {
        let s = store()
        s.updateSection("phone", .time) { var st = $0; st.sizeScale = 1.4; return st }
        XCTAssertEqual(s.config("phone").sections.time.sizeScale, 1.4)
        XCTAssertEqual(s.config("super").sections.time.sizeScale, 1.0)
    }
}
```

- [ ] **Step 3: Run both to verify RED**

Run: `swift test --filter Fullscreen`
Expected: FAIL — types undefined.

- [ ] **Step 4: Implement `FullscreenFields.swift`**

```swift
import Foundation

public enum BarMode: String, Codable { case off, divider, progress }

public struct SectionStyle: Codable, Equatable {
    public var visible: Bool
    public var sizeScale: Double   // 0.5–2.0
    public var weight: Int         // 100–700
    public var opacity: Double     // 0.2–1.0
    public init(visible: Bool, sizeScale: Double, weight: Int, opacity: Double) {
        self.visible = visible; self.sizeScale = sizeScale; self.weight = weight; self.opacity = opacity
    }
}

public struct BarStyle: Codable, Equatable {
    public var mode: BarMode
    public var sizeScale: Double
    public var opacity: Double
    public init(mode: BarMode, sizeScale: Double, opacity: Double) {
        self.mode = mode; self.sizeScale = sizeScale; self.opacity = opacity
    }
}

/// Sizing base in container-query units (percent of container W/H). Blend =
/// min(cqw%·W, cqh%·H), floored to minCqh%·H when present.
public struct SectionBase: Codable, Equatable {
    public var cqw: Double
    public var cqh: Double
    public var minCqh: Double?
    public init(cqw: Double, cqh: Double, minCqh: Double? = nil) {
        self.cqw = cqw; self.cqh = cqh; self.minCqh = minCqh
    }
}

public enum SectionKey: CaseIterable { case time, weekday, month, day, gmt }

public struct FullscreenSections: Codable, Equatable {
    public var time, weekday, month, day, gmt: SectionStyle
}
public struct FullscreenBases: Codable, Equatable {
    public var time, date, bar: SectionBase
}
public struct FullscreenGaps: Codable, Equatable {
    public var timeToBar, barToDate, betweenDateParts: Double
}

public struct FullscreenFields: Codable, Equatable {
    public var bar: BarStyle
    public var secondsVisible: Bool
    public var zoneVisible: Bool
    public var flagVisible: Bool
    public var timeZone: String        // "" = follow the global clock zone
    public var sections: FullscreenSections
    public var bases: FullscreenBases
    public var gaps: FullscreenGaps
}

/// blend = min(cqw%·W, cqh%·H); floor to minCqh%·H when set; × sizeScale.
/// Port of `base()` in `fullscreen-style.ts`.
public func fullscreenFontSize(_ base: SectionBase, sizeScale: Double,
                               width: Double, height: Double) -> Double {
    var value = min(base.cqw / 100 * width, base.cqh / 100 * height)
    if let m = base.minCqh { value = max(value, m / 100 * height) }
    return value * sizeScale
}
```

- [ ] **Step 5: Implement `FullscreenPresets.swift`**

Values copied verbatim from `fullscreen-presets.data.ts`.

```swift
import Foundation

enum FullscreenPresets {
    private static func timeStyle() -> SectionStyle { .init(visible: true, sizeScale: 1, weight: 200, opacity: 1) }
    private static func dateStyle() -> SectionStyle { .init(visible: true, sizeScale: 1, weight: 300, opacity: 0.6) }

    private static let landscape = FullscreenBases(
        time: .init(cqw: 120, cqh: 68),
        date: .init(cqw: 8, cqh: 5),
        bar: .init(cqw: 120, cqh: 56))
    private static let nearSquare = FullscreenBases(
        time: .init(cqw: 38, cqh: 64),
        date: .init(cqw: 3.4, cqh: 4),
        bar: .init(cqw: 58, cqh: 62))
    private static let phone = FullscreenBases(
        time: .init(cqw: 24, cqh: 200, minCqh: 7.44),
        date: .init(cqw: 3.4, cqh: 200, minCqh: 1.054),
        bar: .init(cqw: 60, cqh: 200, minCqh: 18.6))

    private static func fields(_ bases: FullscreenBases) -> FullscreenFields {
        FullscreenFields(
            bar: .init(mode: .progress, sizeScale: 1, opacity: 0.34),
            secondsVisible: true, zoneVisible: false, flagVisible: false, timeZone: "",
            sections: .init(time: timeStyle(), weekday: dateStyle(), month: dateStyle(),
                            day: dateStyle(), gmt: dateStyle()),
            bases: bases,
            gaps: .init(timeToBar: 1, barToDate: 1, betweenDateParts: 1))
    }

    static func buildDefaults() -> [String: FullscreenFields] {
        ["phone": fields(phone), "tall": fields(nearSquare), "pad": fields(nearSquare),
         "lap": fields(landscape), "wide": fields(landscape), "mini": fields(landscape),
         "ultra": fields(landscape), "super": fields(landscape)]
    }
}
```

- [ ] **Step 6: Implement `FullscreenConfigStore.swift`**

```swift
import Foundation

/// Per-band Fullscreen config. Port of `fullscreen-config-store.service.ts`
/// (version 5). `timeZone` "" follows the global clock. Toggles broadcast to
/// every band; sizes/sections/gaps are per-band.
public final class FullscreenConfigStore: BandConfigStore<FullscreenFields> {
    private let registry: DimensionRegistry

    public init(registry: DimensionRegistry, defaults: UserDefaults = .standard) {
        self.registry = registry
        super.init(defaults: defaults)
    }

    public override var storageKey: String { "allyclock.fullscreen.config" }
    public override var version: Int { 5 }
    public override func buildDefaults() -> [String: FullscreenFields] { FullscreenPresets.buildDefaults() }

    public func fieldsFor(_ ratio: Double) -> FullscreenFields { config(registry.resolveForRatio(ratio).id) }
    public func sample() -> FullscreenFields { state.byBand.values.first ?? buildDefaults()["phone"]! }

    public func updateSection(_ bandId: String, _ key: SectionKey, _ f: (SectionStyle) -> SectionStyle) {
        patch(bandId) { var fields = $0; apply(&fields.sections, key, f); return fields }
    }
    public func updateBar(_ bandId: String, _ f: (BarStyle) -> BarStyle) {
        patch(bandId) { var fields = $0; fields.bar = f(fields.bar); return fields }
    }
    public func updateGap(_ bandId: String, _ set: (inout FullscreenGaps) -> Void) {
        patch(bandId) { var fields = $0; set(&fields.gaps); return fields }
    }

    public func setSecondsVisibleAll(_ v: Bool) { patchAll { var f = $0; f.secondsVisible = v; return f } }
    public func setZoneVisibleAll(_ v: Bool)    { patchAll { var f = $0; f.zoneVisible = v; return f } }
    public func setFlagVisibleAll(_ v: Bool)    { patchAll { var f = $0; f.flagVisible = v; return f } }
    public func setBarModeAll(_ m: BarMode)     { patchAll { var f = $0; f.bar.mode = m; return f } }
    public func setTimeZoneAll(_ tz: String)    { patchAll { var f = $0; f.timeZone = tz; return f } }
    public func setSectionVisibleAll(_ key: SectionKey, _ v: Bool) {
        patchAll { var f = $0; apply(&f.sections, key) { var s = $0; s.visible = v; return s }; return f }
    }

    private func apply(_ s: inout FullscreenSections, _ key: SectionKey, _ f: (SectionStyle) -> SectionStyle) {
        switch key {
        case .time: s.time = f(s.time)
        case .weekday: s.weekday = f(s.weekday)
        case .month: s.month = f(s.month)
        case .day: s.day = f(s.day)
        case .gmt: s.gmt = f(s.gmt)
        }
    }
}
```

- [ ] **Step 7: Run the Fullscreen tests**

Run: `swift test --filter Fullscreen`
Expected: PASS (sizing 3 + store 4).

- [ ] **Step 8: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port Fullscreen fields, presets, store, and sizing"
```

---

### Task 7: World Cards fields, presets, and store

**Files:**
- Create: `Sources/AllyClockCore/Faces/WorldCards/WorldCardsFields.swift`
- Create: `Sources/AllyClockCore/Faces/WorldCards/WorldCardsPresets.swift`
- Create: `Sources/AllyClockCore/Faces/WorldCards/WorldCardsConfigStore.swift`
- Test: `Tests/AllyClockCoreTests/WorldCardsConfigStoreTests.swift`

Port of `world-cards-config.ts`, `world-cards-presets.data.ts`, `world-cards-config-store.service.ts` (version 1). `cards` is a global list broadcast to every band; `sizes` is per-band.

**Interfaces:**
- Consumes: `BandConfigStore<T>`, `DimensionRegistry`.
- Produces:
  - `public struct WorldCardConfig: Codable, Equatable { public var id: Int; public var zone: String; public var lineBreak: Bool }`
  - `public struct WorldCardSizes: Codable, Equatable { public var time: Double; public var date: Double }`
  - `public struct WorldCardsFields: Codable, Equatable { public var cards: [WorldCardConfig]; public var sizes: WorldCardSizes }`
  - `public let MIN_CARDS = 1`, `public let MAX_CARDS = 12`
  - `public final class WorldCardsConfigStore: BandConfigStore<WorldCardsFields>` with `init(registry:defaults:)`, `fieldsFor`, `sample`, `addCard(zone:)`, `removeCard(id:)`, `setCardZone(id:zone:)`, `setCardLineBreak(id:_:)`, `setSize(_:key:value:)` where `key: WritableKeyPath<WorldCardSizes, Double>`.

- [ ] **Step 1: Write the failing test**

`Tests/AllyClockCoreTests/WorldCardsConfigStoreTests.swift`:

```swift
import XCTest
@testable import AllyClockCore

final class WorldCardsConfigStoreTests: XCTestCase {
    private func store() -> WorldCardsConfigStore {
        WorldCardsConfigStore(registry: DimensionRegistry(),
                              defaults: UserDefaults(suiteName: "wc-\(UUID().uuidString)")!)
    }

    func test_defaultCards_LA_UTC_Seoul_withLineBreakAfterLA() {
        let cards = store().sample().cards
        XCTAssertEqual(cards.map(\.zone), ["America/Los_Angeles", "UTC", "Asia/Seoul"])
        XCTAssertTrue(cards[0].lineBreak)
        XCTAssertFalse(cards[1].lineBreak)
    }

    func test_addCardBroadcastsAndAssignsNextId() {
        let s = store()
        s.addCard(zone: "Europe/Paris")
        XCTAssertEqual(s.sample().cards.count, 4)
        XCTAssertEqual(s.sample().cards.last?.zone, "Europe/Paris")
        XCTAssertEqual(s.sample().cards.last?.id, 4)   // max(1,2,3)+1
        XCTAssertEqual(s.config("super").cards.count, 4) // broadcast
    }

    func test_removeCardRespectsMinCards() {
        let s = store()
        s.removeCard(id: 2); s.removeCard(id: 3)
        XCTAssertEqual(s.sample().cards.map(\.id), [1])
        s.removeCard(id: 1)                 // at MIN_CARDS → no-op
        XCTAssertEqual(s.sample().cards.count, 1)
    }

    func test_addCardStopsAtMaxCards() {
        let s = store()
        for i in 0..<20 { s.addCard(zone: "Etc/GMT+\(i % 12)") }
        XCTAssertEqual(s.sample().cards.count, MAX_CARDS)
    }

    func test_setSizeIsPerBand() {
        let s = store()
        s.setSize("phone", key: \.time, value: 1.3)
        XCTAssertEqual(s.config("phone").sizes.time, 1.3)
        XCTAssertEqual(s.config("super").sizes.time, 1.0)
    }
}
```

- [ ] **Step 2: Run the test**

Run: `swift test --filter WorldCardsConfigStoreTests`
Expected: FAIL — types undefined.

- [ ] **Step 3: Implement `WorldCardsFields.swift`**

```swift
import Foundation

public struct WorldCardConfig: Codable, Equatable {
    public var id: Int
    public var zone: String       // IANA id
    public var lineBreak: Bool    // true ends this card's row
    public init(id: Int, zone: String, lineBreak: Bool) {
        self.id = id; self.zone = zone; self.lineBreak = lineBreak
    }
}

public struct WorldCardSizes: Codable, Equatable {
    public var time: Double       // 0.5–2.0
    public var date: Double       // 0.5–2.0
    public init(time: Double, date: Double) { self.time = time; self.date = date }
}

public struct WorldCardsFields: Codable, Equatable {
    public var cards: [WorldCardConfig]   // global (broadcast to every band)
    public var sizes: WorldCardSizes      // per-band
    public init(cards: [WorldCardConfig], sizes: WorldCardSizes) {
        self.cards = cards; self.sizes = sizes
    }
}

public let MIN_CARDS = 1
public let MAX_CARDS = 12
```

- [ ] **Step 4: Implement `WorldCardsPresets.swift`**

```swift
import Foundation

enum WorldCardsPresets {
    // LA ends its row; UTC + Seoul share the second row.
    private static let defaultCards: [WorldCardConfig] = [
        .init(id: 1, zone: "America/Los_Angeles", lineBreak: true),
        .init(id: 2, zone: "UTC", lineBreak: false),
        .init(id: 3, zone: "Asia/Seoul", lineBreak: false),
    ]

    private static func fields() -> WorldCardsFields {
        WorldCardsFields(cards: defaultCards, sizes: .init(time: 1, date: 1))
    }

    static func buildDefaults() -> [String: WorldCardsFields] {
        var byBand: [String: WorldCardsFields] = [:]
        for band in builtInBands { byBand[band.id] = fields() }
        return byBand
    }
}
```

- [ ] **Step 5: Implement `WorldCardsConfigStore.swift`**

```swift
import Foundation

/// Per-band World Cards config (version 1). `cards` is broadcast to every band;
/// `sizes` is per-band. Port of `world-cards-config-store.service.ts`.
public final class WorldCardsConfigStore: BandConfigStore<WorldCardsFields> {
    private let registry: DimensionRegistry

    public init(registry: DimensionRegistry, defaults: UserDefaults = .standard) {
        self.registry = registry
        super.init(defaults: defaults)
    }

    public override var storageKey: String { "allyclock.world-cards.config" }
    public override var version: Int { 1 }
    public override func buildDefaults() -> [String: WorldCardsFields] { WorldCardsPresets.buildDefaults() }

    public func fieldsFor(_ ratio: Double) -> WorldCardsFields { config(registry.resolveForRatio(ratio).id) }
    public func sample() -> WorldCardsFields { state.byBand.values.first ?? buildDefaults()["phone"]! }

    private func nextId() -> Int { (sample().cards.map(\.id).max() ?? 0) + 1 }

    public func addCard(zone: String) {
        guard sample().cards.count < MAX_CARDS else { return }
        let card = WorldCardConfig(id: nextId(), zone: zone, lineBreak: false)
        patchAll { var f = $0; f.cards.append(card); return f }
    }

    public func removeCard(id: Int) {
        guard sample().cards.count > MIN_CARDS else { return }
        patchAll { var f = $0; f.cards.removeAll { $0.id == id }; return f }
    }

    public func setCardZone(id: Int, zone: String) {
        patchAll { var f = $0; f.cards = f.cards.map { $0.id == id ? withZone($0, zone) : $0 }; return f }
    }

    public func setCardLineBreak(id: Int, _ lineBreak: Bool) {
        patchAll { var f = $0; f.cards = f.cards.map { $0.id == id ? withLineBreak($0, lineBreak) : $0 }; return f }
    }

    public func setSize(_ bandId: String, key: WritableKeyPath<WorldCardSizes, Double>, value: Double) {
        patch(bandId) { var f = $0; f.sizes[keyPath: key] = value; return f }
    }

    private func withZone(_ c: WorldCardConfig, _ z: String) -> WorldCardConfig {
        WorldCardConfig(id: c.id, zone: z, lineBreak: c.lineBreak)
    }
    private func withLineBreak(_ c: WorldCardConfig, _ b: Bool) -> WorldCardConfig {
        WorldCardConfig(id: c.id, zone: c.zone, lineBreak: b)
    }
}
```

- [ ] **Step 6: Run the test**

Run: `swift test --filter WorldCardsConfigStoreTests`
Expected: PASS (5 tests).

- [ ] **Step 7: Run the full suite**

Run: `swift test`
Expected: all tests across all files PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/AllyClockCore
git commit -m "feat(core): port World Cards fields, presets, and store"
```

---

## Self-Review notes (author)

- **Spec coverage:** DimensionRegistry (Task 2), BandConfigStore + UserDefaults + migration (Task 3), TimeFormatting incl. compactOffset via native offset API (Task 4), ZoneCountry + emoji flags (Task 5), Fullscreen model/presets/store/sizing (Task 6), World Cards model/presets/store (Task 7). ClockTicker is intentionally NOT in the core — the ~30fps tick is the view layer's `TimelineView` (Plan 2); the core is pure formatting, per the spec.
- **Deferred to Plan 2 (iOS UI):** all SwiftUI views, sheets, picker, SFIcon, the Xcode-project wiring that links this package into the app, and the ~30fps `TimelineView` tick.
- **Type consistency:** `fieldsFor(_:)`, `sample()`, `config(_:)`, `SectionKey`, `SectionBase`, `FullscreenFields`, `WorldCardsFields`, `MIN_CARDS`/`MAX_CARDS` are named identically across tasks and tests.
- **Values verbatim:** bands, fullscreen bases (LANDSCAPE/NEAR_SQUARE/PHONE), default cards, and store versions (Fullscreen 5, World Cards 1) match the web source cited per task.
```
