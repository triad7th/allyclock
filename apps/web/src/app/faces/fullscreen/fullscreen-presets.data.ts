import {
  STATE_VERSION,
  type FullscreenConfigState,
  type FullscreenPreset,
  type SectionBase,
  type SectionStyle,
} from './fullscreen-preset';

const timeStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 200, opacity: 1 });
const dateStyle = (): SectionStyle => ({ visible: true, sizeScale: 1, weight: 300, opacity: 0.6 });

const LANDSCAPE = {
  time: { cqw: 120, cqh: 68 } as SectionBase,
  date: { cqw: 8, cqh: 5 } as SectionBase,
  bar: { cqw: 120, cqh: 56 } as SectionBase,
};
const NEAR_SQUARE = {
  time: { cqw: 38, cqh: 64 } as SectionBase,
  date: { cqw: 3.4, cqh: 4 } as SectionBase,
  bar: { cqw: 58, cqh: 62 } as SectionBase,
};
// Phone band carries a cqh floor (minCqh = cqw * 0.31) so that below ratio 0.31
// the height-bound floor wins and the layout stops shrinking, matching the size
// it has across 0.31–0.62.
const PHONE = {
  time: { cqw: 24, cqh: 200, minCqh: 7.44 } as SectionBase,
  date: { cqw: 3.4, cqh: 200, minCqh: 1.054 } as SectionBase,
  bar: { cqw: 60, cqh: 200, minCqh: 18.6 } as SectionBase,
};

function preset(
  id: string,
  name: string,
  minRatio: number,
  maxRatio: number,
  bases: FullscreenPreset['bases'],
): FullscreenPreset {
  return {
    id,
    name,
    minRatio,
    maxRatio,
    bar: { visible: true, sizeScale: 1, opacity: 0.34 },
    sections: {
      time: timeStyle(),
      weekday: dateStyle(),
      month: dateStyle(),
      day: dateStyle(),
      gmt: dateStyle(),
    },
    bases,
    gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
    builtIn: true,
  };
}

export const BUILT_IN_PRESETS: FullscreenPreset[] = [
  preset('phone', 'PHONE', 0, 0.62, PHONE),
  preset('tall', 'TALL', 0.62, 1.05, NEAR_SQUARE),
  preset('pad', 'PAD', 1.05, 1.5, NEAR_SQUARE),
  preset('wide', 'WIDE', 1.5, 2.0, LANDSCAPE),
  preset('ultra', 'ULTRA', 2.0, Infinity, LANDSCAPE),
];

export function buildDefaultState(): FullscreenConfigState {
  return {
    version: STATE_VERSION,
    presets: BUILT_IN_PRESETS.map((p) => structuredClone(p)),
  };
}
