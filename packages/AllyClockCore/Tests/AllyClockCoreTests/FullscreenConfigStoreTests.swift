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
