import Foundation

public enum BarMode: String, Codable, Sendable { case off, divider, progress }

public struct SectionStyle: Codable, Equatable, Sendable {
    public var visible: Bool
    public var sizeScale: Double   // 0.5–2.0
    public var weight: Int         // 100–700
    public var opacity: Double     // 0.2–1.0
    public init(visible: Bool, sizeScale: Double, weight: Int, opacity: Double) {
        self.visible = visible; self.sizeScale = sizeScale; self.weight = weight; self.opacity = opacity
    }
}

public struct BarStyle: Codable, Equatable, Sendable {
    public var mode: BarMode
    public var sizeScale: Double
    public var opacity: Double
    public init(mode: BarMode, sizeScale: Double, opacity: Double) {
        self.mode = mode; self.sizeScale = sizeScale; self.opacity = opacity
    }
}

/// Sizing base in container-query units (percent of container W/H). Blend =
/// min(cqw%·W, cqh%·H), floored to minCqh%·H when present.
public struct SectionBase: Codable, Equatable, Sendable {
    public var cqw: Double
    public var cqh: Double
    public var minCqh: Double?
    public init(cqw: Double, cqh: Double, minCqh: Double? = nil) {
        self.cqw = cqw; self.cqh = cqh; self.minCqh = minCqh
    }
}

public enum SectionKey: CaseIterable, Sendable { case time, weekday, month, day, gmt }

public extension SectionKey {
    /// Date-row sections the Date slider broadcasts to (web `DATE_SECTION_KEYS`).
    static let dateKeys: [SectionKey] = [.weekday, .month, .day, .gmt]
}

public struct FullscreenSections: Codable, Equatable, Sendable {
    public var time, weekday, month, day, gmt: SectionStyle
}
public struct FullscreenBases: Codable, Equatable, Sendable {
    public var time, date, bar: SectionBase
}
public struct FullscreenGaps: Codable, Equatable, Sendable {
    public var timeToBar, barToDate, betweenDateParts: Double
}

public struct FullscreenFields: Codable, Equatable, Sendable {
    public var bar: BarStyle
    public var secondsVisible: Bool
    public var zoneVisible: Bool
    public var flagVisible: Bool
    public var timeZone: String        // "" = follow the global clock zone
    public var sections: FullscreenSections
    public var bases: FullscreenBases
    public var gaps: FullscreenGaps
}

/// blend = min(cqw%·W, cqh%·H); floor to minCqh%·H when set; × sizeScale.
/// Port of `base()` in `fullscreen-style.ts`.
public func fullscreenFontSize(_ base: SectionBase, sizeScale: Double,
                               width: Double, height: Double) -> Double {
    var value = min(base.cqw / 100 * width, base.cqh / 100 * height)
    if let m = base.minCqh { value = max(value, m / 100 * height) }
    return value * sizeScale
}
