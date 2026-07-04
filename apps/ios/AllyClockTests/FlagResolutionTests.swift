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
