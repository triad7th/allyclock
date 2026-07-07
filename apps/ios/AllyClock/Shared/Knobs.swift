import SwiftUI

/// Shared "knobs" design language — port of the web's `.knobs-*` classes
/// (see `fullscreen-toggles.component.scss` / `fullscreen-config.component.scss`
/// and `shared/ui/tokens.scss`). Settings and Adjustment both build their
/// panels out of these primitives so the two stay visually identical, like
/// their web counterparts.
enum Knobs {
    static let tint = Color(red: 0x0A / 255, green: 0x84 / 255, blue: 0xFF / 255) // $tint #0a84ff
    static let secondarySurface = Color(red: 118 / 255, green: 118 / 255, blue: 128 / 255)
        .opacity(0.24)
    static let secondaryLabel = Color(red: 0x98 / 255, green: 0x98 / 255,
                                      blue: 0x9E / 255) // #98989e
    static let card = Color.white.opacity(0.04)
}

/// Grouped card (web `.knobs-section`): dark rounded panel, uniform minimum
/// height so mixed content (toggles, segment, field) line up in the grid.
struct KnobCard<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            content()
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading)
        .background(Knobs.card, in: RoundedRectangle(cornerRadius: 12))
    }
}

/// Uppercase letterspaced section label (web `.knobs-section-label`).
struct KnobLabel: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11.5, weight: .semibold))
            .tracking(0.7)
            .foregroundStyle(Knobs.secondaryLabel)
    }
}

/// iOS-style pill switch with its label stacked above it (web `.knobs-toggle`
/// + `.knobs-section-label` in a `.knobs-cell`).
struct KnobToggle: View {
    let isOn: Bool
    let label: String
    let set: (Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            KnobLabel(label)
            Capsule().fill(isOn ? Knobs.tint : Knobs.secondarySurface)
                .frame(width: 44, height: 26)
                .overlay(alignment: .leading) {
                    Circle().fill(.white)
                        .frame(width: 20, height: 20)
                        .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                        .offset(x: isOn ? 21 : 3)
                }
                .animation(.easeInOut(duration: 0.2), value: isOn)
                .onTapGesture { set(!isOn) }
                .accessibilityLabel(label)
                .accessibilityAddTraits(.isButton)
                .accessibilityValue(isOn ? "on" : "off")
        }
    }
}

/// Segmented control (web `.knobs-segment`): equal-width buttons in a pill
/// track, selected segment tinted. `options` can't be `ForEach`-ed directly
/// (tuples aren't `Identifiable`), so callers pass an array and this view
/// iterates its indices.
struct KnobSegment<T: Hashable>: View {
    let options: [(value: T, label: String)]
    let selection: T
    let set: (T) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options.indices, id: \.self) { index in
                let option = options[index]
                let isOn = option.value == selection
                Button {
                    set(option.value)
                } label: {
                    Text(option.label)
                        .font(.system(size: 11.5, weight: .semibold))
                        .tracking(0.46)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .foregroundStyle(isOn ? Color.white : Knobs.secondaryLabel)
                        .background(
                            isOn ? Knobs.tint : Color.clear,
                            in: RoundedRectangle(cornerRadius: 7)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(Knobs.secondarySurface, in: RoundedRectangle(cornerRadius: 9))
        .animation(.easeInOut(duration: 0.15), value: selection)
    }
}

/// Full-width value row (web `.knobs-tz`), used for the Time Zone field.
struct KnobField<Content: View>: View {
    let action: () -> Void
    @ViewBuilder var content: () -> Content

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                content()
            }
            .font(.system(size: 14.5))
            .foregroundStyle(Knobs.tint)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
            .padding(.horizontal, 11)
            .background(Knobs.secondarySurface, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

/// Port of the web's container-query breakpoints for the knobs grid
/// (`@container (min-width: 600px|900px)`).
func knobColumns(for width: CGFloat) -> Int {
    width >= 900 ? 3 : width >= 600 ? 2 : 1
}
