import Foundation

/// Per-band World Cards config (version 1). `cards` is broadcast to every band;
/// `sizes` is per-band. Port of `world-cards-config-store.service.ts`.
public final class WorldCardsConfigStore: BandConfigStore<WorldCardsFields> {
    private let registry: DimensionRegistry

    public init(registry: DimensionRegistry, defaults: UserDefaults = .standard) {
        self.registry = registry
        super.init(defaults: defaults)
    }

    public override var storageKey: String { "allyclock.world-cards.config" }
    public override var version: Int { 1 }
    public override func buildDefaults() -> [String: WorldCardsFields] { WorldCardsPresets.buildDefaults() }

    public func fieldsFor(_ ratio: Double) -> WorldCardsFields { config(registry.resolveForRatio(ratio).id) }
    public func sample() -> WorldCardsFields { state.byBand.values.first ?? buildDefaults()["phone"]! }

    private func nextId() -> Int { (sample().cards.map(\.id).max() ?? 0) + 1 }

    public func addCard(zone: String) {
        guard sample().cards.count < MAX_CARDS else { return }
        let card = WorldCardConfig(id: nextId(), zone: zone, lineBreak: false)
        patchAll { var f = $0; f.cards.append(card); return f }
    }

    public func removeCard(id: Int) {
        guard sample().cards.count > MIN_CARDS else { return }
        patchAll { var f = $0; f.cards.removeAll { $0.id == id }; return f }
    }

    public func setCardZone(id: Int, zone: String) {
        patchAll { var f = $0; f.cards = f.cards.map { $0.id == id ? withZone($0, zone) : $0 }; return f }
    }

    public func setCardLineBreak(id: Int, _ lineBreak: Bool) {
        patchAll { var f = $0; f.cards = f.cards.map { $0.id == id ? withLineBreak($0, lineBreak) : $0 }; return f }
    }

    public func setSize(_ bandId: String, key: WritableKeyPath<WorldCardSizes, Double>, value: Double) {
        patch(bandId) { var f = $0; f.sizes[keyPath: key] = value; return f }
    }

    private func withZone(_ c: WorldCardConfig, _ z: String) -> WorldCardConfig {
        WorldCardConfig(id: c.id, zone: z, lineBreak: c.lineBreak)
    }
    private func withLineBreak(_ c: WorldCardConfig, _ b: Bool) -> WorldCardConfig {
        WorldCardConfig(id: c.id, zone: c.zone, lineBreak: b)
    }
}
