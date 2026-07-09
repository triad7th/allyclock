import AllyClockCore
import SwiftUI

struct WorldCardsFaceView: View {
    let store: WorldCardsConfigStore
    /// Frozen render instant for snapshot tests and previews; nil = live.
    var now: Date?
    private let bg = Color.black // web :host background: #000

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let ratio = size.width / max(size.height, 1)
            let f = store.fieldsFor(ratio)
            // Web-exact wrap: rows from the shared layout function, computed
            // against the content width (host minus the 0.5rem insets).
            let rows = WorldCardsLayout.rows(f.cards, sizes: f.sizes,
                                             width: size.width - 16)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        HStack(alignment: .center, spacing: 24) {
                            ForEach(row, id: \.id) { card in
                                WorldCardView(zone: card.zone,
                                              timeScale: f.sizes.time,
                                              dateScale: f.sizes.date,
                                              now: now)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                    }
                }
                .padding(.horizontal, 8)
                // Centered when content fits; natural scroll when it doesn't.
                .frame(maxWidth: .infinity, minHeight: size.height)
            }
            .debugFrame("host", .white)
        }
        .background(bg).ignoresSafeArea()
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }
}

#Preview("World Cards") {
    WorldCardsFaceView(store: WorldCardsConfigStore(registry: DimensionRegistry())).frame(
        width: 852,
        height: 393
    )
}
