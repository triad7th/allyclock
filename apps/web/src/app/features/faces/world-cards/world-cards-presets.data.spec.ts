import { describe, it, expect } from 'vitest';
import { buildDefaultFields } from './world-cards-presets.data';
import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';

describe('buildDefaultFields', () => {
  it('returns one entry per built-in band id', () => {
    expect(Object.keys(buildDefaultFields()).sort()).toEqual(
      BUILT_IN_BANDS.map((b) => b.id).sort(),
    );
  });

  it('seeds unit sizes and the US/UK/KR cards on every band', () => {
    for (const fields of Object.values(buildDefaultFields())) {
      expect(fields.sizes).toEqual({ time: 1, date: 1 });
      expect(fields.cards.map((c) => c.zone)).toEqual([
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Seoul',
      ]);
      expect(fields.cards[0].lineBreak).toBe(true);
      expect(fields.cards[1].lineBreak).toBe(false);
    }
  });

  it('returns independent deep clones each call', () => {
    const a = buildDefaultFields();
    const b = buildDefaultFields();
    a['phone'].cards[0].zone = 'Asia/Tokyo';
    expect(b['phone'].cards[0].zone).toBe('America/Los_Angeles');
  });
});
