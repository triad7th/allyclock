import SwiftUI
import UIKit

@main
struct AllyClockApp: App {
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    updateIdleTimer(for: scenePhase)
                }
        }
        .onChange(of: scenePhase) { newPhase in
            updateIdleTimer(for: newPhase)
        }
    }

    private func updateIdleTimer(for phase: ScenePhase) {
        UIApplication.shared.isIdleTimerDisabled = phase == .active
    }
}
