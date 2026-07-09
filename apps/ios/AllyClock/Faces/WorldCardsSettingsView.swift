import AllyClockCore
import AlloyTime
import AlloyUI
import SwiftUI

/// Settings panel for World Cards: the web's Cities manager
/// (`world-cards-settings.component`). One row per card — zone button
/// (flag + abbreviated city, opens the zone picker), Break toggle, remove ✕ —
/// plus Add City. Applies live; the store guards MIN/MAX card counts.
struct WorldCardsSettingsView: View {
    let store: WorldCardsConfigStore
    var initialWidth: CGFloat = 0
    var availableHeight: CGFloat = 0

    @State private var editingCardId: Int?

    /// List height that keeps the whole panel (grabber + title + search +
    /// list) on screen: sheet chrome is ~140pt around the list (matches
    /// FullscreenSettingsView's derivation).
    private var listHeight: CGFloat {
        availableHeight > 0 ? max(160, min(320, availableHeight - 140)) : 280
    }

    /// Built once per presentation: "Follow System" + the IANA catalog (the
    /// web prepends the same synthetic '' entry via `buildSpecialZones`).
    @State private var zoneOptions: [TimeZoneOption] =
        ZoneCatalog.buildSpecialZones() + ZoneCatalog.buildOptions()

    var body: some View {
        let cards = store.sample().cards
        if let id = editingCardId, let card = cards.first(where: { $0.id == id }) {
            // Zone picker replaces the panel content (Fullscreen pattern):
            // no Cancel control — the sheet's X is the cancel; picking pops
            // back to the list.
            ZonePickerView(options: zoneOptions, selectedId: card.zone,
                           listHeight: listHeight)
            { zone in
                store.setCardZone(id: id, zone: zone)
                withAnimation(.easeOut(duration: 0.25)) { editingCardId = nil }
            }
            .padding(.horizontal, 24)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                KnobCard {
                    HStack {
                        KnobLabel("Cities")
                        Spacer()
                        KnobLabel("Break")
                    }
                    ForEach(cards, id: \.id) { card in
                        cityRow(card, removable: cards.count > 1)
                    }
                }
                KnobField(action: { store.addCard(zone: TimeZone.current.identifier) }) {
                    SFIcon("plus").frame(width: 14, height: 14)
                    Text("Add City")
                }
            }
            .padding(.horizontal, 24)
        }
    }

    private func cityRow(_ card: WorldCardConfig, removable: Bool) -> some View {
        HStack(spacing: 10) {
            Button {
                withAnimation(.easeOut(duration: 0.25)) { editingCardId = card.id }
            } label: {
                HStack(spacing: 8) {
                    FlagView(zone: card.zone).frame(width: 22, height: 22)
                    Text(cityLabel(card.zone))
                        .font(.system(size: 14.5))
                        .lineLimit(1)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AlloyTokens.secondarySurface,
                            in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .foregroundStyle(AlloyTokens.tint)

            RowToggle(isOn: card.lineBreak) { store.setCardLineBreak(id: card.id, $0) }

            Button {
                store.removeCard(id: card.id)
            } label: {
                SFIcon("xmark").frame(width: 12, height: 12)
                    .padding(6)
            }
            .buttonStyle(.plain)
            .foregroundStyle(AlloyTokens.secondaryLabel)
            .disabled(!removable)
            .opacity(removable ? 1 : 0.3)
            .accessibilityLabel("Remove \(cityLabel(card.zone))")
        }
    }

    /// City display: abbreviated — mirrors the web's `cityLabel`
    /// (`zoneCity(zone, true) || option.label || zone`).
    private func cityLabel(_ zone: String) -> String {
        let city = ZoneFormat.zoneCity(zone, abbreviate: true)
        if !city.isEmpty { return city }
        return zoneOptions.first { $0.id == zone }?.label ?? zone
    }
}

/// Bare knobs pill switch — the web's per-row Break toggle has its column
/// header instead of a stacked label, so AlloyUI's KnobToggle (label above)
/// doesn't fit; this is its capsule body alone.
private struct RowToggle: View {
    let isOn: Bool
    let set: (Bool) -> Void

    var body: some View {
        Capsule().fill(isOn ? AlloyTokens.tint : AlloyTokens.secondarySurface)
            .frame(width: 44, height: 26)
            .overlay(alignment: .leading) {
                Circle().fill(.white)
                    .frame(width: 20, height: 20)
                    .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                    .offset(x: isOn ? 21 : 3)
            }
            .animation(.easeInOut(duration: 0.2), value: isOn)
            .onTapGesture { set(!isOn) }
            .accessibilityLabel("Line break")
            .accessibilityAddTraits(.isButton)
            .accessibilityValue(isOn ? "on" : "off")
    }
}

#Preview("World Cards settings") {
    WorldCardsSettingsView(store: WorldCardsConfigStore(registry: DimensionRegistry()))
        .padding(.vertical, 24)
        .background(Color.black)
        .preferredColorScheme(.dark)
}
