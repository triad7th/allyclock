import { Injectable, signal } from '@angular/core';
import {
  PRESETS_KEY,
  STATE_VERSION,
  type FullscreenConfigState,
  type FullscreenPreset,
  type SectionKey,
  type SectionStyle,
  type BarStyle,
} from './fullscreen-preset';
import { buildDefaultState } from './fullscreen-presets.data';

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

  renamePreset(id: string, name: string): void {
    this.patchPreset(id, (p) => ({ ...p, name }));
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

  setShowWeekday(v: boolean): void {
    this.commit({ ...this._state(), showWeekday: v });
  }

  setShowGmt(v: boolean): void {
    this.commit({ ...this._state(), showGmt: v });
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
    } catch {
      // quota/unavailable — in-memory only
    }
  }

  private load(): FullscreenConfigState {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FullscreenConfigState;
        if (parsed?.presets?.length) return this.migrate(this.reviveRatios(parsed));
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

  // JSON serializes Infinity as null, which would break the open-ended top
  // band's upper bound (e.g. SUPER's maxRatio) on reload — a ratio like 8.56
  // would then fail `ratio < maxRatio` and resolve to the wrong band. Restore it.
  private reviveRatios(state: FullscreenConfigState): FullscreenConfigState {
    for (const p of state.presets) {
      if (typeof p.maxRatio !== 'number') p.maxRatio = Infinity;
    }
    return state;
  }

  private migrate(state: FullscreenConfigState): FullscreenConfigState {
    if (state.version >= STATE_VERSION) return state;
    // The band structure changed incompatibly across versions (band ids/shape,
    // the global showWeekday/showGmt flags, removed per-section visibility), so
    // older persisted state is reseeded to current defaults rather than carried
    // forward partially. A future minor version can switch to additive merging.
    return buildDefaultState();
  }
}
