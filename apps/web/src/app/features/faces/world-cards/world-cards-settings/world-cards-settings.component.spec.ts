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

  it('section-mode control broadcasts the mode to every band', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-mode="two"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sectionMode).toBe('two');
    }
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

  it('span toggle writes the card span to every band', () => {
    const fixture = TestBed.createComponent(WorldCardsSettingsComponent);
    fixture.detectChanges();
    // Second card defaults to 'cell'; click its Full button.
    const rows = fixture.nativeElement.querySelectorAll('.city-row');
    (rows[1].querySelector('[data-span="full"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const id = store.sample().cards[1].id;
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.cards.find((c) => c.id === id)!.span).toBe('full');
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
