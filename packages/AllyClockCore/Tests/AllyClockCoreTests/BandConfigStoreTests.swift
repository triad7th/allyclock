import XCTest
import Observation
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
}
