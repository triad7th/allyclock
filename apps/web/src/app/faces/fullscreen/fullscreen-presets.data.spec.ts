import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, buildDefaultState } from './fullscreen-presets.data';

describe('built-in fullscreen presets', () => {
  it('has seven bands covering the full ratio range contiguously', () => {
    const sorted = [...BUILT_IN_PRESETS].sort((a, b) => a.minRatio - b.minRatio);
    expect(sorted).toHaveLength(7);
    expect(sorted[0].minRatio).toBe(0);
    expect(sorted[sorted.length - 1].maxRatio).toBe(Infinity);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].minRatio).toBe(sorted[i - 1].maxRatio);
    }
  });

  it('every built-in is flagged builtIn and has all sections visible by default', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.builtIn).toBe(true);
      expect(p.sections.time.visible).toBe(true);
      expect(p.bar.mode).toBe('divider');
    }
  });

  it('buildDefaultState seeds version, presets, and null pin', () => {
    const s = buildDefaultState();
    expect(s.version).toBeGreaterThan(0);
    expect(s.presets.length).toBe(7);
    expect(s.pinnedPresetId).toBeNull();
  });

  it('buildDefaultState returns independent deep clones', () => {
    const s1 = buildDefaultState();
    const s2 = buildDefaultState();
    s1.presets[0].sections.time.weight = 999;
    expect(s2.presets[0].sections.time.weight).toBe(200);
    expect(BUILT_IN_PRESETS[0].sections.time.weight).toBe(200);
  });
});
