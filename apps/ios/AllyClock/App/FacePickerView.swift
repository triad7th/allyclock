import AllyClockCore
import SwiftUI

/// Sheet listing the faces as cards with a live preview thumbnail, mirroring the
/// web face-picker sheet. Applies on selection and on dismissal (the AllyClock
/// sheet rule: no confirm/cancel).
struct FacePickerView: View {
    @Binding var selection: FaceKind
    let fullscreenStore: FullscreenConfigStore
    let worldCardsStore: WorldCardsConfigStore
    @Environment(\.dismiss) private var dismiss

    // 16:9 preview, rendered large and scaled down so the face lays out at a
    // real device-like ratio (matches the web's 960x540 @ scale 0.2).
    private let previewW: CGFloat = 192
    private let previewH: CGFloat = 108
    private let renderScale: CGFloat = 0.4

    private let columns = [GridItem(.adaptive(minimum: 176), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(FaceKind.allCases) { face in
                        Button {
                            selection = face
                            dismiss()
                        } label: {
                            card(face)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(24)
            }
            .navigationTitle("Faces")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: { SFIcon("xmark").frame(width: 16, height: 16) }
                }
            }
        }
    }

    private func card(_ face: FaceKind) -> some View {
        VStack(spacing: 8) {
            preview(face)
                .frame(width: previewW, height: previewH)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            Text(face.displayName)
                .font(.subheadline)
                .foregroundStyle(Color(white: 0.8))
        }
        .padding(8)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color(white: 0.16)))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(face == selection ? Color.accentColor : .clear, lineWidth: 2)
        )
    }

    @ViewBuilder
    private func preview(_ face: FaceKind) -> some View {
        let renderW = previewW / renderScale
        let renderH = previewH / renderScale
        Group {
            switch face {
            case .fullscreen: FullscreenFaceView(store: fullscreenStore)
            case .worldCards: WorldCardsFaceView(store: worldCardsStore)
            }
        }
        .frame(width: renderW, height: renderH)
        .scaleEffect(renderScale)
        .frame(width: previewW, height: previewH)
        .allowsHitTesting(false)
    }
}
