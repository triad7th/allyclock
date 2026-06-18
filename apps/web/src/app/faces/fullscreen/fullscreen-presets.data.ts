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
const PHONE = {
  time: { cqw: 24, cqh: 200 } as SectionBase,
  date: { cqw: 3.4, cqh: 200 } as SectionBase,
  bar: { cqw: 60, cqh: 200 } as SectionBase,
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
    bar: { mode: 'divider', sizeScale: 1, opacity: 0.34 },
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
  preset('tablet-portrait', 'TABLET PORTRAIT', 0.62, 0.87, NEAR_SQUARE),
  preset('square', 'SQUARE', 0.87, 1.15, NEAR_SQUARE),
  preset('tablet-43', 'TABLET 4:3', 1.15, 1.45, NEAR_SQUARE),
  preset('laptop', 'LAPTOP / SMART DISPLAY', 1.45, 1.7, LANDSCAPE),
  preset('widescreen', 'WIDESCREEN / TV', 1.7, 1.95, LANDSCAPE),
  preset('ultrawide', 'ULTRAWIDE', 1.95, Infinity, LANDSCAPE),
];

export function buildDefaultState(): FullscreenConfigState {
  return {
    version: STATE_VERSION,
    presets: BUILT_IN_PRESETS.map((p) => structuredClone(p)),
    pinnedPresetId: null,
  };
}
