import SwiftUI

/// Bottom panel matching the web's sheet component: hugs its content height,
/// Liquid Glass background so the face stays visible behind, centered grab
/// bar, title header with a large-target close button, and a backdrop that
/// dismisses on tap (the AllyClock sheet rule: apply live, accept on any
/// dismissal — no confirm/cancel).
struct GlassSheet<Content: View>: View {
    let title: String
    /// Horizontal safe-area inset of the host window. The panel spans the full
    /// width (root ignores the safe area), so the header must clear the
    /// Dynamic Island / rounded corners itself.
    var hInset: CGFloat = 0
    let onClose: () -> Void
    @ViewBuilder var content: () -> Content

    private var panelShape: UnevenRoundedRectangle {
        // Rounded only at the top — the panel sits flush with the screen bottom.
        UnevenRoundedRectangle(topLeadingRadius: 20, topTrailingRadius: 20)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Backdrop: light dim, tap anywhere outside to dismiss.
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture(perform: onClose)
                .transition(.opacity)

            VStack(spacing: 0) {
                Capsule()
                    .fill(Color.white.opacity(0.35))
                    .frame(width: 40, height: 4)
                    .padding(.top, 8)

                ZStack {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(Color(white: 0.95))
                    HStack {
                        Button(action: onClose) {
                            SFIcon("xmark")
                                .frame(width: 14, height: 14)
                                .padding(14)
                        }
                        .buttonStyle(.glass)
                        .buttonBorderShape(.circle)
                        .foregroundStyle(Color(white: 0.9))
                        // Full 44pt+ hit target — the toolbar X was ~16pt and
                        // needed several taps.
                        .contentShape(Circle())
                        Spacer()
                    }
                }
                .padding(.horizontal, max(12, hInset))
                .padding(.top, 4)

                content()
                    .padding(.horizontal, hInset)
                    .padding(.top, 12)
                    .padding(.bottom, 20)
            }
            .frame(maxWidth: .infinity)
            .glassEffect(.regular, in: panelShape)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}
