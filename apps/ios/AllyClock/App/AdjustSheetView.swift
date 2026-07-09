import AllyClockCore
import AlloyUI
import SwiftUI

/// Adjust panel for the active face. Fullscreen and World Cards each get the
/// web's Adjustment panel: Time and Date size sliders editing the band
/// resolved from the live face ratio. each face gets its web Adjustment panel.
struct AdjustSheetView: View {
    let face: FaceKind
    let fullscreenStore: FullscreenConfigStore
    let worldCardsStore: WorldCardsConfigStore
    let registry: DimensionRegistry
    let ratio: Double
    let availableWidth: CGFloat

    var body: some View {
        switch face {
        case .fullscreen:
            FullscreenAdjustView(store: fullscreenStore, registry: registry, ratio: ratio,
                                 initialWidth: availableWidth)
        case .worldCards:
            WorldCardsAdjustView(store: worldCardsStore, registry: registry, ratio: ratio,
                                 initialWidth: availableWidth)
        }
    }
}

/// One knobs slider row: 0.5–2.0 step 0.05 with the web's %.2f readout.
private struct AdjustSliderRow: View {
    let value: Double
    let set: (Double) -> Void

    var body: some View {
        HStack(spacing: 10) {
            Slider(value: Binding(get: { value }, set: set), in: 0.5 ... 2.0, step: 0.05)
                .tint(Knobs.tint)
            Text(String(format: "%.2f", value))
                .font(.system(size: 11.5))
                .monospacedDigit()
                .foregroundStyle(.white)
                .frame(width: 38, alignment: .trailing)
        }
    }
}

/// Time + Date size sliders for World Cards, per dimension band. Range/step
/// and the %.2f readout match the web (`world-cards-config.component`).
struct WorldCardsAdjustView: View {
    let store: WorldCardsConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    @State private var width: CGFloat

    init(store: WorldCardsConfigStore, registry: DimensionRegistry, ratio: Double,
         initialWidth: CGFloat = 0)
    {
        self.store = store
        self.registry = registry
        self.ratio = ratio
        _width = State(initialValue: initialWidth)
    }

    private var bandId: String { registry.resolveForRatio(ratio).id }

    var body: some View {
        let fields = store.config(bandId)
        LazyVGrid(
            columns: Array(
                repeating: GridItem(.flexible(), spacing: 16), count: knobColumns(for: width)
            ),
            spacing: 16
        ) {
            KnobCard {
                KnobLabel("Time")
                AdjustSliderRow(value: fields.sizes.time) { value in
                    store.setSize(bandId, key: \.time, value: value)
                }
            }
            KnobCard {
                KnobLabel("Date")
                AdjustSliderRow(value: fields.sizes.date) { value in
                    store.setSize(bandId, key: \.date, value: value)
                }
            }
        }
        .padding(.horizontal, 24)
        .onGeometryChange(for: CGFloat.self, of: { $0.size.width }, action: { width = $0 })
    }
}

/// Time + Date size sliders, per dimension band. The Date slider broadcasts
/// one value to all four date sections, like the web's `onDateSize`. Slider
/// range/step and the `%.2f` readout match the web knobs exactly. Styled on
/// the shared `Knobs` card language (web `fullscreen-config.component`).
struct FullscreenAdjustView: View {
    let store: FullscreenConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    /// Seeded like FullscreenSettingsView's grid width: the first layout pass
    /// must not run at width 0 (one-column snap during the sheet animation).
    @State private var width: CGFloat

    init(store: FullscreenConfigStore, registry: DimensionRegistry, ratio: Double,
         initialWidth: CGFloat = 0)
    {
        self.store = store
        self.registry = registry
        self.ratio = ratio
        _width = State(initialValue: initialWidth)
    }

    private var bandId: String {
        registry.resolveForRatio(ratio).id
    }

    var body: some View {
        let fields = store.config(bandId)
        LazyVGrid(
            columns: Array(
                repeating: GridItem(.flexible(), spacing: 16), count: knobColumns(for: width)
            ),
            spacing: 16
        ) {
            KnobCard {
                KnobLabel("Time")
                AdjustSliderRow(value: fields.sections.time.sizeScale) { value in
                    store.updateSection(bandId, .time) { var s = $0
                        s.sizeScale = value
                        return s
                    }
                }
            }
            KnobCard {
                KnobLabel("Date")
                AdjustSliderRow(value: fields.sections.month.sizeScale) { value in
                    for key in SectionKey.dateKeys {
                        store.updateSection(bandId, key) { var s = $0
                            s.sizeScale = value
                            return s
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 24)
        .onGeometryChange(for: CGFloat.self, of: { $0.size.width }, action: { width = $0 })
    }
}
