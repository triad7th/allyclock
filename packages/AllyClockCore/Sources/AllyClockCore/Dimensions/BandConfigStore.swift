import Foundation

public struct BandConfigState<T: Codable>: Codable {
    public var version: Int
    public var byBand: [String: T]
    public init(version: Int, byBand: [String: T]) { self.version = version; self.byBand = byBand }
}

/// Generic per-face config keyed by `DimensionBand.id`. Subclasses supply the
/// storage key, version, and per-band defaults; persistence and immutable
/// updates are shared. Port of `band-config-store.ts`. Persists to UserDefaults
/// as JSON. Overridable hooks are pure (no subclass stored state), so calling
/// them from `init` is safe.
open class BandConfigStore<T: Codable> {
    private let defaults: UserDefaults
    public private(set) var state: BandConfigState<T>

    open var storageKey: String { fatalError("subclass must override storageKey") }
    open var version: Int { fatalError("subclass must override version") }
    open func buildDefaults() -> [String: T] { fatalError("subclass must override buildDefaults") }

    /// Combine one band's default with its persisted value. Default: take the
    /// persisted value wholesale. Override for field-level migration.
    open func mergeBand(default d: T, persisted p: T) -> T { p }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.state = BandConfigState(version: 0, byBand: [:])
        self.state = load()
    }

    /// Current fields for a band id, never nil: falls back to a fresh default,
    /// then to any present band.
    public func config(_ bandId: String) -> T {
        state.byBand[bandId] ?? buildDefaults()[bandId] ?? state.byBand.values.first!
    }

    public func patch(_ bandId: String, _ transform: (T) -> T) {
        var byBand = state.byBand
        byBand[bandId] = transform(config(bandId))
        commit(BandConfigState(version: state.version, byBand: byBand))
    }

    public func patchAll(_ transform: (T) -> T) {
        var byBand: [String: T] = [:]
        for (id, fields) in state.byBand { byBand[id] = transform(fields) }
        commit(BandConfigState(version: state.version, byBand: byBand))
    }

    // MARK: - Persistence

    private func load() -> BandConfigState<T> {
        if let data = defaults.data(forKey: storageKey),
           let parsed = try? JSONDecoder().decode(BandConfigState<T>.self, from: data),
           !parsed.byBand.isEmpty {
            return migrate(parsed)
        }
        let seeded = BandConfigState(version: version, byBand: buildDefaults())
        persist(seeded)
        return seeded
    }

    /// Additive: every default band id is present; a persisted band is combined
    /// with its default via `mergeBand`. Persisted-only ids are carried untouched.
    private func migrate(_ persisted: BandConfigState<T>) -> BandConfigState<T> {
        let defs = buildDefaults()
        var byBand: [String: T] = [:]
        for id in defs.keys {
            if let p = persisted.byBand[id] { byBand[id] = mergeBand(default: defs[id]!, persisted: p) }
            else { byBand[id] = defs[id]! }
        }
        for (id, p) in persisted.byBand where byBand[id] == nil { byBand[id] = p }
        let migrated = BandConfigState(version: version, byBand: byBand)
        if persisted.version != version || byBand.count != persisted.byBand.count { persist(migrated) }
        return migrated
    }

    private func commit(_ next: BandConfigState<T>) { state = next; persist(next) }

    private func persist(_ state: BandConfigState<T>) {
        if let data = try? JSONEncoder().encode(state) { defaults.set(data, forKey: storageKey) }
    }
}
