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
