import { describe, it, expect } from 'vitest';
import { buildDefaultFields } from './fullscreen-presets.data';
import { BUILT_IN_BANDS } from '@core/dimensions/dimension-band';

describe('buildDefaultFields', () => {
  it('returns one FullscreenFields per band id (the eight bands)', () => {
    const f = buildDefaultFields();
    expect(Object.keys(f).sort()).toEqual(
      ['lap', 'mini', 'pad', 'phone', 'super', 'tall', 'ultra', 'wide'],
    );
  });

  it('has exactly one entry per registry band id (guards against drift)', () => {
    expect(Object.keys(buildDefaultFields()).sort()).toEqual(
      BUILT_IN_BANDS.map((b) => b.id).sort(),
    );
  });

  it('defaults bar visible and weekday/gmt visible on every band', () => {
    for (const fields of Object.values(buildDefaultFields())) {
      expect(fields.bar.visible).toBe(true);
      expect(fields.sections.weekday.visible).toBe(true);
      expect(fields.sections.gmt.visible).toBe(true);
    }
  });

  it('only the phone band carries a cqh floor (minCqh) on its time base', () => {
    const f = buildDefaultFields();
    expect(f['phone'].bases.time.minCqh).toBeGreaterThan(0);
    for (const [id, fields] of Object.entries(f)) {
      expect(fields.bases.time.minCqh != null).toBe(id === 'phone');
    }
  });

  it('returns independent deep clones each call', () => {
    const a = buildDefaultFields();
    const b = buildDefaultFields();
    a['phone'].sections.time.weight = 999;
    expect(b['phone'].sections.time.weight).toBe(200);
  });
});
