import AllyClockCore
import SwiftUI

/// App root: hosts the active face full-bleed with an auto-hiding controls bar
/// (Configure + Adjust), mirroring the web app shell.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @State private var pickerOpen = false
    @State private var adjustOpen = false
    @State private var settingsOpen = false
    @State private var chromeVisible = true
    @State private var hideTask: Task<Void, Never>?

    private let registry: DimensionRegistry
    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        registry = reg
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
            // Full-bleed ratio: `outer` reads the safe-area frame, but the face
            // fills the whole screen (the ZStack ignores the safe area), so add
            // the insets back to match the ratio the face itself resolves.
            let fullWidth = outer.size.width
                + outer.safeAreaInsets.leading + outer.safeAreaInsets.trailing
            let fullHeight = outer.size.height
                + outer.safeAreaInsets.top + outer.safeAreaInsets.bottom
            let ratio = fullWidth / max(fullHeight, 1)
            // Width the glass-sheet panels lay out in (the sheet pads by
            // hInset per side) — seeds their grids so the first frame of the
            // open animation already has the final column count.
            let sheetWidth = fullWidth - 2 * hInset
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

                if face == .fullscreen {
                    GlassIconButton(icon: "gearshape", label: "Display options") {
                        withAnimation(.easeOut(duration: 0.25)) { settingsOpen = true }
                    }
                    .debugFrame("gear", .mint)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, max(16, hInset))
                    .padding(.bottom, 16)
                    .opacity(chromeVisible && !sheetOpen ? 1 : 0)
                    .animation(.easeInOut(duration: 0.3), value: chromeVisible)
                }

                // Web-style glass sheets: content-hugging bottom panels over
                // the face on every device (the stock system sheet was tried
                // and rejected: full-screen cover on iPhone landscape, and the
                // iPad floating panel didn't fit the app's look).
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
                    GlassSheet(title: "Adjustment", hInset: hInset,
                               onClose: { close($adjustOpen) })
                    {
                        AdjustSheetView(face: face, fullscreenStore: fullscreenStore,
                                        registry: registry, ratio: ratio,
                                        availableWidth: sheetWidth)
                    }
                    .zIndex(1)
                }
                if settingsOpen {
                    GlassSheet(title: "Settings", hInset: hInset,
                               onClose: { close($settingsOpen) })
                    {
                        FullscreenSettingsView(store: fullscreenStore, initialWidth: sheetWidth)
                    }
                    .zIndex(1)
                }
            }
            .ignoresSafeArea()
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
            if ProcessInfo.processInfo.arguments.contains("-openAdjust") { adjustOpen = true }
            if ProcessInfo.processInfo.arguments.contains("-openSettings") { settingsOpen = true }
        }
    }

    private var sheetOpen: Bool {
        pickerOpen || adjustOpen || settingsOpen
    }

    private func close(_ flag: Binding<Bool>) {
        withAnimation(.easeOut(duration: 0.25)) { flag.wrappedValue = false }
    }

    private var controlsBar: some View {
        HStack(spacing: 16) {
            GlassIconButton(icon: "clock", label: "Choose clock face") {
                withAnimation(.easeOut(duration: 0.25)) { pickerOpen = true }
            }
            GlassIconButton(icon: "slider.horizontal.3", label: "Adjust layout") {
                withAnimation(.easeOut(duration: 0.25)) { adjustOpen = true }
            }
        }
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
