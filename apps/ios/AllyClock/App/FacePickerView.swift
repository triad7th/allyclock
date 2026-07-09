import AllyClockCore
import AlloyUI
import SwiftUI

/// Face cards with live preview thumbnails, mirroring the web face-picker
/// sheet content. Hosted inside a GlassSheet; applies on selection (the
/// AllyClock sheet rule: no confirm/cancel).
struct FacePickerView: View {
    @Binding var selection: FaceKind
    let fullscreenStore: FullscreenConfigStore
    let worldCardsStore: WorldCardsConfigStore
    /// Called after a face is picked — the host closes the sheet.
    let onSelect: () -> Void

    // 16:9 preview, rendered large and scaled down so the face lays out at a
    // real device-like ratio (matches the web's 960x540 @ scale 0.2).
    private let previewW: CGFloat = 192
    private let previewH: CGFloat = 108
    private let renderScale: CGFloat = 0.4

    var body: some View {
        // Centered wrap like the web's .options row; hugs its content height.
        HStack(spacing: 12) {
            ForEach(FaceKind.allCases) { face in
                Button {
                    selection = face
                    onSelect()
                } label: {
                    card(face)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
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
