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
