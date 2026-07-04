import Foundation

/// Per-band Fullscreen config. Port of `fullscreen-config-store.service.ts`
/// (version 5). `timeZone` "" follows the global clock. Toggles broadcast to
/// every band; sizes/sections/gaps are per-band.
public final class FullscreenConfigStore: BandConfigStore<FullscreenFields> {
    private let registry: DimensionRegistry

    public init(registry: DimensionRegistry, defaults: UserDefaults = .standard) {
        self.registry = registry
        super.init(defaults: defaults)
    }

    public override var storageKey: String { "allyclock.fullscreen.config" }
    public override var version: Int { 5 }
    public override func buildDefaults() -> [String: FullscreenFields] { FullscreenPresets.buildDefaults() }

    public func fieldsFor(_ ratio: Double) -> FullscreenFields { config(registry.resolveForRatio(ratio).id) }
    public func sample() -> FullscreenFields { state.byBand.values.first ?? buildDefaults()["phone"]! }

    public func updateSection(_ bandId: String, _ key: SectionKey, _ f: (SectionStyle) -> SectionStyle) {
        patch(bandId) { var fields = $0; apply(&fields.sections, key, f); return fields }
    }
    public func updateBar(_ bandId: String, _ f: (BarStyle) -> BarStyle) {
        patch(bandId) { var fields = $0; fields.bar = f(fields.bar); return fields }
    }
    public func updateGap(_ bandId: String, _ set: (inout FullscreenGaps) -> Void) {
        patch(bandId) { var fields = $0; set(&fields.gaps); return fields }
    }

    public func setSecondsVisibleAll(_ v: Bool) { patchAll { var f = $0; f.secondsVisible = v; return f } }
    public func setZoneVisibleAll(_ v: Bool)    { patchAll { var f = $0; f.zoneVisible = v; return f } }
    public func setFlagVisibleAll(_ v: Bool)    { patchAll { var f = $0; f.flagVisible = v; return f } }
    public func setBarModeAll(_ m: BarMode)     { patchAll { var f = $0; f.bar.mode = m; return f } }
    public func setTimeZoneAll(_ tz: String)    { patchAll { var f = $0; f.timeZone = tz; return f } }
    public func setSectionVisibleAll(_ key: SectionKey, _ v: Bool) {
        patchAll { var f = $0; apply(&f.sections, key) { var s = $0; s.visible = v; return s }; return f }
    }

    private func apply(_ s: inout FullscreenSections, _ key: SectionKey, _ f: (SectionStyle) -> SectionStyle) {
        switch key {
        case .time: s.time = f(s.time)
        case .weekday: s.weekday = f(s.weekday)
        case .month: s.month = f(s.month)
        case .day: s.day = f(s.day)
        case .gmt: s.gmt = f(s.gmt)
        }
    }
}
