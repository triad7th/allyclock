@testable import AllyClock
import AllyClockCore
import SnapshotTesting
import SwiftUI
import XCTest

/// Pixel-level regression net for the Fullscreen face: a frozen instant, a
/// fixed zone, fixed host sizes, and config variants covering the knobs
/// (zoom overflow, date scaling, zone/flag visibility). Reference images
/// are recorded on the iPhone 17 / iOS 26 simulator — delete the matching
/// `__Snapshots__` images to re-record after a runtime or design change.
@MainActor
final class FaceSnapshotTests: XCTestCase {
    /// 2026-01-15T12:34:56Z — 04:34:56 in the pinned LA zone, mid-minute so
    /// the progress bar has a stable partial fill.
    private let instant = Date(timeIntervalSince1970: 1_768_480_496)

    private func makeStore(
        _ mutate: (FullscreenConfigStore) -> Void = { _ in }
    ) -> FullscreenConfigStore {
        let defaults = UserDefaults(suiteName: "face-snapshots-\(UUID().uuidString)")!
        let store = FullscreenConfigStore(registry: DimensionRegistry(), defaults: defaults)
        store.setTimeZoneAll("America/Los_Angeles") // pin the zone, not the device's
        mutate(store)
        return store
    }

    private func assertFace(_ store: FullscreenConfigStore,
                            width: CGFloat, height: CGFloat, named name: String,
                            file: StaticString = #filePath,
                            testName: String = #function, line: UInt = #line)
    {
        let view = FullscreenFaceView(store: store, now: instant)
            .frame(width: width, height: height)
        assertSnapshot(of: view, as: .image(layout: .fixed(width: width, height: height)),
                       named: name, file: file, testName: testName, line: line)
    }

    private func editBand(_ store: FullscreenConfigStore, ratio: Double,
                          _ mutate: (String, FullscreenConfigStore) -> Void)
    {
        mutate(DimensionRegistry().resolveForRatio(ratio).id, store)
    }

    func test_defaultConfig() {
        assertFace(makeStore(), width: 852, height: 393, named: "phone852x393")
        assertFace(makeStore(), width: 480, height: 270, named: "thumb480x270")
        assertFace(makeStore(), width: 1210, height: 834, named: "ipad1210x834")
    }

    /// Time at max zoom must overflow CENTERED and clip at the host (web
    /// overflow: hidden), never shrink to fit or anchor top-leading.
    func test_timeZoomOverflowsCentered() {
        let store = makeStore()
        editBand(store, ratio: 852.0 / 393.0) { band, s in
            s.updateSection(band, .time) { var v = $0
                v.sizeScale = 2.0
                return v
            }
        }
        assertFace(store, width: 852, height: 393, named: "time2x")
    }

    /// The Date knob scales weekday/month/day/gmt AND the zone city, flag,
    /// and GMT globe together.
    func test_dateKnobScalesZoneAndFlag() {
        let store = makeStore()
        store.setZoneVisibleAll(true)
        store.setFlagVisibleAll(true)
        editBand(store, ratio: 852.0 / 393.0) { band, s in
            for key in SectionKey.dateKeys {
                s.updateSection(band, key) { var v = $0
                    v.sizeScale = 0.5
                    return v
                }
            }
        }
        assertFace(store, width: 852, height: 393, named: "date05zoneflag")
    }

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
}
