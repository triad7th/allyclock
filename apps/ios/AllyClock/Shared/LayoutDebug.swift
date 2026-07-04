import SwiftUI

/// Layout debug mode: draws border guidelines around the important layout
/// elements and overlays the critical numbers (element frames, gaps, and
/// centering deltas).
///
/// Enable with the `-layoutDebug` launch argument (Scheme ▸ Run ▸ Arguments,
/// or `simctl launch … -layoutDebug`), or per-preview with
/// `.environment(\.layoutDebug, true)` — environment-scoped, so it never
/// leaks into other previews.
private struct LayoutDebugKey: EnvironmentKey {
    static let defaultValue = ProcessInfo.processInfo.arguments.contains("-layoutDebug")
}

extension EnvironmentValues {
    var layoutDebug: Bool {
        get { self[LayoutDebugKey.self] }
        set { self[LayoutDebugKey.self] = newValue }
    }
}

/// Frames of tagged elements in the global coordinate space.
struct DebugFramesKey: PreferenceKey {
    static let defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}

/// Scalar layout numbers ("timeSize", "gapUnit", …) reported by views.
struct DebugNumbersKey: PreferenceKey {
    static let defaultValue: [String: String] = [:]
    static func reduce(value: inout [String: String], nextValue: () -> [String: String]) {
        value.merge(nextValue()) { $1 }
    }
}

extension View {
    /// Border guideline + size tag for one layout element; reports its global
    /// frame to the debug panel.
    func debugFrame(_ label: String, _ color: Color) -> some View {
        modifier(DebugFrameModifier(label: label, color: color))
    }

    /// Merge scalar layout numbers into the debug panel.
    func debugNumbers(_ numbers: [String: String]) -> some View {
        modifier(DebugNumbersModifier(numbers: numbers))
    }

    /// Overlay the two debug panels (frames + deltas top-leading, scalar
    /// numbers top-trailing). Apply at the root that should aggregate them.
    func layoutDebugPanel() -> some View {
        modifier(LayoutDebugPanelModifier())
    }
}

private struct DebugFrameModifier: ViewModifier {
    @Environment(\.layoutDebug) private var enabled
    let label: String
    let color: Color

    func body(content: Content) -> some View {
        if enabled {
            content.overlay(
                GeometryReader { g in
                    let f = g.frame(in: .global)
                    Rectangle().strokeBorder(color.opacity(0.9), lineWidth: 1)
                        .overlay(alignment: .topLeading) {
                            Text("\(label) \(Int(f.width))×\(Int(f.height)) y\(Int(f.minY))")
                                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                .foregroundStyle(color)
                                .padding(.horizontal, 2)
                                .background(Color.black.opacity(0.6))
                                .fixedSize()
                        }
                        .preference(key: DebugFramesKey.self, value: [label: f])
                }
                .allowsHitTesting(false)
            )
        } else {
            content
        }
    }
}

private struct DebugNumbersModifier: ViewModifier {
    @Environment(\.layoutDebug) private var enabled
    let numbers: [String: String]

    func body(content: Content) -> some View {
        if enabled {
            content.transformPreference(DebugNumbersKey.self) { $0.merge(numbers) { $1 } }
        } else {
            content
        }
    }
}

private struct LayoutDebugPanelModifier: ViewModifier {
    @Environment(\.layoutDebug) private var enabled

    func body(content: Content) -> some View {
        if enabled {
            content
                .overlayPreferenceValue(DebugFramesKey.self) { frames in
                    DebugFramesPanel(frames: frames)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .allowsHitTesting(false)
                }
                .overlayPreferenceValue(DebugNumbersKey.self) { numbers in
                    DebugNumbersPanel(numbers: numbers)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                        .allowsHitTesting(false)
                }
        } else {
            content
        }
    }
}

/// Frames, letterbox gaps, and centering deltas. "Δclock"/"Δdigits" are the
/// distance of that element's vertical center from the host's center —
/// positive = below center, negative = above (the "shifted up" number).
struct DebugFramesPanel: View {
    let frames: [String: CGRect]

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            if let host = frames["host"] {
                row("host", "\(Int(host.width))×\(Int(host.height)) mid y\(Int(host.midY))")
                if let clock = frames["clock"] {
                    row(
                        "clock",
                        "\(Int(clock.width))×\(Int(clock.height)) y\(Int(clock.minY))–\(Int(clock.maxY))"
                    )
                    row("topGap", String(format: "%.1f", clock.minY - host.minY))
                    row("botGap", String(format: "%.1f", host.maxY - clock.maxY))
                    row("Δclock", String(format: "%+.1f", clock.midY - host.midY))
                }
                if let digits = frames["digits"] {
                    row("Δdigits", String(format: "%+.1f", digits.midY - host.midY))
                }
            }
            ForEach(frames.keys.sorted(), id: \.self) { key in
                if let f = frames[key], key != "host" {
                    row(key, "y\(Int(f.minY)) h\(Int(f.height))")
                }
            }
        }
        .font(.system(size: 10, design: .monospaced))
        .foregroundStyle(.green)
        .padding(4)
        .background(Color.black.opacity(0.65))
        .padding(.top, 24)
    }

    private func row(_ k: String, _ v: String) -> some View {
        Text("\(k): \(v)")
    }
}

/// Scalar numbers reported via `debugNumbers` (font sizes, gaps, fit…).
struct DebugNumbersPanel: View {
    let numbers: [String: String]

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            ForEach(numbers.keys.sorted(), id: \.self) { key in
                Text("\(key): \(numbers[key] ?? "")")
            }
        }
        .font(.system(size: 10, design: .monospaced))
        .foregroundStyle(.yellow)
        .padding(4)
        .background(Color.black.opacity(0.65))
        .padding(.top, 24)
    }
}
