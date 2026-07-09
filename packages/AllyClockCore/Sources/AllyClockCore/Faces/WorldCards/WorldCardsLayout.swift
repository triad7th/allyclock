import Foundation

/// Web-parity row layout for the World Cards face. Port of
/// `world-cards-face.component.scss`: each explicit line (cards up to and
/// including a `lineBreak`) is a flex-wrap row set — a card's min width is
/// the flag (92·time) plus the date column (18rem = 288·date), cards divide
/// a row evenly, and a lone card may shrink below min width (`min(…, 100%)`).
public enum WorldCardsLayout {
    /// `min-width: 92px·timeScale + 18rem·dateScale` (px ≡ pt).
    public static func minCardWidth(sizes: WorldCardSizes) -> Double {
        92 * sizes.time + 288 * sizes.date
    }

    /// Split on lineBreak, then wrap each segment by how many min-widths
    /// (+ gaps) fit the host width. Always at least one card per row.
    public static func rows(_ cards: [WorldCardConfig], sizes: WorldCardSizes,
                            width: Double, gap: Double = 24) -> [[WorldCardConfig]]
    {
        let minW = minCardWidth(sizes: sizes)
        let perRow = max(1, Int(((width + gap) / (minW + gap)).rounded(.down)))
        var out: [[WorldCardConfig]] = []
        var segment: [WorldCardConfig] = []
        func flush() {
            var start = segment.startIndex
            while start < segment.endIndex {
                let end = min(start + perRow, segment.endIndex)
                out.append(Array(segment[start ..< end]))
                start = end
            }
            segment = []
        }
        for card in cards {
            segment.append(card)
            if card.lineBreak { flush() }
        }
        if !segment.isEmpty { flush() }
        return out
    }
}
