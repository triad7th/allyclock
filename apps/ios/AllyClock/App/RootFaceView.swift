import AlloyUI
import AllyClockCore
import SwiftUI

/// App root: hosts the active face full-bleed with an auto-hiding controls bar
/// (Configure + Adjust), mirroring the web app shell.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @State private var pickerOpen = false
    @State private var adjustOpen = false
    @State private var settingsOpen = false
    @State private var autoHide = AutoHideModel()

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
                    .opacity(autoHide.visible && !sheetOpen ? 1 : 0)
                    .animation(.easeInOut(duration: 0.3), value: autoHide.visible)

                if face == .fullscreen || face == .worldCards {
                    GlassIconButton(icon: "gearshape", label: "Display options") {
                        settingsOpen = true
                    }
                    .debugFrame("gear", .mint)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, max(16, hInset))
                    .padding(.bottom, 16)
                    .opacity(autoHide.visible && !sheetOpen ? 1 : 0)
                    .animation(.easeInOut(duration: 0.3), value: autoHide.visible)
                }

                // Web-style glass sheets: content-hugging bottom panels over
                // the face on every device (the stock system sheet was tried
                // and rejected: full-screen cover on iPhone landscape, and the
                // iPad floating panel didn't fit the app's look).
                if pickerOpen {
                    GlassSheet(title: "Faces", hInset: hInset, onClosed: { pickerOpen = false }) { dismiss in
                        FacePickerView(
                            selection: Binding(get: { face }, set: { selectedRaw = $0.rawValue }),
                            fullscreenStore: fullscreenStore,
                            worldCardsStore: worldCardsStore,
                            onSelect: { dismiss() }
                        )
                    }
                    .zIndex(1)
                }
                if adjustOpen {
                    GlassSheet(title: "Adjustment", hInset: hInset,
                               onClosed: { adjustOpen = false })
                    { _ in
                        AdjustSheetView(face: face, fullscreenStore: fullscreenStore,
                                        worldCardsStore: worldCardsStore,
                                        registry: registry, ratio: ratio,
                                        availableWidth: sheetWidth)
                    }
                    .zIndex(1)
                }
                if settingsOpen {
                    GlassSheet(title: "Settings", hInset: hInset,
                               onClosed: { settingsOpen = false })
                    { _ in
                        switch face {
                        case .fullscreen:
                            FullscreenSettingsView(store: fullscreenStore, initialWidth: sheetWidth,
                                                   availableHeight: fullHeight)
                        case .worldCards:
                            WorldCardsSettingsView(store: worldCardsStore, initialWidth: sheetWidth,
                                                   availableHeight: fullHeight)
                        }
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
        .onTapGesture { autoHide.reveal() }
        .onAppear {
            autoHide.scheduleHide()
            // Test hook: open the picker on launch for UI verification.
            if ProcessInfo.processInfo.arguments.contains("-openPicker") { pickerOpen = true }
            if ProcessInfo.processInfo.arguments.contains("-openAdjust") { adjustOpen = true }
            if ProcessInfo.processInfo.arguments.contains("-openSettings") { settingsOpen = true }
        }
        .onChange(of: sheetOpen) { autoHide.setHold(sheetOpen) }
    }

    private var sheetOpen: Bool {
        pickerOpen || adjustOpen || settingsOpen
    }

    private var controlsBar: some View {
        HStack(spacing: 16) {
            GlassIconButton(icon: "clock", label: "Choose clock face") {
                pickerOpen = true
            }
            GlassIconButton(icon: "slider.horizontal.3", label: "Adjust layout") {
                adjustOpen = true
            }
        }
    }
}

// Dimensions come from the canvas device picker, not fixed frames.
#Preview("RootFaceView") {
    RootFaceView()
}

#Preview("Layout debug") {
    RootFaceView()
        .environment(\.layoutDebug, true)
}
