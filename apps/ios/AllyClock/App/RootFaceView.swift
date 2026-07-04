import AllyClockCore
import SwiftUI

/// App root: hosts the active face full-bleed with an auto-hiding controls bar
/// (Configure + Adjust), mirroring the web app shell.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @Environment(\.verticalSizeClass) private var vSize
    @State private var pickerOpen = false
    @State private var adjustOpen = false
    @State private var chromeVisible = true
    @State private var hideTask: Task<Void, Never>?

    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        fullscreenStore = FullscreenConfigStore(registry: reg)
        worldCardsStore = WorldCardsConfigStore(registry: reg)
    }

    private var face: FaceKind {
        FaceKind(rawValue: selectedRaw) ?? .fullscreen
    }

    var body: some View {
        // Full-bleed pattern: the ZStack ignores the safe area so the face
        // centers in the FULL screen (safeAreaInset would reserve the bar's
        // height and nudge the face up), and the controls overlay the very
        // bottom edge like the web's controls-bar. Home indicator hidden.
        // Outer GeometryReader reads the window's safe-area insets BEFORE the
        // ZStack ignores them — the glass sheets span the full width, so their
        // headers must clear the Dynamic Island / rounded corners themselves.
        GeometryReader { outer in
            let hInset = max(outer.safeAreaInsets.leading, outer.safeAreaInsets.trailing)
            ZStack(alignment: .bottom) {
                switch face {
                case .fullscreen: FullscreenFaceView(store: fullscreenStore)
                case .worldCards: WorldCardsFaceView(store: worldCardsStore)
                }

                controlsBar
                    .debugFrame("controls", .cyan)
                    .padding(.bottom, 16)
                    .opacity(chromeVisible && !sheetOpen ? 1 : 0)
                    .animation(.easeInOut(duration: 0.3), value: chromeVisible)

                // Web-style glass sheets: content-hugging bottom panels over the
                // face, not full-screen system sheets (which iPhone landscape
                // forces full-screen anyway).
                if !useSystemSheet {
                    if pickerOpen {
                        GlassSheet(title: "Faces", hInset: hInset, onClose: { close($pickerOpen) }) {
                            FacePickerView(
                                selection: Binding(get: { face }, set: { selectedRaw = $0.rawValue }),
                                fullscreenStore: fullscreenStore,
                                worldCardsStore: worldCardsStore,
                                onSelect: { close($pickerOpen) }
                            )
                        }
                        .zIndex(1)
                    }
                    if adjustOpen {
                        GlassSheet(title: "Adjust", hInset: hInset, onClose: { close($adjustOpen) }) {
                            AdjustSheetView(face: face)
                        }
                        .zIndex(1)
                    }
                }
            }
            .ignoresSafeArea()
        }
        // Regular vertical size class (iPad): the stock system sheet — the
        // default iOS 26 floating Liquid Glass panel.
        .sheet(isPresented: useSystemSheet ? $pickerOpen : .constant(false)) {
            systemSheetContent(title: "Faces") {
                FacePickerView(
                    selection: Binding(get: { face }, set: { selectedRaw = $0.rawValue }),
                    fullscreenStore: fullscreenStore,
                    worldCardsStore: worldCardsStore,
                    onSelect: { pickerOpen = false }
                )
            }
        }
        .sheet(isPresented: useSystemSheet ? $adjustOpen : .constant(false)) {
            systemSheetContent(title: "Adjust") { AdjustSheetView(face: face) }
        }
        .layoutDebugPanel()
        // The app is inherently dark (near-black faces); declare it so system
        // surfaces — Liquid Glass sheets, buttons — render in dark appearance
        // like the web's dark glass panels.
        .preferredColorScheme(.dark)
        .persistentSystemOverlays(.hidden)
        .contentShape(Rectangle())
        .onTapGesture { revealChrome() }
        .onAppear {
            scheduleHide()
            // Test hook: open the picker on launch for UI verification.
            if ProcessInfo.processInfo.arguments.contains("-openPicker") { pickerOpen = true }
        }
    }

    private var sheetOpen: Bool {
        pickerOpen || adjustOpen
    }

    /// Hybrid presentation: the system's floating Liquid Glass sheet where it
    /// actually floats (regular vertical size class — iPad), the custom bottom
    /// GlassSheet where the system would go full-screen (compact height —
    /// iPhone landscape).
    private var useSystemSheet: Bool { vSize == .regular }

    @ViewBuilder
    private func systemSheetContent(title: String,
                                    @ViewBuilder content: () -> some View) -> some View
    {
        VStack(spacing: 12) {
            Text(title).font(.headline)
            content()
        }
        .padding(.top, 20)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private func close(_ flag: Binding<Bool>) {
        withAnimation(.easeOut(duration: 0.25)) { flag.wrappedValue = false }
    }

    private var controlsBar: some View {
        HStack(spacing: 16) {
            chromeButton("clock", label: "Choose clock face") {
                withAnimation(.easeOut(duration: 0.25)) { pickerOpen = true }
            }
            chromeButton("slider.horizontal.3", label: "Adjust layout") {
                withAnimation(.easeOut(duration: 0.25)) { adjustOpen = true }
            }
        }
    }

    private func chromeButton(_ icon: String, label: String,
                              action: @escaping () -> Void) -> some View
    {
        Button(action: action) {
            SFIcon(icon).frame(width: 20, height: 20).padding(12)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .foregroundStyle(Color(white: 0.93))
        .accessibilityLabel(label)
    }

    private func revealChrome() {
        chromeVisible = true
        scheduleHide()
    }

    private func scheduleHide() {
        hideTask?.cancel()
        hideTask = Task {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            chromeVisible = false
        }
    }
}

// Fixed-frame previews at representative device sizes (ClockView's preview
// pattern) so centering is verifiable straight from the canvas.
#Preview("iPhone 16 Pro portrait") {
    RootFaceView().frame(width: 393, height: 852)
}

#Preview("iPhone 16 Pro landscape") {
    RootFaceView().frame(width: 852, height: 393)
}

#Preview("iPhone 16 Pro Max landscape") {
    RootFaceView().frame(width: 956, height: 440)
}

#Preview("iPad Pro 11\" landscape") {
    RootFaceView().frame(width: 1210, height: 834)
}

#Preview("DEBUG iPhone 16 Pro landscape") {
    RootFaceView()
        .frame(width: 852, height: 393)
        .environment(\.layoutDebug, true)
}
