import SwiftUI

/// Adjust panel for the active face. The web exposes per-face layout controls
/// (size/weight sliders, section toggles, zone picker) here; the live-editing
/// surface is the next build (it requires the config stores to become mutable
/// and observable). This interim panel wires the button into the web-matching
/// controls bar and names what each face will expose.
struct AdjustSheetView: View {
    let face: FaceKind

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(face.displayName)
                .font(.subheadline.weight(.semibold))
            Text("Live layout editing for this face is coming next.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(plannedControls, id: \.self) { item in
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

    private var plannedControls: [String] {
        switch face {
        case .fullscreen:
            return [
                "Time size & weight",
                "Seconds & AM/PM",
                "Progress bar",
                "Weekday · zone · GMT · flag",
                "Time zone",
            ]
        case .worldCards:
            return ["Add & remove cities", "Card size", "Row breaks", "Seconds & date detail"]
        }
    }
}
