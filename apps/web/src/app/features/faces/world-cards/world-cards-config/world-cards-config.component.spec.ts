import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsConfigComponent } from './world-cards-config.component';
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

describe('WorldCardsConfigComponent', () => {
  let store: WorldCardsConfigStore;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [WorldCardsConfigComponent],
    }).compileComponents();
    store = TestBed.inject(WorldCardsConfigStore);
  });

  function mount(ratio: number) {
    const fixture = TestBed.createComponent(WorldCardsConfigComponent);
    fixture.componentRef.setInput('ratio', ratio);
    fixture.detectChanges();
    return fixture;
  }

  it('the Time slider writes the size to the resolved band; Date slider exists; no Precision slider', () => {
    const fixture = mount(1.6); // 1.6 → lap band
    const slider = fixture.nativeElement.querySelector(
      '[data-knob="time-size"]',
    ) as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(store.config('lap').sizes.time).toBe(1.5);
    expect(store.config('phone').sizes.time).toBe(1); // a different band keeps its own size
    expect(fixture.nativeElement.querySelector('[data-knob="date-size"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-knob="precision-size"]')).toBeNull();
  });
});
