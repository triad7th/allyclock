import Foundation

/// Owns the app-wide ratio bands and resolves the active band for a given
/// width/height ratio. Port of `dimension-registry.service.ts` (built-ins only;
/// band editing is out of scope for the iOS v1 port).
public final class DimensionRegistry {
  public var bands: [DimensionBand]

  public init() { self.bands = builtInBands }

  /// The band containing `ratio` (min inclusive, max exclusive); if none
  /// contains it, the band whose range is nearest, matching the web fallback.
  public func resolveForRatio(_ ratio: Double) -> DimensionBand {
    if let hit = bands.first(where: { ratio >= $0.minRatio && ratio < $0.maxRatio }) {
      return hit
    }
    return bands.min(by: { distance($0, ratio) < distance($1, ratio) }) ?? bands[0]
  }

  private func distance(_ b: DimensionBand, _ ratio: Double) -> Double {
    if ratio < b.minRatio { return b.minRatio - ratio }
    if ratio >= b.maxRatio { return ratio - b.maxRatio }
    return 0
  }
}
