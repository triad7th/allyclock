import Foundation

/// A width/height ratio band ("dimension preset"). Sorted by `minRatio` ascending;
/// the top band uses `.infinity` for `maxRatio`. Ported verbatim from the web's
/// `dimension-band.ts` BUILT_IN_BANDS (DIMENSIONS_VERSION 1).
public struct DimensionBand: Equatable, Sendable {
  public let id: String       // 'phone' … 'super'
  public let name: String     // 'PHONE' … 'SUPER'
  public let minRatio: Double // inclusive (ratio = width / height)
  public let maxRatio: Double // exclusive; top band uses .infinity

  public init(id: String, name: String, minRatio: Double, maxRatio: Double) {
    self.id = id; self.name = name; self.minRatio = minRatio; self.maxRatio = maxRatio
  }
}

public let builtInBands: [DimensionBand] = [
  DimensionBand(id: "phone", name: "PHONE", minRatio: 0,    maxRatio: 0.62),
  DimensionBand(id: "tall",  name: "TALL",  minRatio: 0.62, maxRatio: 1.05),
  DimensionBand(id: "pad",   name: "PAD",   minRatio: 1.05, maxRatio: 1.45),
  DimensionBand(id: "lap",   name: "LAP",   minRatio: 1.45, maxRatio: 1.7),
  DimensionBand(id: "wide",  name: "WIDE",  minRatio: 1.7,  maxRatio: 1.95),
  DimensionBand(id: "mini",  name: "MINI",  minRatio: 1.95, maxRatio: 2.2),
  DimensionBand(id: "ultra", name: "ULTRA", minRatio: 2.2,  maxRatio: 2.8),
  DimensionBand(id: "super", name: "SUPER", minRatio: 2.8,  maxRatio: .infinity),
]
