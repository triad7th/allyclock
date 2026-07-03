// A single ratio band (the app-wide "dimension preset"). Bands are contiguous,
// sorted by minRatio ascending; the top band uses Infinity for maxRatio.
export interface DimensionBand {
  id: string; // 'phone' … 'super'
  name: string; // 'PHONE' … 'SUPER' (shown in the overlay label)
  minRatio: number; // inclusive (ratio = width / height)
  maxRatio: number; // exclusive; top band uses Infinity
}

export interface DimensionRegistryState {
  version: number;
  bands: DimensionBand[];
}

export const DIMENSIONS_KEY = 'allyclock.dimensions';
export const DIMENSIONS_VERSION = 1;

// The eight built-in bands (lifted from the former fullscreen BUILT_IN_PRESETS
// ratios/names). Edit this list later to add/remove dimension presets app-wide.
export const BUILT_IN_BANDS: DimensionBand[] = [
  { id: 'phone', name: 'PHONE', minRatio: 0, maxRatio: 0.62 },
  { id: 'tall', name: 'TALL', minRatio: 0.62, maxRatio: 1.05 },
  { id: 'pad', name: 'PAD', minRatio: 1.05, maxRatio: 1.45 },
  { id: 'lap', name: 'LAP', minRatio: 1.45, maxRatio: 1.7 },
  { id: 'wide', name: 'WIDE', minRatio: 1.7, maxRatio: 1.95 },
  { id: 'mini', name: 'MINI', minRatio: 1.95, maxRatio: 2.2 },
  { id: 'ultra', name: 'ULTRA', minRatio: 2.2, maxRatio: 2.8 },
  { id: 'super', name: 'SUPER', minRatio: 2.8, maxRatio: Infinity },
];

export function buildDefaultDimensions(): DimensionRegistryState {
  return { version: DIMENSIONS_VERSION, bands: BUILT_IN_BANDS.map((b) => ({ ...b })) };
}
