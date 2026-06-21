import { type FullscreenFields, type SectionBase, type SectionStyle } from './fullscreen-preset';

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

function fields(bases: FullscreenFields['bases']): FullscreenFields {
  return {
    bar: { mode: 'progress', sizeScale: 1, opacity: 0.34 },
    secondsVisible: true,
    sections: {
      time: timeStyle(),
      weekday: dateStyle(),
      month: dateStyle(),
      day: dateStyle(),
      gmt: dateStyle(),
    },
    bases,
    gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
  };
}

// Default fields per band id. Band ids MUST match DimensionRegistry's bands.
export function buildDefaultFields(): Record<string, FullscreenFields> {
  return {
    phone: fields(PHONE),
    tall: fields(NEAR_SQUARE),
    pad: fields(NEAR_SQUARE),
    lap: fields(LANDSCAPE),
    wide: fields(LANDSCAPE),
    mini: fields(LANDSCAPE),
    ultra: fields(LANDSCAPE),
    super: fields(LANDSCAPE),
  };
}
