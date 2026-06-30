import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { BandConfigStore } from '@core/dimensions/band-config-store';
import { buildDefaultFields } from './world-cards-presets.data';
import {
  type WorldCardsFields,
  type WorldCardConfig,
  type SectionMode,
  type CardSpan,
  type WorldCardSizes,
  MIN_CARDS,
  MAX_CARDS,
} from './world-cards-config';

@Injectable({ providedIn: 'root' })
export class WorldCardsConfigStore extends BandConfigStore<WorldCardsFields> {
  private readonly registry = inject(DimensionRegistry);

  protected storageKey(): string {
    return 'allyclock.world-cards.config';
  }
  protected version(): number {
    return 1;
  }
  protected buildDefaults(): Record<string, WorldCardsFields> {
    return buildDefaultFields();
  }

  constructor() {
    super();
    this.init();
  }

  // Fields for the band that contains the given ratio.
  fieldsFor(ratio: number): WorldCardsFields {
    return this.config(this.registry.resolveForRatio(ratio).id);
  }

  // cards + sectionMode are broadcast to every band, so any band is a faithful
  // sample for reading those global values.
  sample(): WorldCardsFields {
    return Object.values(this.state().byBand)[0];
  }

  private nextId(): number {
    const ids = this.sample().cards.map((c) => c.id);
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  setSectionModeAll(mode: SectionMode): void {
    this.patchAll((f) => ({ ...f, sectionMode: mode }));
  }

  // Global: broadcast the new card list to every band. No-op at MAX_CARDS.
  addCard(zone: string): void {
    if (this.sample().cards.length >= MAX_CARDS) return;
    const card: WorldCardConfig = { id: this.nextId(), zone, span: 'cell' };
    this.patchAll((f) => ({ ...f, cards: [...f.cards, { ...card }] }));
  }

  removeCard(id: number): void {
    if (this.sample().cards.length <= MIN_CARDS) return;
    this.patchAll((f) => ({ ...f, cards: f.cards.filter((c) => c.id !== id) }));
  }

  setCardZone(id: number, zone: string): void {
    this.patchAll((f) => ({
      ...f,
      cards: f.cards.map((c) => (c.id === id ? { ...c, zone } : c)),
    }));
  }

  setCardSpan(id: number, span: CardSpan): void {
    this.patchAll((f) => ({
      ...f,
      cards: f.cards.map((c) => (c.id === id ? { ...c, span } : c)),
    }));
  }

  // Per-band (resolution-based): only the given band's sizes change.
  setSize(bandId: string, key: keyof WorldCardSizes, value: number): void {
    this.patch(bandId, (f) => ({ ...f, sizes: { ...f.sizes, [key]: value } }));
  }

  // Field-level migration: fill any missing field from defaults without dropping
  // the persisted card list or per-band sizes.
  protected override mergeBand(
    defaults: WorldCardsFields,
    persisted: WorldCardsFields,
  ): WorldCardsFields {
    return {
      sectionMode: persisted.sectionMode ?? defaults.sectionMode,
      cards: persisted.cards ?? defaults.cards,
      sizes: { ...defaults.sizes, ...persisted.sizes },
    };
  }
}
