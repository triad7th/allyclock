import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { PRESETS_KEY } from './fullscreen-preset';

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

  it('seeds the 5 built-ins on first load and persists them', () => {
    expect(store.state().presets).toHaveLength(5);
    expect(JSON.parse(mem[PRESETS_KEY]).presets).toHaveLength(5);
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(store.resolveForRatio(2.1).name).toBe('ULTRA');
    expect(store.resolveForRatio(1.78).name).toBe('WIDE');
    expect(store.resolveForRatio(1.33).id).toBe('pad');
    expect(store.resolveForRatio(0.75).id).toBe('tall');
    expect(store.resolveForRatio(0.46).name).toBe('PHONE');
    expect(store.resolveForRatio(0.62).id).toBe('tall');
  });

  it('resolveForRatio maps both very tall and moderately tall phones to the phone band', () => {
    expect(store.resolveForRatio(0.2).id).toBe('phone');
    expect(store.resolveForRatio(0.5).id).toBe('phone');
  });

  it('updateSection merges a partial and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5, visible: false });
    const t = store.state().presets.find((p) => p.id === 'phone')!.sections.time;
    expect(t.sizeScale).toBe(1.5);
    expect(t.visible).toBe(false);
    expect(JSON.parse(mem[PRESETS_KEY]).presets.find((p: any) => p.id === 'phone').sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right preset', () => {
    store.updateBar('ultra', { visible: false });
    expect(store.state().presets.find((p) => p.id === 'ultra')!.bar.visible).toBe(false);
    store.updateGap('ultra', 'timeToBar', 1.4);
    expect(store.state().presets.find((p) => p.id === 'ultra')!.gaps.timeToBar).toBe(1.4);
  });

  it('renamePreset renames the target preset', () => {
    store.renamePreset('phone', 'POCKET');
    expect(store.state().presets.find((p) => p.id === 'phone')!.name).toBe('POCKET');
  });
});
