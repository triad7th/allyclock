import SwiftUI
import AllyClockCore

/// App root: hosts the active face full-bleed with an auto-hiding picker button.
struct RootFaceView: View {
    @AppStorage("allyclock.selectedFace") private var selectedRaw = FaceKind.fullscreen.rawValue
    @State private var pickerOpen = false
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
        ZStack(alignment: .bottomLeading) {
            switch face {
            case .fullscreen: FullscreenFaceView(store: fullscreenStore)
            case .worldCards: WorldCardsFaceView(store: worldCardsStore)
            }

            Button { pickerOpen = true } label: {
                SFIcon("square.grid.2x2").frame(width: 22, height: 22).padding(11)
            }
            .foregroundStyle(Color(white: 0.93))
            .background(Circle().fill(Color(white: 0.12, opacity: 0.85)))
            .overlay(Circle().stroke(Color.white.opacity(0.2)))
            .padding(.leading, 16).padding(.bottom, 24)
            .opacity(chromeVisible ? 1 : 0)
            .animation(.easeInOut(duration: 0.3), value: chromeVisible)
        }
        .contentShape(Rectangle())
        .onTapGesture { revealChrome() }
        .onAppear { scheduleHide() }
        .sheet(isPresented: $pickerOpen) { FacePickerView(selection: Binding(
            get: { face }, set: { selectedRaw = $0.rawValue })) }
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
