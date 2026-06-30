import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';
import type { WorldCardConfig, WorldCardsFields } from './world-cards-config';

// US (featured, full row) + UK + KR, matching today's look. UK uses Europe/London
// (DST-aware), replacing the old UTC simplification.
const DEFAULT_CARDS: WorldCardConfig[] = [
  { id: 1, zone: 'America/Los_Angeles', span: 'full' },
  { id: 2, zone: 'Europe/London', span: 'cell' },
  { id: 3, zone: 'Asia/Seoul', span: 'cell' },
];

function fields(): WorldCardsFields {
  return {
    sectionMode: 'three',
    cards: DEFAULT_CARDS.map((c) => ({ ...c })),
    sizes: { time: 1, precision: 1, date: 1 },
  };
}

// Default fields per band id. cards + sectionMode are identical across bands
// (they are global); sizes start at 1.0 per band.
export function buildDefaultFields(): Record<string, WorldCardsFields> {
  const byBand: Record<string, WorldCardsFields> = {};
  for (const band of BUILT_IN_BANDS) byBand[band.id] = fields();
  return byBand;
}
