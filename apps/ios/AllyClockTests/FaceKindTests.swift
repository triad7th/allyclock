@testable import AllyClock
import XCTest

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
