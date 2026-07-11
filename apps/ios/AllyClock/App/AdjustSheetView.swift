import AlloyUI
import AllyClockCore
import SwiftUI

/// Adjust panel for the active face. Fullscreen and World Cards each get the
/// web's Adjustment panel: Time and Date size sliders editing the band
/// resolved from the live face ratio.
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
                KnobSlider(
                    label: "Time",
                    value: Binding(get: { fields.sizes.time },
                                   set: { store.setSize(bandId, key: \.time, value: $0) }),
                    in: 0.5 ... 2.0, step: 0.05,
                    display: String(format: "%.2f", fields.sizes.time)
                )
            }
            KnobCard {
                KnobSlider(
                    label: "Date",
                    value: Binding(get: { fields.sizes.date },
                                   set: { store.setSize(bandId, key: \.date, value: $0) }),
                    in: 0.5 ... 2.0, step: 0.05,
                    display: String(format: "%.2f", fields.sizes.date)
                )
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
                KnobSlider(
                    label: "Time",
                    value: Binding(get: { fields.sections.time.sizeScale },
                                   set: { value in
                                       store.updateSection(bandId, .time) { var s = $0
                                           s.sizeScale = value
                                           return s
                                       }
                                   }),
                    in: 0.5 ... 2.0, step: 0.05,
                    display: String(format: "%.2f", fields.sections.time.sizeScale)
                )
            }
            KnobCard {
                KnobSlider(
                    label: "Date",
                    value: Binding(get: { fields.sections.month.sizeScale },
                                   set: { value in
                                       for key in SectionKey.dateKeys {
                                           store.updateSection(bandId, key) { var s = $0
                                               s.sizeScale = value
                                               return s
                                           }
                                       }
                                   }),
                    in: 0.5 ... 2.0, step: 0.05,
                    display: String(format: "%.2f", fields.sections.month.sizeScale)
                )
            }
        }
        .padding(.horizontal, 24)
        .onGeometryChange(for: CGFloat.self, of: { $0.size.width }, action: { width = $0 })
    }
}
