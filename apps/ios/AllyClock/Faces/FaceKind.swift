import Foundation

enum FaceKind: String, CaseIterable, Identifiable {
    case fullscreen = "fullscreen"
    case worldCards = "world-cards"

    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .fullscreen: return "Fullscreen"
        case .worldCards: return "World Cards"
        }
    }
}
