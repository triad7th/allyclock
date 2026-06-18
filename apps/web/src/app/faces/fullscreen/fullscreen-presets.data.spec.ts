import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, buildDefaultState } from './fullscreen-presets.data';

describe('built-in fullscreen presets', () => {
  it('has five bands covering the full ratio range contiguously', () => {
    const sorted = [...BUILT_IN_PRESETS].sort((a, b) => a.minRatio - b.minRatio);
    expect(sorted).toHaveLength(5);
    expect(sorted[0].minRatio).toBe(0);
    expect(sorted[sorted.length - 1].maxRatio).toBe(Infinity);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].minRatio).toBe(sorted[i - 1].maxRatio);
    }
  });

  it('has the five expected short band names', () => {
    const names = BUILT_IN_PRESETS.map((p) => p.name);
    expect(names).toEqual(['PHONE', 'TALL', 'PAD', 'WIDE', 'ULTRA']);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(5);
    }
  });

  it('every built-in is flagged builtIn with time and bar visible by default', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.builtIn).toBe(true);
      expect(p.sections.time.visible).toBe(true);
      expect(p.bar.visible).toBe(true);
    }
  });

  it('the phone band carries a cqh floor (minCqh) on its time base', () => {
    const phone = BUILT_IN_PRESETS.find((p) => p.id === 'phone')!;
    expect(phone.bases.time.minCqh).toBeDefined();
    expect(phone.bases.time.minCqh).toBeGreaterThan(0);
  });

  it('only the phone band carries minCqh', () => {
    for (const p of BUILT_IN_PRESETS) {
      const hasFloor = p.bases.time.minCqh != null;
      expect(hasFloor).toBe(p.id === 'phone');
    }
  });

  it('buildDefaultState seeds version and five presets', () => {
    const s = buildDefaultState();
    expect(s.version).toBeGreaterThan(0);
    expect(s.presets.length).toBe(5);
  });

  it('buildDefaultState returns independent deep clones', () => {
    const s1 = buildDefaultState();
    const s2 = buildDefaultState();
    s1.presets[0].sections.time.weight = 999;
    expect(s2.presets[0].sections.time.weight).toBe(200);
    expect(BUILT_IN_PRESETS[0].sections.time.weight).toBe(200);
  });
});
