import AllyClockCore
import SwiftUI

/// Settings panel for the Fullscreen face — port of the web's
/// `fullscreen-toggles.component`, opened from the face's gear. Toggles and
/// the bar mode broadcast to every band ("applies to all"); the zone row
/// pushes into the shared zone picker. Applies live, accepts on any
/// dismissal (GlassSheet rule). Styled on the shared `Knobs` components so
/// it matches the web's grouped-card design exactly.
struct FullscreenSettingsView: View {
    let store: FullscreenConfigStore

    @State private var zonePickerOpen = false
    /// Grid width. Seeded from the host's known width so the FIRST layout
    /// pass already uses the right column count — an unseeded 0 renders one
    /// column (4 stacked cards, taller than a landscape screen) for a frame,
    /// and inside the sheet-open animation that snap reads as the clock
    /// jumping behind the glass. `onGeometryChange` keeps it exact after.
    @State private var width: CGFloat

    /// Screen height the hosting sheet can occupy; bounds the zone-picker
    /// list so the panel never exceeds the screen (0 = preview fallback).
    private let availableHeight: CGFloat

    init(store: FullscreenConfigStore, initialWidth: CGFloat = 0, availableHeight: CGFloat = 0) {
        self.store = store
        self.availableHeight = availableHeight
        _width = State(initialValue: initialWidth)
    }

    /// List height that keeps the whole panel (grabber + title + search +
    /// list) on screen: sheet chrome is ~140pt around the list.
    private var listHeight: CGFloat {
        availableHeight > 0 ? max(160, min(320, availableHeight - 140)) : 280
    }

    /// Built once per presentation: "Follow System" + the IANA catalog (the
    /// web prepends the same synthetic '' entry; its label mentions the Time
    /// Machine, which iOS doesn't have).
    @State private var zoneOptions: [TimeZoneOption] =
        [TimeZoneOption(id: "", label: "Follow System", offset: -100_000)]
            + ZoneCatalog.buildOptions()

    private static let barModes: [(value: BarMode, label: String)] =
        [(.off, "Off"), (.divider, "Divider"), (.progress, "Progress")]

    var body: some View {
        let fields = store.sample()
        if zonePickerOpen {
            // No Cancel control: the sheet's X is the cancel (web parity
            // dropped by design); picking pops back to the toggles.
            ZonePickerView(options: zoneOptions, selectedId: fields.timeZone,
                           listHeight: listHeight)
            { id in
                store.setTimeZoneAll(id)
                withAnimation(.easeOut(duration: 0.25)) { zonePickerOpen = false }
            }
            .padding(.horizontal, 24)
        } else {
            LazyVGrid(
                columns: Array(
                    repeating: GridItem(.flexible(), spacing: 16), count: knobColumns(for: width)
                ),
                spacing: 16
            ) {
                KnobCard {
                    HStack(spacing: 16) {
                        KnobToggle(isOn: fields.secondsVisible, label: "Seconds") {
                            store.setSecondsVisibleAll($0)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        KnobToggle(isOn: fields.sections.weekday.visible, label: "Weekday") {
                            store.setSectionVisibleAll(.weekday, $0)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                KnobCard {
                    HStack(spacing: 16) {
                        KnobToggle(isOn: fields.zoneVisible, label: "Zone") {
                            store.setZoneVisibleAll($0)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        KnobToggle(isOn: fields.sections.gmt.visible, label: "GMT") {
                            store.setSectionVisibleAll(.gmt, $0)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        KnobToggle(isOn: fields.flagVisible, label: "Flag") {
                            store.setFlagVisibleAll($0)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                KnobCard {
                    KnobLabel("Bar")
                    KnobSegment(options: Self.barModes, selection: fields.bar.mode) {
                        store.setBarModeAll($0)
                    }
                }
                KnobCard {
                    KnobLabel("Time Zone")
                    KnobField {
                        withAnimation(.easeOut(duration: 0.25)) { zonePickerOpen = true }
                    } content: {
                        FlagView(zone: fields.timeZone)
                            .frame(width: 21, height: 21)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                        Text(currentZoneLabel(fields.timeZone)).lineLimit(1)
                    }
                }
            }
            .padding(.horizontal, 24)
            .onGeometryChange(for: CGFloat.self, of: { $0.size.width }, action: { width = $0 })
        }
    }

    private func currentZoneLabel(_ timeZone: String) -> String {
        zoneOptions.first { $0.id == timeZone }?.label ?? timeZone
    }
}

#Preview("Fullscreen settings") {
    FullscreenSettingsView(store: FullscreenConfigStore(registry: DimensionRegistry()))
        .padding(.vertical, 24)
        .background(Color.black)
        .preferredColorScheme(.dark)
}
