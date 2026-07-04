import XCTest
@testable import AllyClockCore

final class PackageSmokeTests: XCTestCase {
  func test_moduleExposesVersion() {
    XCTAssertEqual(AllyClockCore.version, "0.1.0")
  }
}
