import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenTogglesComponent } from './fullscreen-toggles.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '@core/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenTogglesComponent', () => {
  let store: FullscreenConfigStore;

  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [FullscreenTogglesComponent],
    }).compileComponents();
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('clicking the header X button emits closed after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(FullscreenTogglesComponent);
      fixture.detectChanges();
      let closed = false;
      fixture.componentInstance.closed.subscribe(() => (closed = true));
      (
        fixture.nativeElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement
      ).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('toggling Weekday writes visible to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().sections.weekday.visible;
    (fixture.nativeElement.querySelector('[data-knob="weekday-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.weekday.visible).toBe(!before);
    }
  });

  it('toggling GMT writes visible to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().sections.gmt.visible;
    (fixture.nativeElement.querySelector('[data-knob="gmt-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.sections.gmt.visible).toBe(!before);
    }
  });

  it('toggling Seconds broadcasts visibility to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const before = store.sample().secondsVisible;
    (fixture.nativeElement.querySelector('[data-knob="seconds-visible"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.secondsVisible).toBe(!before);
    }
  });

  it('renders the Bar segmented control with the active mode marked', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    const on = fixture.nativeElement.querySelector('[data-knob="bar-mode"] [aria-checked="true"]') as HTMLElement;
    expect(on.getAttribute('data-mode')).toBe('progress'); // default
  });

  it('clicking a Bar segment broadcasts the mode to every band', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-mode="off"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.bar.mode).toBe('off');
    }
  });

  it('the Time Zone card opens the zone picker sub-view', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeNull();
    (fixture.nativeElement.querySelector('[data-knob="time-zone"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-zone-picker')).toBeTruthy();
  });

  it('picking a zone broadcasts it to every band; Follow ("") resets', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();
    fixture.componentInstance.pickZone('Asia/Seoul');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.timeZone).toBe('Asia/Seoul');
    }
    fixture.componentInstance.pickZone('');
    for (const fields of Object.values(store.state().byBand)) {
      expect(fields.timeZone).toBe('');
    }
  });
});
