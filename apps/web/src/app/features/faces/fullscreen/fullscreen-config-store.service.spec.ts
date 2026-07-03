import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SCREEN_ID } from '@core/screens/screen-id';
import { FullscreenConfigStore } from './fullscreen-config-store.service';

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

describe('FullscreenConfigStore', () => {
  let store: FullscreenConfigStore;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({
      providers: [{ provide: SCREEN_ID, useValue: 1 }, FullscreenConfigStore],
    });
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('seeds fields for all eight band ids and persists them', () => {
    expect(Object.keys(store.state().byBand).sort()).toEqual([
      'lap',
      'mini',
      'pad',
      'phone',
      'super',
      'tall',
      'ultra',
      'wide',
    ]);
    expect(JSON.parse(mem['allyclock.screen.1.fullscreen.config']).byBand.mini).toBeDefined();
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
    expect(
      JSON.parse(mem['allyclock.screen.1.fullscreen.config']).byBand.phone.sections.time.sizeScale,
    ).toBe(1.5);
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

  it('setBarModeAll writes the mode to every band', () => {
    store.setBarModeAll('off');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.mode).toBe('off');
    }
  });

  it('setSecondsVisibleAll writes seconds visibility to every band', () => {
    store.setSecondsVisibleAll(false);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.secondsVisible).toBe(false);
    }
  });

  it('setFlagVisibleAll writes flag visibility to every band', () => {
    store.setFlagVisibleAll(true);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.flagVisible).toBe(true);
    }
  });

  it('setTimeZoneAll broadcasts the zone to every band', () => {
    store.setTimeZoneAll('Asia/Seoul');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.timeZone).toBe('Asia/Seoul');
    }
  });

  it('migrates a legacy v1 band (bar.visible, no secondsVisible), preserving tuning', () => {
    const legacy = {
      version: 1,
      byBand: {
        mini: {
          bar: { visible: true, sizeScale: 1, opacity: 0.5 },
          sections: {
            time: { visible: true, sizeScale: 1.4, weight: 200, opacity: 1 },
            weekday: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            month: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            day: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
            gmt: { visible: true, sizeScale: 1, weight: 300, opacity: 0.6 },
          },
          bases: {
            time: { cqw: 120, cqh: 68 },
            date: { cqw: 8, cqh: 5 },
            bar: { cqw: 120, cqh: 56 },
          },
          gaps: { timeToBar: 1, barToDate: 1, betweenDateParts: 1 },
        },
      },
    };
    mem['allyclock.screen.1.fullscreen.config'] = JSON.stringify(legacy);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SCREEN_ID, useValue: 1 }, FullscreenConfigStore],
    });
    const fresh = TestBed.inject(FullscreenConfigStore);
    const mini = fresh.config('mini');
    expect(mini.bar.mode).toBe('divider'); // visible:true → divider
    expect((mini.bar as { visible?: boolean }).visible).toBeUndefined(); // legacy key dropped
    expect(mini.bar.opacity).toBe(0.5); // tuning preserved
    expect(mini.sections.time.sizeScale).toBe(1.4); // tuning preserved
    expect(mini.secondsVisible).toBe(true); // new field filled
    expect(mini.flagVisible).toBe(false); // new field filled from defaults
  });

  it('sample() returns a representative band fields object', () => {
    expect(store.sample().sections.weekday.visible).toBe(true);
  });

  it('persists under the screen-namespaced key', () => {
    const s = TestBed.inject(FullscreenConfigStore);
    s.setSecondsVisibleAll(false);
    expect(mem['allyclock.screen.1.fullscreen.config']).toBeDefined();
    expect(mem['allyclock.fullscreen.config']).toBeUndefined();
  });
});
