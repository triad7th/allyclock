import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { MAX_CARDS } from './world-cards-config';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
};

describe('WorldCardsConfigStore', () => {
  let store: WorldCardsConfigStore;
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorldCardsConfigStore);
  });

  it('seeds fields for every band id and persists them', () => {
    expect(Object.keys(store.state().byBand).sort()).toEqual([
      'lap',
      'mini',
      'pad',
      'phone',
      'super',
      'tall',
      'ultra',
      'wide',
    ]);
    expect(JSON.parse(mem['allyclock.world-cards.config']).byBand.lap).toBeDefined();
  });

  it('addCard appends a uniquely-id card to every band, no-op at MAX', () => {
    store.addCard('Asia/Tokyo');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.map((c) => c.zone)).toContain('Asia/Tokyo');
    }
    const ids = store.sample().cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // unique ids
    while (store.sample().cards.length < MAX_CARDS) store.addCard('UTC');
    store.addCard('UTC'); // over the cap
    expect(store.sample().cards.length).toBe(MAX_CARDS);
  });

  it('removeCard broadcasts and refuses to drop the last card', () => {
    const id = store.sample().cards[0].id;
    store.removeCard(id);
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.find((c) => c.id === id)).toBeUndefined();
    }
    while (store.sample().cards.length > 1) {
      store.removeCard(store.sample().cards[0].id);
    }
    store.removeCard(store.sample().cards[0].id); // last-card guard
    expect(store.sample().cards.length).toBe(1);
  });

  it('setCardZone and setCardLineBreak broadcast to every band', () => {
    const id = store.sample().cards[1].id;
    store.setCardZone(id, 'Asia/Seoul');
    store.setCardLineBreak(id, true);
    for (const fields of Object.values(store.state().byBand)) {
      const card = fields.cards.find((c) => c.id === id)!;
      expect(card.zone).toBe('Asia/Seoul');
      expect(card.lineBreak).toBe(true);
    }
  });

  it('setSize changes only the target band and persists', () => {
    store.setSize('lap', 'time', 1.5);
    expect(store.config('lap').sizes.time).toBe(1.5);
    expect(store.config('phone').sizes.time).toBe(1); // other bands untouched
    expect(JSON.parse(mem['allyclock.world-cards.config']).byBand.lap.sizes.time).toBe(1.5);
  });

  it('fieldsFor(ratio) resolves the band containing the ratio', () => {
    store.setSize('phone', 'date', 1.8);
    expect(store.fieldsFor(0.4).sizes.date).toBe(1.8); // 0.4 → phone band
    expect(store.fieldsFor(1.6).sizes.date).toBe(1); // 1.6 → lap band
  });
});
