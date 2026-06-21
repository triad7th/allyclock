import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BandConfigStore } from './band-config-store';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

interface Fields { n: number; on: boolean }

class TestStore extends BandConfigStore<Fields> {
  protected storageKey(): string { return 'test.bands'; }
  protected version(): number { return 1; }
  protected buildDefaults(): Record<string, Fields> {
    return { a: { n: 1, on: true }, b: { n: 2, on: true } };
  }
  constructor() { super(); this.init(); }
  bump(id: string): void { this.patch(id, (f) => ({ ...f, n: f.n + 1 })); }
  allOff(): void { this.patchAll((f) => ({ ...f, on: false })); }
}

describe('BandConfigStore', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
  });

  it('seeds defaults per band id and persists them', () => {
    const s = new TestStore();
    expect(s.config('a')).toEqual({ n: 1, on: true });
    expect(JSON.parse(mem['test.bands']).byBand.b.n).toBe(2);
  });

  it('patch updates one band; patchAll broadcasts to all bands', () => {
    const s = new TestStore();
    s.bump('a');
    expect(s.config('a').n).toBe(2);
    expect(s.config('b').n).toBe(2);
    s.allOff();
    expect(s.config('a').on).toBe(false);
    expect(s.config('b').on).toBe(false);
  });

  it('config returns a default for an id absent from byBand (never undefined)', () => {
    const s = new TestStore();
    expect(s.config('missing')).toBeDefined();
  });

  it('migration additively fills band ids missing from persisted state', () => {
    mem['test.bands'] = JSON.stringify({ version: 1, byBand: { a: { n: 9, on: false } } });
    const s = new TestStore();
    expect(s.config('a')).toEqual({ n: 9, on: false }); // existing preserved
    expect(s.config('b')).toEqual({ n: 2, on: true });   // missing filled from defaults
  });

  it('mergeBand override is applied to persisted bands on load (field-level migration)', () => {
    // A subclass that fills a missing field from defaults rather than taking the
    // persisted band wholesale.
    class MergeStore extends BandConfigStore<{ a: number; b?: number }> {
      protected storageKey(): string { return 'test.merge'; }
      protected version(): number { return 2; }
      protected buildDefaults(): Record<string, { a: number; b?: number }> {
        return { x: { a: 1, b: 9 } };
      }
      protected override mergeBand(defaults: { a: number; b?: number }, persisted: { a: number; b?: number }) {
        return { ...defaults, ...persisted };
      }
      constructor() { super(); this.init(); }
    }
    mem['test.merge'] = JSON.stringify({ version: 1, byBand: { x: { a: 5 } } });
    const s = new MergeStore();
    expect(s.config('x')).toEqual({ a: 5, b: 9 }); // persisted a wins, default b filled
  });
});
