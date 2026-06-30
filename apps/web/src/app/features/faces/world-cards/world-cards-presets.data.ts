import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';
import type { WorldCardConfig, WorldCardsFields } from './world-cards-config';

// US (ends its row), UK + KR together on the second row.
const DEFAULT_CARDS: WorldCardConfig[] = [
  { id: 1, zone: 'America/Los_Angeles', lineBreak: true },
  { id: 2, zone: 'Europe/London', lineBreak: false },
  { id: 3, zone: 'Asia/Seoul', lineBreak: false },
];

function fields(): WorldCardsFields {
  return {
    cards: DEFAULT_CARDS.map((c) => ({ ...c })),
    sizes: { time: 1, date: 1 },
  };
}

// Default fields per band id. cards are identical across bands
// (they are global); sizes start at 1.0 per band.
export function buildDefaultFields(): Record<string, WorldCardsFields> {
  const byBand: Record<string, WorldCardsFields> = {};
  for (const band of BUILT_IN_BANDS) byBand[band.id] = fields();
  return byBand;
}
