import SwiftUI

/// Maps the web's numeric font weights (100–700) to SwiftUI weights.
func fontWeight(_ w: Int) -> Font.Weight {
    switch w {
    case ..<150: return .ultraLight
    case ..<250: return .thin
    case ..<350: return .light
    case ..<450: return .regular
    case ..<550: return .medium
    case ..<650: return .semibold
    default: return .bold
    }
}
