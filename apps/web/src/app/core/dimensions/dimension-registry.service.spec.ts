import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DimensionRegistry } from './dimension-registry.service';
import { BUILT_IN_BANDS, DIMENSIONS_KEY } from './dimension-band';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
};

describe('DimensionRegistry', () => {
  let registry: DimensionRegistry;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    registry = TestBed.inject(DimensionRegistry);
  });

  it('seeds the 8 built-in bands and persists them', () => {
    expect(registry.bands()).toHaveLength(8);
    expect(JSON.parse(mem[DIMENSIONS_KEY]).bands).toHaveLength(8);
  });

  it('the bands cover the ratio range contiguously, top band open-ended', () => {
    const bands = [...registry.bands()].sort((a, b) => a.minRatio - b.minRatio);
    expect(bands[0].minRatio).toBe(0);
    expect(bands[bands.length - 1].maxRatio).toBe(Infinity);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].minRatio).toBe(bands[i - 1].maxRatio);
    }
    expect(bands.map((b) => b.name)).toEqual([
      'PHONE',
      'TALL',
      'PAD',
      'LAP',
      'WIDE',
      'MINI',
      'ULTRA',
      'SUPER',
    ]);
    for (const b of BUILT_IN_BANDS) expect(b.name.length).toBeLessThanOrEqual(5);
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(registry.resolveForRatio(2.1).id).toBe('mini');
    expect(registry.resolveForRatio(1.78).id).toBe('wide');
    expect(registry.resolveForRatio(2.33).id).toBe('ultra');
    expect(registry.resolveForRatio(1.6).id).toBe('lap');
    expect(registry.resolveForRatio(1.33).id).toBe('pad');
    expect(registry.resolveForRatio(0.75).id).toBe('tall');
    expect(registry.resolveForRatio(0.46).id).toBe('phone');
    expect(registry.resolveForRatio(3.5).id).toBe('super');
    expect(registry.resolveForRatio(0.62).id).toBe('tall');
  });

  it('maps both very tall and moderately tall ratios to the phone band', () => {
    expect(registry.resolveForRatio(0.2).id).toBe('phone');
    expect(registry.resolveForRatio(0.5).id).toBe('phone');
  });

  it('revives Infinity maxRatio lost to JSON on reload (SUPER stays reachable)', () => {
    const persisted = JSON.parse(JSON.stringify(registry.state()));
    expect(persisted.bands.find((b: { id: string }) => b.id === 'super').maxRatio).toBeNull();
    mem[DIMENSIONS_KEY] = JSON.stringify(persisted);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(DimensionRegistry);
    expect(fresh.bands().find((b) => b.id === 'super')!.maxRatio).toBe(Infinity);
    expect(fresh.resolveForRatio(8.56).id).toBe('super');
  });

  it('reseeds stale older-version persisted state', () => {
    mem[DIMENSIONS_KEY] = JSON.stringify({
      version: 0,
      bands: [{ id: 'x', name: 'X', minRatio: 0, maxRatio: 99 }],
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(DimensionRegistry);
    expect(fresh.bands()).toHaveLength(8);
  });
});
