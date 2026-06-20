import { Injectable, computed, signal } from '@angular/core';
import {
  BUILT_IN_BANDS,
  DIMENSIONS_KEY,
  DIMENSIONS_VERSION,
  buildDefaultDimensions,
  type DimensionBand,
  type DimensionRegistryState,
} from './dimension-band';

function bandDistance(b: DimensionBand, ratio: number): number {
  if (ratio < b.minRatio) return b.minRatio - ratio;
  if (ratio >= b.maxRatio) return ratio - b.maxRatio;
  return 0;
}

// App-wide ratio bands ("dimension presets"). Owns band definitions only — no
// per-face style. Resolves the active band for a given width/height ratio.
@Injectable({ providedIn: 'root' })
export class DimensionRegistry {
  private readonly _state = signal<DimensionRegistryState>(this.load());
  readonly state = this._state.asReadonly();
  readonly bands = computed(() => this._state().bands);

  resolveForRatio(ratio: number): DimensionBand {
    const bands = this._state().bands;
    return (
      bands.find((b) => ratio >= b.minRatio && ratio < b.maxRatio) ??
      [...bands].sort((a, b) => bandDistance(a, ratio) - bandDistance(b, ratio))[0]
    );
  }

  private load(): DimensionRegistryState {
    try {
      const raw = localStorage.getItem(DIMENSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DimensionRegistryState;
        if (parsed?.bands?.length) return this.migrate(this.reviveRatios(parsed));
      }
    } catch {
      // fall through to seed
    }
    const seeded = buildDefaultDimensions();
    try {
      localStorage.setItem(DIMENSIONS_KEY, JSON.stringify(seeded));
    } catch {
      // quota/unavailable — in-memory only
    }
    return seeded;
  }

  // JSON serializes Infinity as null; restore the open-ended top band's bound so
  // a ratio like 8.56 keeps resolving to SUPER after a reload.
  private reviveRatios(state: DimensionRegistryState): DimensionRegistryState {
    for (const b of state.bands) {
      if (typeof b.maxRatio !== 'number') b.maxRatio = Infinity;
    }
    return state;
  }

  private migrate(state: DimensionRegistryState): DimensionRegistryState {
    if (state.version >= DIMENSIONS_VERSION) return state;
    // Older persisted band shapes are reseeded to current built-ins.
    return { version: DIMENSIONS_VERSION, bands: BUILT_IN_BANDS.map((b) => ({ ...b })) };
  }
}
