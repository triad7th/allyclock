import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '../../services/dimension-registry.service';
import { BandConfigStore } from '../band-config-store';
import { buildDefaultFields } from './fullscreen-presets.data';
import { type FullscreenFields, type SectionKey } from './fullscreen-preset';

@Injectable({ providedIn: 'root' })
export class FullscreenConfigStore extends BandConfigStore<FullscreenFields> {
  private readonly registry = inject(DimensionRegistry);

  protected storageKey(): string { return 'allyclock.fullscreen.config'; }
  protected version(): number { return 1; }
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

  setBarVisibleAll(visible: boolean): void {
    this.patchAll((f) => ({ ...f, bar: { ...f.bar, visible } }));
  }
}
