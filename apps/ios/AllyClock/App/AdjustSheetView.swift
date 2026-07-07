import AllyClockCore
import SwiftUI

/// Adjust panel for the active face. Fullscreen gets the web's Adjustment
/// panel (`fullscreen-config.component`): Time and Date size sliders editing
/// the band resolved from the live face ratio. World Cards still lists its
/// planned controls until its own panel is ported.
struct AdjustSheetView: View {
    let face: FaceKind
    let fullscreenStore: FullscreenConfigStore
    let registry: DimensionRegistry
    let ratio: Double

    var body: some View {
        switch face {
        case .fullscreen:
            FullscreenAdjustView(store: fullscreenStore, registry: registry, ratio: ratio)
        case .worldCards:
            VStack(alignment: .leading, spacing: 12) {
                Text(face.displayName)
                    .font(.subheadline.weight(.semibold))
                Text("Live layout editing for this face is coming next.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(
                        ["Add & remove cities", "Card size", "Row breaks", "Seconds & date detail"],
                        id: \.self
                    ) { item in
                        Label(item, systemImage: "slider.horizontal.3")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
        }
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

    @State private var width: CGFloat = 0

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
                sliderRow(fields.sections.time.sizeScale) { value in
                    store.updateSection(bandId, .time) { var s = $0
                        s.sizeScale = value
                        return s
                    }
                }
            }
            KnobCard {
                KnobLabel("Date")
                sliderRow(fields.sections.month.sizeScale) { value in
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

    private func sliderRow(_ value: Double, set: @escaping (Double) -> Void) -> some View {
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
