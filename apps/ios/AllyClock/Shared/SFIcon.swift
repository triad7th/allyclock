import SwiftUI

/// SF Symbol by semantic name — the iOS side of the shared icon abstraction.
struct SFIcon: View {
    let name: String
    init(_ name: String) {
        self.name = name
    }

    var body: some View {
        Image(systemName: name).resizable().scaledToFit()
    }
}
