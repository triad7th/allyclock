import SwiftUI

/// Renders a face at a few representative device ratios for previews.
struct FacePreviewGrid<Content: View>: View {
    @ViewBuilder var content: () -> Content
    private let sizes: [(String, CGFloat, CGFloat)] = [
        ("iPhone portrait", 393, 852),
        ("iPhone landscape", 852, 393),
        ("iPad portrait", 834, 1194),
        ("iPad landscape", 1194, 834),
    ]
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(sizes, id: \.0) { name, w, h in
                    VStack(spacing: 4) {
                        Text(name).font(.caption).foregroundStyle(.secondary)
                        content().frame(width: w, height: h).clipped()
                            .overlay(Rectangle().stroke(.secondary))
                    }
                }
            }
            .padding()
        }
    }
}
