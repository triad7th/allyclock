import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigComponent } from './fullscreen-config.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenConfigComponent', () => {
  let store: FullscreenConfigStore;

  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [FullscreenConfigComponent],
    }).compileComponents();
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('clicking the header X button emits closed after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(FullscreenConfigComponent);
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

  it('auto-selects the preset matching the current screen dimensions', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.editingId()).toBe(store.resolveForRatio(component.currentRatio()).id);
  });

  it('follows the viewport on resize, re-selecting the matching band', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const ow = window.innerWidth;
    const oh = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { value: 2000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
      component.onViewportResize();
      fixture.detectChanges();
      expect(component.editingId()).toBe('mini'); // 2000/1000 = 2.0 → mini band
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: ow, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: oh, configurable: true });
    }
  });

  it('moving the Time size slider updates sections.time.sizeScale in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const slider = fixture.nativeElement.querySelector(
      '[data-knob="time-size"]',
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.sections.time.sizeScale).toBeCloseTo(1.5);
  });

  it('moving the Date size slider sets sizeScale to the same value on all four date parts', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const slider = fixture.nativeElement.querySelector(
      '[data-knob="date-size"]',
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '1.3';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.sections.weekday.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.month.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.day.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.gmt.sizeScale).toBeCloseTo(1.3);
  });

  it('does not render the visibility toggles (they moved to the Display panel)', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-knob="weekday-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="gmt-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="bar-visible"]')).toBeNull();
  });
});
