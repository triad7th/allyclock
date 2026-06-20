import type { FullscreenFields, SectionBase, SectionKey } from './fullscreen-preset';

// Inter-section gap bases (cq units), scaled per-preset by the gap multipliers.
const GAP_BASE_CQW = 2;
const GAP_BASE_CQH = 3;
// The date parts sit on one line, so their separation is an em of the date text.
const DATE_PARTS_GAP_EM = 0.5;

function base(b: SectionBase): string {
  const blend = `min(${b.cqw}cqw, ${b.cqh}cqh)`;
  return b.minCqh != null ? `max(${blend}, ${b.minCqh}cqh)` : blend;
}

export function varsFor(p: FullscreenFields): Record<string, string> {
  const v: Record<string, string> = {
    '--time-base': base(p.bases.time),
    '--date-base': base(p.bases.date),
    '--gap-time-bar': `calc(${p.gaps.timeToBar} * min(${GAP_BASE_CQW}cqw, ${GAP_BASE_CQH}cqh))`,
    '--gap-bar-date': `calc(${p.gaps.barToDate} * min(${GAP_BASE_CQW}cqw, ${GAP_BASE_CQH}cqh))`,
    '--gap-date-parts': `${p.gaps.betweenDateParts * DATE_PARTS_GAP_EM}em`,
    '--time-scale': `${p.sections.time.sizeScale}`,
    '--time-weight': `${p.sections.time.weight}`,
    '--time-opacity': `${p.sections.time.opacity}`,
    '--bar-opacity': `${p.bar.opacity}`,
  };
  (['weekday', 'month', 'day', 'gmt'] as SectionKey[]).forEach((k) => {
    v[`--${k}-scale`] = `${p.sections[k].sizeScale}`;
    v[`--${k}-weight`] = `${p.sections[k].weight}`;
    v[`--${k}-opacity`] = `${p.sections[k].opacity}`;
  });
  return v;
}
