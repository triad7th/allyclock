// Section style knobs (time + each date part). `sizeScale` multiplies the
// preset's responsive base for that section group.
export interface SectionStyle {
  // Per-band visibility. The Weekday/GMT/Bar toggles write this to every band
  // (dimension-agnostic), but the per-band field is kept so per-band visibility
  // control can be revived later. (time/month/day stay true.)
  visible: boolean;
  sizeScale: number; // 0.5–2.0, default 1.0
  weight: number;    // 100–700
  opacity: number;   // 0.2–1.0
}

export type BarMode = 'off' | 'divider' | 'progress';

export interface BarStyle {
  mode: BarMode;     // 'off' subsumes the former visible:false
  sizeScale: number; // unchanged
  opacity: number;   // unchanged — drives divider line alpha
}

// Responsive base for a section group, used as `min(cqw·1cqw, cqh·1cqh)`.
// `minCqh` (optional) sets a floor in cqh units so the size stops shrinking
// below a target ratio: `max(min(cqw, cqh), minCqh)`.
export interface SectionBase {
  cqw: number;
  cqh: number;
  minCqh?: number;
}

// Per-band style fields for the Fullscreen face. Keyed by DimensionBand.id in
// the store; the band boundaries themselves live in DimensionRegistry.
export interface FullscreenFields {
  bar: BarStyle;
  secondsVisible: boolean;
  timeZone: string; // '' = follow the global clock zone
  sections: {
    time: SectionStyle;
    weekday: SectionStyle;
    month: SectionStyle;
    day: SectionStyle;
    gmt: SectionStyle;
  };
  bases: {
    time: SectionBase;
    date: SectionBase; // shared by weekday/month/day/gmt
    bar: SectionBase;  // bar width base
  };
  gaps: {
    timeToBar: number;        // scale on a cq gap base, default 1.0
    barToDate: number;
    betweenDateParts: number;
  };
}

export type SectionKey = 'time' | 'weekday' | 'month' | 'day' | 'gmt';
export const DATE_SECTION_KEYS: SectionKey[] = ['weekday', 'month', 'day', 'gmt'];
