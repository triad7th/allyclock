import { Signal, signal } from '@angular/core';

export interface BandConfigState<T> {
  version: number;
  byBand: Record<string, T>; // keyed by DimensionBand.id
}

// Generic per-face config keyed by dimension-band id. Subclasses provide the
// storage key, version, and default fields per band. Persistence + immutable
// updates are shared. Subclasses MUST call `this.init()` from their constructor
// (after `super()`), so injected dependencies are available before loading.
export abstract class BandConfigStore<T> {
  protected abstract storageKey(): string;
  protected abstract version(): number;
  protected abstract buildDefaults(): Record<string, T>;

  private readonly _state = signal<BandConfigState<T>>({ version: 0, byBand: {} });
  readonly state: Signal<BandConfigState<T>> = this._state.asReadonly();

  protected init(): void {
    this._state.set(this.load());
  }

  // Current fields for a band id. Defensive: a band id that exists in the
  // registry but is missing from byBand (the two persist separately) falls back
  // to a freshly built default, never undefined (it feeds varsFor).
  config(bandId: string): T {
    const byBand = this._state().byBand;
    return byBand[bandId] ?? this.buildDefaults()[bandId] ?? Object.values(byBand)[0];
  }

  protected patch(bandId: string, fn: (t: T) => T): void {
    const byBand = { ...this._state().byBand, [bandId]: fn(this.config(bandId)) };
    this.commit({ ...this._state(), byBand });
  }

  protected patchAll(fn: (t: T) => T): void {
    const byBand: Record<string, T> = {};
    for (const [id, fields] of Object.entries(this._state().byBand)) byBand[id] = fn(fields);
    this.commit({ ...this._state(), byBand });
  }

  private load(): BandConfigState<T> {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as BandConfigState<T>;
        if (parsed?.byBand) return this.migrate(parsed);
      }
    } catch {
      // fall through to seed
    }
    const seeded: BandConfigState<T> = { version: this.version(), byBand: this.buildDefaults() };
    this.persist(seeded);
    return seeded;
  }

  // Combine one band's default with its persisted value. Default: take the
  // persisted band wholesale (band-id-level merge — historical behavior).
  // Override to do field-level migration (fill new fields, translate shapes).
  protected mergeBand(defaults: T, persisted: T): T {
    return persisted ?? defaults;
  }

  // Additive: every default band id is present; a persisted band is combined
  // with its default via mergeBand (so new fields can be filled). Never wipes.
  protected migrate(state: BandConfigState<T>): BandConfigState<T> {
    const defaults = this.buildDefaults();
    const byBand: Record<string, T> = {};
    for (const id of Object.keys(defaults)) {
      byBand[id] = id in state.byBand ? this.mergeBand(defaults[id], state.byBand[id]) : defaults[id];
    }
    // Carry any persisted band ids not in defaults (forward-compat), untouched.
    for (const id of Object.keys(state.byBand)) {
      if (!(id in byBand)) byBand[id] = state.byBand[id];
    }
    const migrated: BandConfigState<T> = { version: this.version(), byBand };
    if (
      state.version !== this.version() ||
      Object.keys(byBand).length !== Object.keys(state.byBand).length
    ) {
      this.persist(migrated);
    }
    return migrated;
  }

  private commit(state: BandConfigState<T>): void {
    this._state.set(state);
    this.persist(state);
  }

  private persist(state: BandConfigState<T>): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(state));
    } catch {
      // quota/unavailable — in-memory only
    }
  }
}
