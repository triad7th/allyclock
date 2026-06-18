import { Injectable, signal } from '@angular/core';
import {
  PIN_KEY,
  PRESETS_KEY,
  STATE_VERSION,
  type FullscreenConfigState,
  type FullscreenPreset,
  type SectionKey,
  type SectionStyle,
  type BarStyle,
} from './fullscreen-preset';
import { buildDefaultState } from './fullscreen-presets.data';
import { DEVICE_RATIOS } from './device-ratios';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Math.floor(performance.now() * 1000).toString(36)}`;
}

function bandDistance(p: FullscreenPreset, ratio: number): number {
  if (ratio < p.minRatio) return p.minRatio - ratio;
  if (ratio >= p.maxRatio) return ratio - p.maxRatio;
  return 0;
}

@Injectable({ providedIn: 'root' })
export class FullscreenConfigStore {
  private readonly _state = signal<FullscreenConfigState>(this.load());
  readonly state = this._state.asReadonly();

  resolveForRatio(ratio: number): FullscreenPreset {
    const presets = this._state().presets;
    return (
      presets.find((p) => ratio >= p.minRatio && ratio < p.maxRatio) ??
      [...presets].sort((a, b) => bandDistance(a, ratio) - bandDistance(b, ratio))[0]
    );
  }

  activeFor(ratio: number): FullscreenPreset {
    const pin = this._state().pinnedPresetId;
    if (pin) {
      const pinned = this._state().presets.find((p) => p.id === pin);
      if (pinned) return pinned;
    }
    return this.resolveForRatio(ratio);
  }

  resolveDevice(name: string): number | null {
    return DEVICE_RATIOS.find((d) => d.name === name)?.ratio ?? null;
  }

  setPin(id: string | null): void {
    this.commit({ ...this._state(), pinnedPresetId: id });
  }

  addPreset(seed: { name: string; minRatio: number; maxRatio: number }): string {
    const id = newId();
    const mid = (seed.minRatio + Math.min(seed.maxRatio, seed.minRatio + 2)) / 2;
    const base = this.resolveForRatio(mid);
    const clone = structuredClone(base);
    const next: FullscreenPreset = {
      ...clone,
      id,
      name: seed.name,
      minRatio: seed.minRatio,
      maxRatio: seed.maxRatio,
      builtIn: false,
    };
    const presets = [...this._state().presets, next].sort((a, b) => a.minRatio - b.minRatio);
    this.commit({ ...this._state(), presets });
    return id;
  }

  deletePreset(id: string): void {
    const s = this._state();
    if (s.presets.length <= 1) return;
    const presets = s.presets.filter((p) => p.id !== id);
    const pinnedPresetId = s.pinnedPresetId === id ? null : s.pinnedPresetId;
    this.commit({ ...s, presets, pinnedPresetId });
  }

  renamePreset(id: string, name: string): void {
    this.patchPreset(id, (p) => ({ ...p, name }));
  }

  duplicatePreset(id: string): string {
    const src = this._state().presets.find((p) => p.id === id);
    if (!src) return id;
    const copyId = newId();
    const copy: FullscreenPreset = {
      ...structuredClone(src),
      id: copyId,
      name: `${src.name} 2`,
      builtIn: false,
    };
    const presets = [...this._state().presets, copy].sort((a, b) => a.minRatio - b.minRatio);
    this.commit({ ...this._state(), presets });
    return copyId;
  }

  updateSection(id: string, key: SectionKey, partial: Partial<SectionStyle>): void {
    this.patchPreset(id, (p) => ({
      ...p,
      sections: { ...p.sections, [key]: { ...p.sections[key], ...partial } },
    }));
  }

  updateBar(id: string, partial: Partial<BarStyle>): void {
    this.patchPreset(id, (p) => ({ ...p, bar: { ...p.bar, ...partial } }));
  }

  updateGap(id: string, key: keyof FullscreenPreset['gaps'], value: number): void {
    this.patchPreset(id, (p) => ({ ...p, gaps: { ...p.gaps, [key]: value } }));
  }

  private patchPreset(id: string, fn: (p: FullscreenPreset) => FullscreenPreset): void {
    const presets = this._state().presets.map((p) => (p.id === id ? fn(p) : p));
    this.commit({ ...this._state(), presets });
  }

  private commit(state: FullscreenConfigState): void {
    this._state.set(state);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(state));
      localStorage.setItem(PIN_KEY, state.pinnedPresetId ?? '');
    } catch {
      // quota/unavailable — in-memory only
    }
  }

  private load(): FullscreenConfigState {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FullscreenConfigState;
        if (parsed?.presets?.length) return this.migrate(parsed);
      }
    } catch {
      // fall through to seed
    }
    const seeded = buildDefaultState();
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(seeded));
    } catch { /* ignore */ }
    return seeded;
  }

  private migrate(state: FullscreenConfigState): FullscreenConfigState {
    if (state.version >= STATE_VERSION) return state;
    return { ...state, version: STATE_VERSION };
  }
}
