import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigStore } from './fullscreen-config-store.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenConfigStore', () => {
  let store: FullscreenConfigStore;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('seeds fields for all eight band ids and persists them', () => {
    expect(Object.keys(store.state().byBand).sort()).toEqual(
      ['lap', 'mini', 'pad', 'phone', 'super', 'tall', 'ultra', 'wide'],
    );
    expect(JSON.parse(mem['allyclock.fullscreen.config']).byBand.mini).toBeDefined();
  });

  it('fieldsFor(ratio) returns the fields for the band containing the ratio', () => {
    // 2.1 → mini, 0.46 → phone (phone is the only band with a time minCqh floor).
    expect(store.fieldsFor(2.1).bases.time.minCqh).toBeUndefined();
    expect(store.fieldsFor(0.46).bases.time.minCqh).toBeGreaterThan(0);
  });

  it('updateSection merges a partial into one band and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5 });
    expect(store.config('phone').sections.time.sizeScale).toBe(1.5);
    expect(store.config('mini').sections.time.sizeScale).toBe(1); // other bands untouched
    expect(JSON.parse(mem['allyclock.fullscreen.config']).byBand.phone.sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right band', () => {
    store.updateBar('ultra', { opacity: 0.5 });
    expect(store.config('ultra').bar.opacity).toBe(0.5);
    store.updateGap('ultra', 'timeToBar', 1.4);
    expect(store.config('ultra').gaps.timeToBar).toBe(1.4);
  });

  it('setSectionVisibleAll writes visibility to every band', () => {
    store.setSectionVisibleAll('weekday', false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.weekday.visible).toBe(false);
    }
  });

  it('setBarVisibleAll writes bar visibility to every band', () => {
    store.setBarVisibleAll(false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.visible).toBe(false);
    }
  });

  it('sample() returns a representative band fields object', () => {
    expect(store.sample().sections.weekday.visible).toBe(true);
  });
});
