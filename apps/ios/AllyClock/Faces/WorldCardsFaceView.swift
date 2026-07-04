import AllyClockCore
import SwiftUI

struct WorldCardsFaceView: View {
    let store: WorldCardsConfigStore
    private let bg = Color(red: 0x05 / 255, green: 0x05 / 255, blue: 0x05 / 255)

    var body: some View {
        GeometryReader { geo in
            let ratio = geo.size.width / max(geo.size.height, 1)
            let f = store.fieldsFor(ratio)
            let rows = Self.rows(f.cards)
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 32) {
                        ForEach(row, id: \.id) { card in
                            WorldCardView(
                                zone: card.zone,
                                timeScale: f.sizes.time,
                                dateScale: f.sizes.date
                            )
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 24)
        }
        .background(bg).ignoresSafeArea()
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }

    /// Split cards into rows: a card with `lineBreak == true` ends its row.
    static func rows(_ cards: [WorldCardConfig]) -> [[WorldCardConfig]] {
        var out: [[WorldCardConfig]] = []
        var row: [WorldCardConfig] = []
        for c in cards {
            row.append(c)
            if c.lineBreak { out.append(row)
                row = []
            }
        }
        if !row.isEmpty { out.append(row) }
        return out
    }
}

#Preview("World Cards") {
    WorldCardsFaceView(store: WorldCardsConfigStore(registry: DimensionRegistry())).frame(
        width: 852,
        height: 393
    )
}
