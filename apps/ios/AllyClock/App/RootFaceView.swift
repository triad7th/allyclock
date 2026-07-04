import SwiftUI
import AllyClockCore

/// App root: hosts the active face full-bleed with an auto-hiding controls bar
/// (Configure + Adjust), mirroring the web app shell.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @State private var pickerOpen = false
    @State private var adjustOpen = false
    @State private var chromeVisible = true
    @State private var hideTask: DispatchWorkItem?

    private let fullscreenStore: FullscreenConfigStore
    private let worldCardsStore: WorldCardsConfigStore

    init() {
        let reg = DimensionRegistry()
        fullscreenStore = FullscreenConfigStore(registry: reg)
        worldCardsStore = WorldCardsConfigStore(registry: reg)
    }

    private var face: FaceKind { FaceKind(rawValue: selectedRaw) ?? .fullscreen }

    var body: some View {
        ZStack(alignment: .bottom) {
            switch face {
            case .fullscreen: FullscreenFaceView(store: fullscreenStore)
            case .worldCards: WorldCardsFaceView(store: worldCardsStore)
            }

            controlsBar
                .padding(.bottom, 8)
                .opacity(chromeVisible ? 1 : 0)
                .animation(.easeInOut(duration: 0.3), value: chromeVisible)
        }
        .contentShape(Rectangle())
        .onTapGesture { revealChrome() }
        .onAppear { scheduleHide() }
        .sheet(isPresented: $pickerOpen) {
            FacePickerView(
                selection: Binding(get: { face }, set: { selectedRaw = $0.rawValue }),
                fullscreenStore: fullscreenStore,
                worldCardsStore: worldCardsStore
            )
        }
        .sheet(isPresented: $adjustOpen) { AdjustSheetView(face: face) }
    }

    private var controlsBar: some View {
        HStack(spacing: 16) {
            chromeButton("clock", label: "Choose clock face") { pickerOpen = true; revealChrome() }
            chromeButton("slider.horizontal.3", label: "Adjust layout") { adjustOpen = true; revealChrome() }
        }
    }

    private func chromeButton(_ icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            SFIcon(icon).frame(width: 20, height: 20).padding(12)
        }
        .foregroundStyle(Color(white: 0.93))
        .background(Circle().fill(Color(white: 0.12, opacity: 0.85)))
        .overlay(Circle().stroke(Color.white.opacity(0.2)))
        .accessibilityLabel(label)
    }

    private func revealChrome() {
        chromeVisible = true
        scheduleHide()
    }
    private func scheduleHide() {
        hideTask?.cancel()
        let task = DispatchWorkItem { chromeVisible = false }
        hideTask = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: task)
    }
}
