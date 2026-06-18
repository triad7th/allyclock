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

  it('seeds the 7 built-ins on first load and persists them', () => {
    expect(store.state().presets).toHaveLength(7);
    expect(JSON.parse(mem[PRESETS_KEY]).presets).toHaveLength(7);
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(store.resolveForRatio(2.1).name).toBe('ULTRAWIDE');
    expect(store.resolveForRatio(1.78).name).toBe('WIDESCREEN / TV');
    expect(store.resolveForRatio(0.46).name).toBe('PHONE');
    expect(store.resolveForRatio(0.62).id).toBe('tablet-portrait');
  });

  it('pin overrides ratio resolution', () => {
    store.setPin('phone');
    expect(store.activeFor(2.1).id).toBe('phone');
    store.setPin(null);
    expect(store.activeFor(2.1).id).toBe('ultrawide');
  });

  it('addPreset inserts a band cloned from the nearest preset and stays sorted', () => {
    const before = store.state().presets.length;
    const id = store.addPreset({ name: 'CUSTOM', minRatio: 1.0, maxRatio: 1.1 });
    expect(store.state().presets.length).toBe(before + 1);
    const minRatios = store.state().presets.map((p) => p.minRatio);
    expect([...minRatios]).toEqual([...minRatios].sort((a, b) => a - b));
    expect(store.state().presets.find((p) => p.id === id)!.builtIn).toBe(false);
  });

  it('deletePreset keeps at least one and clears a dangling pin', () => {
    store.setPin('phone');
    store.deletePreset('phone');
    expect(store.state().presets.find((p) => p.id === 'phone')).toBeUndefined();
    expect(store.state().pinnedPresetId).toBeNull();
  });

  it('updateSection merges a partial and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5, visible: false });
    const t = store.state().presets.find((p) => p.id === 'phone')!.sections.time;
    expect(t.sizeScale).toBe(1.5);
    expect(t.visible).toBe(false);
    expect(JSON.parse(mem[PRESETS_KEY]).presets.find((p: any) => p.id === 'phone').sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right preset', () => {
    store.updateBar('ultrawide', { mode: 'progress' });
    expect(store.state().presets.find((p) => p.id === 'ultrawide')!.bar.mode).toBe('progress');
    store.updateGap('ultrawide', 'timeToBar', 1.4);
    expect(store.state().presets.find((p) => p.id === 'ultrawide')!.gaps.timeToBar).toBe(1.4);
  });

  it('resolveDevice maps a device name to its ratio', () => {
    expect(store.resolveDevice('iPhone SE portrait')).toBeCloseTo(750 / 1334, 3);
    expect(store.resolveDevice('nope')).toBeNull();
  });
});
