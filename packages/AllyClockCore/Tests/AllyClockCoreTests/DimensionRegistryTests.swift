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
