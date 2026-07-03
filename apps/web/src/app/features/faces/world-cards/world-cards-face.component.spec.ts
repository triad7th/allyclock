import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SCREEN_ID } from '@core/screens/screen-id';
import { WorldCardsFaceComponent } from './world-cards-face.component';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { FaceConfigService } from '@core/face-config.service';

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

describe('WorldCardsFaceComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [WorldCardsFaceComponent],
      providers: [{ provide: SCREEN_ID, useValue: 1 }, WorldCardsConfigStore],
    }).compileComponents();
  });

  it('default cards produce 2 rows: first row 1 card, second row 2 cards', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.line');
    expect(lines).toHaveLength(2);
    expect(lines[0].querySelectorAll('app-card')).toHaveLength(1);
    expect(lines[1].querySelectorAll('app-card')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('app-card')).toHaveLength(3);
  });

  it('opens the Settings panel from the gear', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-settings')).toBeNull();
    (fixture.nativeElement.querySelector('.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-settings')).toBeTruthy();
  });

  it('renders the Adjust panel when faceConfig.adjustOpen() is set', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-config')).toBeNull();
    TestBed.inject(FaceConfigService).adjustOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-config')).toBeTruthy();
  });

  it('styleVars reflects the active band sizes', () => {
    const store = TestBed.inject(WorldCardsConfigStore);
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    // jsdom host has 0 size → ratio 1 → 'tall' band.
    store.setSize('tall', 'time', 1.5);
    fixture.detectChanges();
    expect(fixture.componentInstance.styleVars()['--wc-time-scale']).toBe('1.5');
  });
});
