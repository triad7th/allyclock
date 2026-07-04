import Foundation

enum WorldCardsPresets {
    // LA ends its row; UTC + Seoul share the second row.
    private static let defaultCards: [WorldCardConfig] = [
        .init(id: 1, zone: "America/Los_Angeles", lineBreak: true),
        .init(id: 2, zone: "UTC", lineBreak: false),
        .init(id: 3, zone: "Asia/Seoul", lineBreak: false),
    ]

    private static func fields() -> WorldCardsFields {
        WorldCardsFields(cards: defaultCards, sizes: .init(time: 1, date: 1))
    }

    static func buildDefaults() -> [String: WorldCardsFields] {
        var byBand: [String: WorldCardsFields] = [:]
        for band in builtInBands { byBand[band.id] = fields() }
        return byBand
    }
}
