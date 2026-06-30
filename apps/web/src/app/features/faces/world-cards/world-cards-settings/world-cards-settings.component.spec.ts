import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsSettingsComponent } from './world-cards-settings.component';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';

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

describe('WorldCardsSettingsComponent', () => {
  let store: WorldCardsConfigStore;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [WorldCardsSettingsComponent] }).compileComponents();
    store = TestBed.inject(WorldCardsConfigStore);
  });

  it('renders one row per card and adds a card on Add City', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(3);
    (fixture.nativeElement.querySelector('[data-knob="add-card"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(4);
  });

  it('removes a card and hides the remove control at the last card', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(2);
    // Down to one card: the remove controls disappear (last-card guard).
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.city-row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-knob="card-remove"]')).toBeNull();
  });

  it('line-break toggle flips the card lineBreak for that card across every band', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    // First card defaults to lineBreak: true; click its toggle (turns off).
    const rows = fixture.nativeElement.querySelectorAll('.city-row');
    (rows[0].querySelector('[data-knob="card-linebreak"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const id = store.sample().cards[0].id;
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.find((c) => c.id === id)!.lineBreak).toBe(false);
    }
  });

  it('opens the zone picker and applies the picked zone to that card', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    const firstId = store.sample().cards[0].id;
    (fixture.nativeElement.querySelector('.city-row [data-knob="card-zone"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeTruthy();
    fixture.componentInstance.pickZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(store.sample().cards.find((c) => c.id === firstId)!.zone).toBe('Asia/Tokyo');
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeNull();
  });
});
