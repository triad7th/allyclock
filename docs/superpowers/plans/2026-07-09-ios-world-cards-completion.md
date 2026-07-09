# iOS World Cards Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring allyclock's iOS World Cards face to full web parity: the web's wrap-based layout, the Adjustment sliders, and the Settings (Cities) panel.

**Architecture:** The wrap algorithm (the web's `flex-wrap` + per-card min-width formula) becomes a pure function in AllyClockCore with unit tests; `WorldCardsFaceView` is rebuilt on it (ScrollView, rows fill evenly, frozen-`now` injection for snapshots); `WorldCardView` fills its row slot; `AdjustSheetView` gains a `WorldCardsAdjustView` mirroring `FullscreenAdjustView`; a new `WorldCardsSettingsView` ports the web Cities manager on AlloyUI knobs + the existing `ZonePickerView`; `RootFaceView` un-gates the gear. Snapshot suite gains World Cards references.

**Tech Stack:** SwiftUI (iOS 26 app), AllyClockCore (Swift 6), AlloyUI/AlloyTime 0.3.1, swift-snapshot-testing on iPhone 17 / iOS 26 sim.

## Global Constraints

- Repo: `/Volumes/AllyDrive/Storage/Repos/allyclock`, main branch. Conventional commits; do not push until the user says so.
- Web is canonical: formulas/values below are read from the web source and must be used verbatim — card min width `92·timeScale + 288·dateScale` pt (18rem = 288), inter-card gap 24 (1.5rem), face horizontal inset 8 (0.5rem), card internal gap 12, card vertical padding 16, sliders `0.5…2.0` step `0.05` with `%.2f` readout, face background `#000`.
- Store limits are web-shared: `MIN_CARDS = 1`, `MAX_CARDS = 12`; store methods already guard — UI reflects (remove disabled at 1) but never re-implements the guard.
- HARD GATES: full iOS suite green; ALL pre-existing snapshot references byte-identical (`git diff --stat -- '*.png'` shows only NEW files); `packages/AllyClockCore` `swift test` green.
- Simulator flake protocol: on device-clone/channel-disconnect infra errors run `xcrun simctl shutdown all && xcrun simctl delete unavailable`, retry once. If the default DerivedData is locked by a live Xcode, use an isolated `-derivedDataPath`.
- New Swift files in the app target need the four pbxproj entry types (PBXBuildFile, PBXFileReference, group child, Sources phase) using the `AC…01NN` id convention — next free pair is `AC0000000000000000000175`/`AC0000000000000000000176`.
- Lint before the final commit: `cd apps/ios && swiftlint && swiftformat AllyClock AllyClockTests` (fix findings, don't suppress).

---

### Task 1: Wrap algorithm in AllyClockCore (TDD)

**Files:**
- Create: `packages/AllyClockCore/Sources/AllyClockCore/Faces/WorldCards/WorldCardsLayout.swift`
- Create: `packages/AllyClockCore/Tests/AllyClockCoreTests/WorldCardsLayoutTests.swift`

**Interfaces:**
- Produces (exact — Task 2 renders from this):
```swift
public enum WorldCardsLayout {
    public static func minCardWidth(sizes: WorldCardSizes) -> Double
    public static func rows(_ cards: [WorldCardConfig], sizes: WorldCardSizes,
                            width: Double, gap: Double = 24) -> [[WorldCardConfig]]
}
```

- [ ] **Step 1: Write the failing tests**

```swift
@testable import AllyClockCore
import XCTest

final class WorldCardsLayoutTests: XCTestCase {
    private func card(_ id: Int, lineBreak: Bool = false) -> WorldCardConfig {
        WorldCardConfig(id: id, zone: "America/Los_Angeles", lineBreak: lineBreak)
    }

    private let unit = WorldCardSizes(time: 1.0, date: 1.0) // minWidth 380

    func test_minCardWidth_isWebFormula() {
        XCTAssertEqual(WorldCardsLayout.minCardWidth(sizes: unit), 380, accuracy: 0.001)
        XCTAssertEqual(
            WorldCardsLayout.minCardWidth(sizes: WorldCardSizes(time: 2.0, date: 0.5)),
            92 * 2 + 288 * 0.5, accuracy: 0.001
        )
    }

    func test_threeCardsWrapByWidth() {
        let cards = [card(1), card(2), card(3)]
        // 3·380 + 2·24 = 1188 fits an iPad (1210) on one row…
        XCTAssertEqual(WorldCardsLayout.rows(cards, sizes: unit, width: 1210).map { $0.map(\.id) },
                       [[1, 2, 3]])
        // …wraps 2+1 when only two fit (2·380 + 24 = 784 ≤ 900 < 1188)…
        XCTAssertEqual(WorldCardsLayout.rows(cards, sizes: unit, width: 900).map { $0.map(\.id) },
                       [[1, 2], [3]])
        // …and 1+1+1 on a phone-width host.
        XCTAssertEqual(WorldCardsLayout.rows(cards, sizes: unit, width: 500).map { $0.map(\.id) },
                       [[1], [2], [3]])
    }

    func test_loneCardAlwaysFits() {
        // Narrower than minCardWidth: never produces an empty row or drops the card.
        XCTAssertEqual(WorldCardsLayout.rows([card(1)], sizes: unit, width: 200).map { $0.map(\.id) },
                       [[1]])
    }

    func test_lineBreakForcesRowEnd() {
        let cards = [card(1, lineBreak: true), card(2), card(3)]
        // Width fits all three, but card 1's break ends its row first.
        XCTAssertEqual(WorldCardsLayout.rows(cards, sizes: unit, width: 2000).map { $0.map(\.id) },
                       [[1], [2, 3]])
    }

    func test_lineWrapsWithinBreakSegments() {
        let cards = [card(1), card(2, lineBreak: true), card(3), card(4)]
        // Segment [1,2] wraps to two rows at 500; segment [3,4] likewise.
        XCTAssertEqual(WorldCardsLayout.rows(cards, sizes: unit, width: 500).map { $0.map(\.id) },
                       [[1], [2], [3], [4]])
    }
}
```

- [ ] **Step 2: RED** — `cd packages/AllyClockCore && swift test 2>&1 | tail -5`. Paste raw output (type not found).

- [ ] **Step 3: Implement**

```swift
import Foundation

/// Web-parity row layout for the World Cards face. Port of
/// `world-cards-face.component.scss`: each explicit line (cards up to and
/// including a `lineBreak`) is a flex-wrap row set — a card's min width is
/// the flag (92·time) plus the date column (18rem = 288·date), cards divide
/// a row evenly, and a lone card may shrink below min width (`min(…, 100%)`).
public enum WorldCardsLayout {
    /// `min-width: 92px·timeScale + 18rem·dateScale` (px ≡ pt).
    public static func minCardWidth(sizes: WorldCardSizes) -> Double {
        92 * sizes.time + 288 * sizes.date
    }

    /// Split on lineBreak, then wrap each segment by how many min-widths
    /// (+ gaps) fit the host width. Always at least one card per row.
    public static func rows(_ cards: [WorldCardConfig], sizes: WorldCardSizes,
                            width: Double, gap: Double = 24) -> [[WorldCardConfig]]
    {
        let minW = minCardWidth(sizes: sizes)
        let perRow = max(1, Int(((width + gap) / (minW + gap)).rounded(.down)))
        var out: [[WorldCardConfig]] = []
        var segment: [WorldCardConfig] = []
        func flush() {
            var start = segment.startIndex
            while start < segment.endIndex {
                let end = min(start + perRow, segment.endIndex)
                out.append(Array(segment[start ..< end]))
                start = end
            }
            segment = []
        }
        for card in cards {
            segment.append(card)
            if card.lineBreak { flush() }
        }
        if !segment.isEmpty { flush() }
        return out
    }
}
```
NOTE: if `WorldCardSizes`' memberwise init isn't public/matching (check `WorldCardsFields.swift`), adapt the tests' construction to the real initializer — the formula and behaviors are the contract, not the fixture syntax.

- [ ] **Step 4: GREEN** — `swift test`, all pass, raw output in report.
- [ ] **Step 5: Commit** — `feat(core): web-parity wrap layout for World Cards rows`

---

### Task 2: Face + card rebuilt on the wrap layout

**Files:**
- Modify: `apps/ios/AllyClock/Faces/WorldCardsFaceView.swift` (full replacement below)
- Modify: `apps/ios/AllyClock/Faces/WorldCardView.swift` (targeted edits below)

**Interfaces:**
- Consumes: `WorldCardsLayout.rows` (Task 1).
- Produces: `WorldCardsFaceView(store:now:)` with optional frozen `now` (Task 5's snapshots rely on it); `WorldCardView(zone:timeScale:dateScale:now:)`.

- [ ] **Step 1: Replace `WorldCardsFaceView`**

```swift
import AllyClockCore
import SwiftUI

struct WorldCardsFaceView: View {
    let store: WorldCardsConfigStore
    /// Frozen render instant for snapshot tests and previews; nil = live.
    var now: Date?
    private let bg = Color.black // web :host background: #000

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let ratio = size.width / max(size.height, 1)
            let f = store.fieldsFor(ratio)
            // Web-exact wrap: rows from the shared layout function, computed
            // against the content width (host minus the 0.5rem insets).
            let rows = WorldCardsLayout.rows(f.cards, sizes: f.sizes,
                                             width: size.width - 16)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        HStack(alignment: .center, spacing: 24) {
                            ForEach(row, id: \.id) { card in
                                WorldCardView(zone: card.zone,
                                              timeScale: f.sizes.time,
                                              dateScale: f.sizes.date,
                                              now: now)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                    }
                }
                .padding(.horizontal, 8)
                // Centered when content fits; natural scroll when it doesn't.
                .frame(maxWidth: .infinity, minHeight: size.height)
            }
            .debugFrame("host", .white)
        }
        .background(bg).ignoresSafeArea()
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }
}

#Preview("World Cards") {
    WorldCardsFaceView(store: WorldCardsConfigStore(registry: DimensionRegistry())).frame(
        width: 852,
        height: 393
    )
}
```
(The old `fits` ladder, `cards(_:_:fit:)`, and static `rows(_:)` are deleted — the static `rows` logic now lives in `WorldCardsLayout`. Grep the app + tests for `WorldCardsFaceView.rows` before deleting; if a test references it, point that test at `WorldCardsLayout.rows`.)

- [ ] **Step 2: `WorldCardView` parity edits** (keep everything not named):
  1. Add `var now: Date? = nil` after `dateScale`; body becomes the Fullscreen pattern:
```swift
    var body: some View {
        let tz = TimeZone(identifier: zone) ?? .current
        Group {
            if let frozen = now {
                card(frozen, tz)
            } else {
                TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
                    card(ctx.date, tz)
                }
            }
        }
    }

    private func card(_ now: Date, _ tz: TimeZone) -> some View {
        let big = TimeFormatting.bigTime(now, locale: .current, timeZone: tz)
        return HStack(spacing: 12) {
            FlagView(zone: zone)
                … (existing content unchanged) …
        }
        … (existing modifiers unchanged) …
    }
```
  2. Fill the row slot like the web (`.times { flex: 1; align-items: flex-end }`): inside the card's `HStack`, insert `Spacer(minLength: 12)` between the flag and the trailing `VStack` so the card stretches and the time block right-aligns; the bottom-rule overlay then spans the slot exactly like the web's `border-bottom`.
  3. Bottom rule opacity: the web's is solid `#fff` (verified in `card.component.scss:10`) — iOS already matches; leave it.

- [ ] **Step 3: Build + eyeball** — `xcodebuild … build` then `build_run_sim`-style manual check is NOT required here; the structural gate is Task 5's snapshots. Compile check: `cd apps/ios && xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build 2>&1 | tail -3` → BUILD SUCCEEDED.
- [ ] **Step 4: Commit** — `feat(ios): web-parity wrap layout for the World Cards face`

---

### Task 3: Adjustment panel

**Files:**
- Modify: `apps/ios/AllyClock/App/AdjustSheetView.swift`
- Modify: `apps/ios/AllyClock/App/RootFaceView.swift` (call site only)

**Interfaces:**
- Consumes: `WorldCardsConfigStore.setSize(_:key:value:)`, `knobColumns`, `KnobCard/KnobLabel`, `Knobs.tint` (AlloyUI).
- Produces: `AdjustSheetView(face:fullscreenStore:worldCardsStore:registry:ratio:availableWidth:)`.

- [ ] **Step 1:** Add `let worldCardsStore: WorldCardsConfigStore` to `AdjustSheetView`; replace the `.worldCards` placeholder case with `WorldCardsAdjustView(store: worldCardsStore, registry: registry, ratio: ratio, initialWidth: availableWidth)`. Delete the placeholder VStack and its doc-comment sentence ("World Cards still lists its planned controls…" → "each face gets its web Adjustment panel").
- [ ] **Step 2:** Add `WorldCardsAdjustView` in the same file — a structural sibling of `FullscreenAdjustView` (same `@State width` seeding, same grid, same `sliderRow` helper duplicated locally or hoisted):
```swift
/// Time + Date size sliders for World Cards, per dimension band. Range/step
/// and the %.2f readout match the web (`world-cards-config.component`).
struct WorldCardsAdjustView: View {
    let store: WorldCardsConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    @State private var width: CGFloat

    init(store: WorldCardsConfigStore, registry: DimensionRegistry, ratio: Double,
         initialWidth: CGFloat = 0)
    {
        self.store = store
        self.registry = registry
        self.ratio = ratio
        _width = State(initialValue: initialWidth)
    }

    private var bandId: String { registry.resolveForRatio(ratio).id }

    var body: some View {
        let fields = store.config(bandId)
        LazyVGrid(
            columns: Array(
                repeating: GridItem(.flexible(), spacing: 16), count: knobColumns(for: width)
            ),
            spacing: 16
        ) {
            KnobCard {
                KnobLabel("Time")
                AdjustSliderRow(value: fields.sizes.time) { value in
                    store.setSize(bandId, key: \.time, value: value)
                }
            }
            KnobCard {
                KnobLabel("Date")
                AdjustSliderRow(value: fields.sizes.date) { value in
                    store.setSize(bandId, key: \.date, value: value)
                }
            }
        }
        .padding(.horizontal, 24)
        .onGeometryChange(for: CGFloat.self, of: { $0.size.width }, action: { width = $0 })
    }
}
```
HOIST the duplicated slider row: extract `FullscreenAdjustView.sliderRow` into a shared file-private view used by both:
```swift
/// One knobs slider row: 0.5–2.0 step 0.05 with the web's %.2f readout.
private struct AdjustSliderRow: View {
    let value: Double
    let set: (Double) -> Void

    var body: some View {
        HStack(spacing: 10) {
            Slider(value: Binding(get: { value }, set: set), in: 0.5 ... 2.0, step: 0.05)
                .tint(Knobs.tint)
            Text(String(format: "%.2f", value))
                .font(.system(size: 11.5))
                .monospacedDigit()
                .foregroundStyle(.white)
                .frame(width: 38, alignment: .trailing)
        }
    }
}
```
(`FullscreenAdjustView` switches its two `sliderRow(…)` calls to `AdjustSliderRow(value:set:)` and its private func is deleted.)
- [ ] **Step 3:** RootFaceView call site gains `worldCardsStore: worldCardsStore` (the property already exists there — verify by grep, it feeds `FacePickerView`).
- [ ] **Step 4:** Build passes. Manual sanity optional; the store round-trip is already covered by `WorldCardsConfigStoreTests.setSize` tests in AllyClockCore.
- [ ] **Step 5: Commit** — `feat(ios): World Cards Adjustment panel (Time/Date size sliders)`

---

### Task 4: Settings panel + shell wiring

**Files:**
- Create: `apps/ios/AllyClock/Faces/WorldCardsSettingsView.swift`
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj` (four entries, ids AC…0175 fileRef / AC…0176 buildFile, group `Faces`, app Sources phase)
- Modify: `apps/ios/AllyClock/App/RootFaceView.swift`

**Interfaces:**
- Consumes: store mutators (`addCard/removeCard/setCardZone/setCardLineBreak`), `ZonePickerView(options:selectedId:listHeight:onSelect:)` — READ `Shared/ZonePickerView.swift` and `Faces/FullscreenSettingsView.swift` first and mirror the exact signature/animation/back pattern and the zone-options construction (`ZoneCatalog.buildOptions` + `buildSpecialZones`, however FullscreenSettingsView combines them).
- Produces: `WorldCardsSettingsView(store:initialWidth:availableHeight:)`.

- [ ] **Step 1: Write the view** (structure below is binding; exact ZonePicker plumbing mirrors FullscreenSettingsView):

```swift
import AllyClockCore
import AlloyTime
import AlloyUI
import SwiftUI

/// Settings panel for World Cards: the web's Cities manager
/// (`world-cards-settings.component`). One row per card — zone button
/// (flag + abbreviated city, opens the zone picker), Break toggle, remove ✕ —
/// plus Add City. Applies live; the store guards MIN/MAX card counts.
struct WorldCardsSettingsView: View {
    let store: WorldCardsConfigStore
    var initialWidth: CGFloat = 0
    var availableHeight: CGFloat = 0

    @State private var editingCardId: Int?

    var body: some View {
        let cards = store.sample().cards
        if let id = editingCardId, let card = cards.first(where: { $0.id == id }) {
            // Zone picker replaces the panel content (Fullscreen pattern):
            // mirror FullscreenSettingsView's ZonePickerView call — options,
            // selectedId: card.zone, listHeight derived from availableHeight,
            // back/select closing with the 0.25s easeOut animation. Selecting
            // calls store.setCardZone(id: id, zone: picked) then closes.
        } else {
            VStack(alignment: .leading, spacing: 12) {
                KnobCard {
                    HStack {
                        KnobLabel("Cities")
                        Spacer()
                        KnobLabel("Break")
                    }
                    ForEach(cards, id: \.id) { card in
                        cityRow(card, removable: cards.count > 1)
                    }
                }
                KnobField(action: { store.addCard(zone: TimeZone.current.identifier) }) {
                    SFIcon("plus").frame(width: 14, height: 14)
                    Text("Add City")
                }
            }
            .padding(.horizontal, 24)
        }
    }

    private func cityRow(_ card: WorldCardConfig, removable: Bool) -> some View {
        HStack(spacing: 10) {
            Button {
                withAnimation(.easeOut(duration: 0.25)) { editingCardId = card.id }
            } label: {
                HStack(spacing: 8) {
                    FlagView(zone: card.zone).frame(width: 22, height: 22)
                    Text(cityLabel(card.zone))
                        .font(.system(size: 14.5))
                        .lineLimit(1)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AlloyTokens.secondarySurface,
                            in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .foregroundStyle(AlloyTokens.tint)

            RowToggle(isOn: card.lineBreak) { store.setCardLineBreak(id: card.id, $0) }

            Button {
                store.removeCard(id: card.id)
            } label: {
                SFIcon("xmark").frame(width: 12, height: 12)
                    .padding(6)
            }
            .buttonStyle(.plain)
            .foregroundStyle(AlloyTokens.secondaryLabel)
            .disabled(!removable)
            .opacity(removable ? 1 : 0.3)
            .accessibilityLabel("Remove \(cityLabel(card.zone))")
        }
    }

    /// City display: abbreviated when a flag carries the country context —
    /// the web's `cityLabel` falls back to the zone id when there's no city.
    private func cityLabel(_ zone: String) -> String {
        let city = ZoneFormat.zoneCity(zone, abbreviate: false)
        return city.isEmpty ? zone : city
    }
}

/// Bare knobs pill switch — the web's per-row Break toggle has its column
/// header instead of a stacked label, so AlloyUI's KnobToggle (label above)
/// doesn't fit; this is its capsule body alone.
private struct RowToggle: View {
    let isOn: Bool
    let set: (Bool) -> Void

    var body: some View {
        Capsule().fill(isOn ? AlloyTokens.tint : AlloyTokens.secondarySurface)
            .frame(width: 44, height: 26)
            .overlay(alignment: .leading) {
                Circle().fill(.white)
                    .frame(width: 20, height: 20)
                    .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                    .offset(x: isOn ? 21 : 3)
            }
            .animation(.easeInOut(duration: 0.2), value: isOn)
            .onTapGesture { set(!isOn) }
            .accessibilityLabel("Line break")
            .accessibilityAddTraits(.isButton)
            .accessibilityValue(isOn ? "on" : "off")
    }
}
```
CHECK against the web before finalizing labels: `world-cards-settings.component.ts`'s `cityLabel` uses `zoneCity(zone, true) || option-label || zone` — mirror its abbreviation choice (read the file; the snippet above uses non-abbreviated on iOS ONLY if the web does; otherwise match the web exactly and note it).

- [ ] **Step 2: pbxproj** — four entries for `WorldCardsSettingsView.swift` (fileRef `AC…0175` in the `Faces` group, buildFile `AC…0176` in the app target's Sources phase), mirroring `FullscreenSettingsView.swift`'s entries.
- [ ] **Step 3: RootFaceView wiring** — gear condition `if face == .fullscreen` becomes `if face == .fullscreen || face == .worldCards`; the settings GlassSheet body becomes a `switch face` hosting `FullscreenSettingsView(store: fullscreenStore, …)` or `WorldCardsSettingsView(store: worldCardsStore, initialWidth: sheetWidth, availableHeight: fullHeight)` with the same arguments FullscreenSettingsView receives today (grep the current call for the exact parameter names/values and reuse them).
- [ ] **Step 4: Build + manual check** — build, launch with `-openSettings` after selecting World Cards (or tap through), verify: rows list, zone picker opens/selects/returns, break toggle re-flows the face live, remove disabled at one card, Add City appends the local zone.
- [ ] **Step 5: Commit** — `feat(ios): World Cards Settings — the web Cities manager`

---

### Task 5: Snapshots + final verification

**Files:**
- Modify: `apps/ios/AllyClockTests/FaceSnapshotTests.swift`

**Interfaces:**
- Consumes: `WorldCardsFaceView(store:now:)` (Task 2), `WorldCardsConfigStore` mutators.

- [ ] **Step 1: Add World Cards cases** (same conventions as the file's Fullscreen ones — frozen instant, pinned zone, private suite defaults):
```swift
    private func makeWorldStore(
        _ mutate: (WorldCardsConfigStore) -> Void = { _ in }
    ) -> WorldCardsConfigStore {
        let defaults = UserDefaults(suiteName: "face-snapshots-\(UUID().uuidString)")!
        let store = WorldCardsConfigStore(registry: DimensionRegistry(), defaults: defaults)
        mutate(store)
        return store
    }

    private func assertWorldFace(_ store: WorldCardsConfigStore,
                                 width: CGFloat, height: CGFloat, named name: String,
                                 file: StaticString = #filePath,
                                 testName: String = #function, line: UInt = #line)
    {
        let view = WorldCardsFaceView(store: store, now: instant)
            .frame(width: width, height: height)
        assertSnapshot(of: view, as: .image(layout: .fixed(width: width, height: height)),
                       named: name, file: file, testName: testName, line: line)
    }

    func test_worldCardsDefault() {
        assertWorldFace(makeWorldStore(), width: 852, height: 393, named: "phone852x393")
        assertWorldFace(makeWorldStore(), width: 480, height: 270, named: "thumb480x270")
        assertWorldFace(makeWorldStore(), width: 1210, height: 834, named: "ipad1210x834")
    }

    /// Explicit line breaks split rows; the wrap algorithm handles the rest.
    func test_worldCardsMultiRow() {
        let store = makeWorldStore { s in
            s.addCard(zone: "Asia/Seoul")
            s.addCard(zone: "Europe/London")
            if let first = s.sample().cards.first {
                s.setCardLineBreak(id: first.id, true)
            }
        }
        assertWorldFace(store, width: 852, height: 393, named: "multirow852x393")
    }

    /// Off-1.0 sizes drive both the card scale and the wrap threshold.
    func test_worldCardsScaled() {
        let store = makeWorldStore { s in
            let band = DimensionRegistry().resolveForRatio(852.0 / 393.0).id
            s.setSize(band, key: \.time, value: 1.4)
            s.setSize(band, key: \.date, value: 0.8)
        }
        assertWorldFace(store, width: 852, height: 393, named: "scaled852x393")
    }
```
NOTE: default-store card zones come from `WorldCardsPresets` — check whether the default zones are device-zone-dependent; if any preset card uses the DEVICE zone, pin it via `setCardZone` in `makeWorldStore` so references are machine-independent (the Fullscreen suite pins `America/Los_Angeles` for the same reason).
- [ ] **Step 2: Record** — run the suite; the new tests fail with "No reference found / recorded"; re-run → all green. PRE-EXISTING refs must be untouched: `git diff --stat -- '*.png'` lists only new files.
- [ ] **Step 3: Full gates** — full iOS suite (expect 9 old + new all green); `cd packages/AllyClockCore && swift test`; `cd apps/ios && swiftlint && swiftformat AllyClock AllyClockTests` then rebuild/re-test if formatting changed anything.
- [ ] **Step 4: Side-by-side parity check** — run the web app (`npm run start:web`) and the sim side by side at phone size; compare default + multirow + scaled configs visually; capture one screenshot pair into the report. Fix only structural mismatches (spacing/alignment), not anti-aliasing.
- [ ] **Step 5: Commit** — `test(ios): World Cards snapshot suite; parity verified against web`

## Final verification

- `git log --oneline` shows the five commits; nothing pushed.
- Full iOS suite green; AllyClockCore green; only NEW pngs in the diff.
- Fullscreen behavior untouched (its snapshots prove it).
