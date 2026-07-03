import { Injectable, inject } from '@angular/core';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { SCREEN_ID } from '@core/screens/screen-id';
import { BandConfigStore } from '@core/dimensions/band-config-store';
import { buildDefaultFields } from './world-cards-presets.data';
import {
  type WorldCardsFields,
  type WorldCardConfig,
  type WorldCardSizes,
  MIN_CARDS,
  MAX_CARDS,
} from './world-cards-config';

@Injectable()
export class WorldCardsConfigStore extends BandConfigStore<WorldCardsFields> {
  private readonly registry = inject(DimensionRegistry);
  private readonly screenId = inject(SCREEN_ID);

  protected storageKey(): string {
    return `allyclock.screen.${this.screenId}.world-cards.config`;
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

  // cards are broadcast to every band, so any band is a faithful
  // sample for reading those global values.
  sample(): WorldCardsFields {
    return Object.values(this.state().byBand)[0] ?? Object.values(this.buildDefaults())[0];
  }

  private nextId(): number {
    const ids = this.sample().cards.map((c) => c.id);
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  // Global: broadcast the new card list to every band. No-op at MAX_CARDS.
  addCard(zone: string): void {
    if (this.sample().cards.length >= MAX_CARDS) return;
    const card: WorldCardConfig = { id: this.nextId(), zone, lineBreak: false };
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

  setCardLineBreak(id: number, lineBreak: boolean): void {
    this.patchAll((f) => ({
      ...f,
      cards: f.cards.map((c) => (c.id === id ? { ...c, lineBreak } : c)),
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
      // Cards are migrated wholesale (all-or-nothing). If WorldCardConfig ever
      // gains a field, heal per-card here instead of taking persisted as-is.
      cards: persisted.cards ?? defaults.cards,
      sizes: { ...defaults.sizes, ...persisted.sizes },
    };
  }
}
