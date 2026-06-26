import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { BandConfigStore } from '@core/dimensions/band-config-store';
import { buildDefaultFields } from './fullscreen-presets.data';
import { type FullscreenFields, type SectionKey, type BarMode } from './fullscreen-preset';

@Injectable({ providedIn: 'root' })
export class FullscreenConfigStore extends BandConfigStore<FullscreenFields> {
  private readonly registry = inject(DimensionRegistry);

  protected storageKey(): string { return 'allyclock.fullscreen.config'; }
  protected version(): number { return 3; }
  protected buildDefaults(): Record<string, FullscreenFields> { return buildDefaultFields(); }

  constructor() {
    super();
    this.init();
  }

  // Fields for the band that contains the given ratio.
  fieldsFor(ratio: number): FullscreenFields {
    return this.config(this.registry.resolveForRatio(ratio).id);
  }

  // Visibility is uniform across bands (toggles broadcast), so any band's fields
  // are a faithful sample for reading the current toggle state.
  sample(): FullscreenFields {
    return Object.values(this.state().byBand)[0];
  }

  updateSection(bandId: string, key: SectionKey, partial: Partial<FullscreenFields['sections'][SectionKey]>): void {
    this.patch(bandId, (f) => ({
      ...f,
      sections: { ...f.sections, [key]: { ...f.sections[key], ...partial } },
    }));
  }

  updateBar(bandId: string, partial: Partial<FullscreenFields['bar']>): void {
    this.patch(bandId, (f) => ({ ...f, bar: { ...f.bar, ...partial } }));
  }

  updateGap(bandId: string, key: keyof FullscreenFields['gaps'], value: number): void {
    this.patch(bandId, (f) => ({ ...f, gaps: { ...f.gaps, [key]: value } }));
  }

  // Dimension-agnostic visibility: write the value to EVERY band. The per-band
  // field is preserved so per-band control can be revived later.
  setSectionVisibleAll(key: SectionKey, visible: boolean): void {
    this.patchAll((f) => ({ ...f, sections: { ...f.sections, [key]: { ...f.sections[key], visible } } }));
  }

  setBarModeAll(mode: BarMode): void {
    this.patchAll((f) => ({ ...f, bar: { ...f.bar, mode } }));
  }

  setSecondsVisibleAll(visible: boolean): void {
    this.patchAll((f) => ({ ...f, secondsVisible: visible }));
  }

  setTimeZoneAll(timeZone: string): void {
    this.patchAll((f) => ({ ...f, timeZone }));
  }

  // Field-level migration: fill new fields (secondsVisible, bar.mode) from the
  // band's default while keeping persisted tuning; translate a legacy
  // bar.visible boolean into the new bar.mode.
  protected override mergeBand(defaults: FullscreenFields, persisted: FullscreenFields): FullscreenFields {
    const legacy = persisted.bar as Partial<FullscreenFields['bar']> & { visible?: boolean };
    const mode: BarMode =
      legacy.mode ?? (legacy.visible === false ? 'off' : legacy.visible === true ? 'divider' : defaults.bar.mode);
    return {
      ...defaults,
      ...persisted,
      bar: { mode, sizeScale: legacy.sizeScale ?? defaults.bar.sizeScale, opacity: legacy.opacity ?? defaults.bar.opacity },
      secondsVisible: persisted.secondsVisible ?? defaults.secondsVisible,
      timeZone: persisted.timeZone ?? defaults.timeZone,
    };
  }
}
