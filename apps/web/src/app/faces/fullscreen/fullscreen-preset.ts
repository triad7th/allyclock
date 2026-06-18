// Section style knobs (time + each date part). `sizeScale` multiplies the
// preset's responsive base for that section group.
export interface SectionStyle {
  sizeScale: number; // 0.5–2.0, default 1.0
  weight: number;    // 100–700
  opacity: number;   // 0.2–1.0
}

export interface BarStyle {
  visible: boolean;
  sizeScale: number; // scales bar width base, default 1.0
  opacity: number;
}

// Responsive base for a section group, used as `min(cqw·1cqw, cqh·1cqh)`.
// `minCqh` (optional) sets a floor in cqh units so the size stops shrinking
// below a target ratio: `max(min(cqw, cqh), minCqh)`.
export interface SectionBase {
  cqw: number;
  cqh: number;
  minCqh?: number;
}

export interface FullscreenPreset {
  id: string;
  name: string;
  minRatio: number;          // inclusive (ratio = width / height)
  maxRatio: number;          // exclusive; top band uses Infinity
  bar: BarStyle;
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
  builtIn: boolean;
}

export interface FullscreenConfigState {
  version: number;
  presets: FullscreenPreset[]; // contiguous, non-overlapping, sorted by minRatio asc
  showWeekday: boolean; // global: applies across all presets
  showGmt: boolean;     // global: applies across all presets
}

export type SectionKey = 'time' | 'weekday' | 'month' | 'day' | 'gmt';
export const DATE_SECTION_KEYS: SectionKey[] = ['weekday', 'month', 'day', 'gmt'];

export const STATE_VERSION = 2;
export const PRESETS_KEY = 'allyclock.fullscreen.presets';

// Base cq value for the inter-section gap (multiplied by each gap scale).
export const GAP_BASE_CQ = 2;
