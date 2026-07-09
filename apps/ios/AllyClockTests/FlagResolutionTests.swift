import AlloyTime
import AlloyUI
@testable import AllyClock
import AllyClockCore
import UIKit
import XCTest

final class FlagResolutionTests: XCTestCase {
    /// Zone -> asset name via AlloyUI's FlagResolution over AlloyTime's
    /// zone->country table, the same composition FlagView call sites use.
    private func assetName(forZone zone: String) -> String? {
        FlagResolution.assetName(forCountryCode: ZoneCountry.country(for: zone))
    }

    func test_knownZoneResolvesToBundledAsset() {
        XCTAssertEqual(assetName(forZone: "America/Los_Angeles"), "Flags/us")
        XCTAssertEqual(assetName(forZone: "Asia/Seoul"), "Flags/kr")
    }

    func test_nilForCountrylessZone() {
        XCTAssertNil(assetName(forZone: "UTC"))
        XCTAssertNil(assetName(forZone: "+05:30"))
    }

    /// Every country the zone table can produce must ship its artwork —
    /// catches a stale `assets/flags/render_ios_flags.py` run after a
    /// flag-icons/tzdata update.
    func test_everyMappedCountryHasBundledArtwork() {
        let codes = Set(ZoneCountry.table.values)
        let missing = codes.filter { UIImage(named: "Flags/\($0)") == nil }.sorted()
        XCTAssertTrue(missing.isEmpty, "missing flag assets: \(missing)")
    }

    func test_fontWeightMapsBands() {
        XCTAssertEqual(fontWeight(200), .thin)
        XCTAssertEqual(fontWeight(300), .light)
        XCTAssertEqual(fontWeight(700), .bold)
    }
}
