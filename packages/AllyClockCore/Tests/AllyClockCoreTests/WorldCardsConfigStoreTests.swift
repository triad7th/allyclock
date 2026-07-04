import XCTest
@testable import AllyClockCore

final class WorldCardsConfigStoreTests: XCTestCase {
    private func store() -> WorldCardsConfigStore {
        WorldCardsConfigStore(registry: DimensionRegistry(),
                              defaults: UserDefaults(suiteName: "wc-\(UUID().uuidString)")!)
    }

    func test_defaultCards_LA_UTC_Seoul_withLineBreakAfterLA() {
        let cards = store().sample().cards
        XCTAssertEqual(cards.map(\.zone), ["America/Los_Angeles", "UTC", "Asia/Seoul"])
        XCTAssertTrue(cards[0].lineBreak)
        XCTAssertFalse(cards[1].lineBreak)
    }

    func test_addCardBroadcastsAndAssignsNextId() {
        let s = store()
        s.addCard(zone: "Europe/Paris")
        XCTAssertEqual(s.sample().cards.count, 4)
        XCTAssertEqual(s.sample().cards.last?.zone, "Europe/Paris")
        XCTAssertEqual(s.sample().cards.last?.id, 4)   // max(1,2,3)+1
        XCTAssertEqual(s.config("super").cards.count, 4) // broadcast
    }

    func test_removeCardRespectsMinCards() {
        let s = store()
        s.removeCard(id: 2); s.removeCard(id: 3)
        XCTAssertEqual(s.sample().cards.map(\.id), [1])
        s.removeCard(id: 1)                 // at MIN_CARDS → no-op
        XCTAssertEqual(s.sample().cards.count, 1)
    }

    func test_addCardStopsAtMaxCards() {
        let s = store()
        for i in 0..<20 { s.addCard(zone: "Etc/GMT+\(i % 12)") }
        XCTAssertEqual(s.sample().cards.count, MAX_CARDS)
    }

    func test_setSizeIsPerBand() {
        let s = store()
        s.setSize("phone", key: \.time, value: 1.3)
        XCTAssertEqual(s.config("phone").sizes.time, 1.3)
        XCTAssertEqual(s.config("super").sizes.time, 1.0)
    }
}
