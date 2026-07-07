import AllyClockCore
import SwiftUI

/// Searchable zone list: a search field over a scrollable, filtered list.
/// Live-apply on tap (calls `onPick` immediately — no draft/commit). Hosts
/// supply the options (incl. any synthetic leading entry like "Follow
/// System") and the selected id, and place this inside their own sheet with
/// a back/cancel control. Port of `zone-picker.component`.
struct ZonePickerView: View {
    let options: [TimeZoneOption]
    let selectedId: String
    let onPick: (String) -> Void

    @State private var query = ""

    private var filtered: [TimeZoneOption] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return q.isEmpty ? options : options.filter { $0.label.lowercased().contains(q) }
    }

    var body: some View {
        VStack(spacing: 8) {
            TextField("Search time zone", text: $query)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .accessibilityLabel("Search time zone")
            ScrollView {
                LazyVStack(spacing: 2) {
                    ForEach(filtered, id: \.id) { zone in
                        row(zone)
                    }
                    if filtered.isEmpty {
                        Text("No matching time zone")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .padding(.top, 12)
                    }
                }
            }
            .frame(height: 280)
        }
    }

    private func row(_ zone: TimeZoneOption) -> some View {
        Button { onPick(zone.id) } label: {
            HStack(spacing: 10) {
                FlagView(zone: zone.id).frame(width: 18, height: 18)
                Text(zone.label).font(.subheadline).lineLimit(1)
                Spacer(minLength: 0)
                if zone.id == selectedId {
                    SFIcon("checkmark").frame(width: 14, height: 14)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
            .background(
                zone.id == selectedId ? Color.white.opacity(0.12) : .clear,
                in: RoundedRectangle(cornerRadius: 8)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview("Zone picker") {
    ZonePickerView(
        options: [TimeZoneOption(id: "", label: "Follow System", offset: -100_000)]
            + ZoneCatalog.buildOptions(),
        selectedId: ""
    ) { _ in }
    .padding(24)
    .background(Color.black)
    .preferredColorScheme(.dark)
}
