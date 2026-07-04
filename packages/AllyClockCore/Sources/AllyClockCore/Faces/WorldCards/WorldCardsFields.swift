import Foundation

public struct WorldCardConfig: Codable, Equatable, Sendable {
    public var id: Int
    public var zone: String       // IANA id
    public var lineBreak: Bool    // true ends this card's row
    public init(id: Int, zone: String, lineBreak: Bool) {
        self.id = id; self.zone = zone; self.lineBreak = lineBreak
    }
}

public struct WorldCardSizes: Codable, Equatable, Sendable {
    public var time: Double       // 0.5–2.0
    public var date: Double       // 0.5–2.0
    public init(time: Double, date: Double) { self.time = time; self.date = date }
}

public struct WorldCardsFields: Codable, Equatable, Sendable {
    public var cards: [WorldCardConfig]   // global (broadcast to every band)
    public var sizes: WorldCardSizes      // per-band
    public init(cards: [WorldCardConfig], sizes: WorldCardSizes) {
        self.cards = cards; self.sizes = sizes
    }
}

public let MIN_CARDS = 1
public let MAX_CARDS = 12
