import AllyClockCore
import SwiftUI

/// Settings panel for the Fullscreen face — port of the web's
/// `fullscreen-toggles.component`, opened from the face's gear. Toggles and
/// the bar mode broadcast to every band ("applies to all"); the zone row
/// pushes into the shared zone picker. Applies live, accepts on any
/// dismissal (GlassSheet rule).
struct FullscreenSettingsView: View {
    let store: FullscreenConfigStore

    @State private var zonePickerOpen = false
    // Built once per presentation: "Follow System" + the IANA catalog (the
    // web prepends the same synthetic '' entry; its label mentions the Time
    // Machine, which iOS doesn't have).
    @State private var zoneOptions: [TimeZoneOption] =
        [TimeZoneOption(id: "", label: "Follow System", offset: -100_000)]
            + ZoneCatalog.buildOptions()

    var body: some View {
        let fields = store.sample()
        if zonePickerOpen {
            VStack(spacing: 12) {
                ZonePickerView(options: zoneOptions, selectedId: fields.timeZone) { id in
                    store.setTimeZoneAll(id)
                    zonePickerOpen = false
                }
                Button("Cancel") { zonePickerOpen = false }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 24)
        } else {
            VStack(spacing: 20) {
                HStack(spacing: 24) {
                    toggleCell("Seconds", isOn: fields.secondsVisible) {
                        store.setSecondsVisibleAll($0)
                    }
                    toggleCell("Weekday", isOn: fields.sections.weekday.visible) {
                        store.setSectionVisibleAll(.weekday, $0)
                    }
                }
                HStack(spacing: 24) {
                    toggleCell("Zone", isOn: fields.zoneVisible) { store.setZoneVisibleAll($0) }
                    toggleCell("GMT", isOn: fields.sections.gmt.visible) {
                        store.setSectionVisibleAll(.gmt, $0)
                    }
                    toggleCell("Flag", isOn: fields.flagVisible) { store.setFlagVisibleAll($0) }
                }
                barRow(fields.bar.mode)
                zoneRow(fields.timeZone)
            }
            .padding(.horizontal, 24)
        }
    }

    private func toggleCell(_ label: String, isOn: Bool,
                            set: @escaping (Bool) -> Void) -> some View
    {
        Toggle(label, isOn: Binding(get: { isOn }, set: set))
            .font(.subheadline)
            .toggleStyle(.switch)
    }

    private func barRow(_ mode: BarMode) -> some View {
        HStack(spacing: 12) {
            Text("Bar")
                .font(.subheadline)
                .frame(width: 48, alignment: .leading)
            Picker("Bar mode", selection: Binding(get: { mode },
                                                  set: { store.setBarModeAll($0) }))
            {
                Text("Off").tag(BarMode.off)
                Text("Divider").tag(BarMode.divider)
                Text("Progress").tag(BarMode.progress)
            }
            .pickerStyle(.segmented)
        }
    }

    private func zoneRow(_ timeZone: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Time Zone")
                .font(.subheadline)
            Button { zonePickerOpen = true } label: {
                HStack(spacing: 10) {
                    FlagView(zone: timeZone).frame(width: 18, height: 18)
                    Text(zoneOptions.first { $0.id == timeZone }?.label ?? timeZone)
                        .font(.subheadline)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    SFIcon("chevron.right").frame(width: 12, height: 12)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Time Zone")
        }
    }
}

#Preview("Fullscreen settings") {
    FullscreenSettingsView(store: FullscreenConfigStore(registry: DimensionRegistry()))
        .padding(.vertical, 24)
        .background(Color.black)
        .preferredColorScheme(.dark)
}
