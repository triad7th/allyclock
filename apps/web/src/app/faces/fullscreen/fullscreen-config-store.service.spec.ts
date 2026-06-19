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

  it('seeds the 8 built-ins on first load and persists them', () => {
    expect(store.state().presets).toHaveLength(8);
    expect(JSON.parse(mem[PRESETS_KEY]).presets).toHaveLength(8);
  });

  it('reseeds stale older-version persisted state to current defaults', () => {
    // Pre-change state: version 1, no global flags, incompatible band shape.
    mem[PRESETS_KEY] = JSON.stringify({
      version: 1,
      presets: [{ id: 'old', name: 'OLD', minRatio: 0, maxRatio: 99 }],
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(FullscreenConfigStore);
    expect(fresh.state().presets).toHaveLength(8);
    expect(fresh.state().showWeekday).toBe(true);
    expect(fresh.state().showGmt).toBe(true);
  });

  it('revives Infinity maxRatio lost to JSON on reload (SUPER stays reachable)', () => {
    // JSON.stringify(Infinity) === "null"; simulate reloading such persisted state.
    const persisted = JSON.parse(JSON.stringify(store.state()));
    expect(persisted.presets.find((p: { id: string }) => p.id === 'super').maxRatio).toBeNull();
    mem[PRESETS_KEY] = JSON.stringify(persisted);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(FullscreenConfigStore);
    expect(fresh.state().presets.find((p) => p.id === 'super')!.maxRatio).toBe(Infinity);
    expect(fresh.resolveForRatio(8.56).id).toBe('super');
  });

  it('resolveForRatio picks the band containing the ratio', () => {
    expect(store.resolveForRatio(2.1).id).toBe('mini');
    expect(store.resolveForRatio(1.78).id).toBe('wide');
    expect(store.resolveForRatio(2.33).id).toBe('ultra');
    expect(store.resolveForRatio(1.6).id).toBe('lap');
    expect(store.resolveForRatio(1.33).id).toBe('pad');
    expect(store.resolveForRatio(0.75).id).toBe('tall');
    expect(store.resolveForRatio(0.46).id).toBe('phone');
    expect(store.resolveForRatio(3.5).id).toBe('super');
    expect(store.resolveForRatio(0.62).id).toBe('tall');
  });

  it('resolveForRatio maps both very tall and moderately tall phones to the phone band', () => {
    expect(store.resolveForRatio(0.2).id).toBe('phone');
    expect(store.resolveForRatio(0.5).id).toBe('phone');
  });

  it('updateSection merges a partial and persists', () => {
    store.updateSection('phone', 'time', { sizeScale: 1.5 });
    const t = store.state().presets.find((p) => p.id === 'phone')!.sections.time;
    expect(t.sizeScale).toBe(1.5);
    expect(JSON.parse(mem[PRESETS_KEY]).presets.find((p: any) => p.id === 'phone').sections.time.sizeScale).toBe(1.5);
  });

  it('updateBar and updateGap mutate the right preset', () => {
    store.updateBar('ultra', { visible: false });
    expect(store.state().presets.find((p) => p.id === 'ultra')!.bar.visible).toBe(false);
    store.updateGap('ultra', 'timeToBar', 1.4);
    expect(store.state().presets.find((p) => p.id === 'ultra')!.gaps.timeToBar).toBe(1.4);
  });

  it('setShowWeekday commits the global flag and persists it', () => {
    expect(store.state().showWeekday).toBe(true);
    store.setShowWeekday(false);
    expect(store.state().showWeekday).toBe(false);
    expect(JSON.parse(mem[PRESETS_KEY]).showWeekday).toBe(false);
  });

  it('setShowGmt commits the global flag and persists it', () => {
    expect(store.state().showGmt).toBe(true);
    store.setShowGmt(false);
    expect(store.state().showGmt).toBe(false);
    expect(JSON.parse(mem[PRESETS_KEY]).showGmt).toBe(false);
  });

  it('renamePreset renames the target preset', () => {
    store.renamePreset('phone', 'POCKET');
    expect(store.state().presets.find((p) => p.id === 'phone')!.name).toBe('POCKET');
  });
});
