import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigComponent } from './fullscreen-config.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '@core/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

function make(ratio: number) {
  const fixture = TestBed.createComponent(FullscreenConfigComponent);
  fixture.componentRef.setInput('ratio', ratio);
  fixture.detectChanges();
  return fixture;
}

describe('FullscreenConfigComponent', () => {
  let store: FullscreenConfigStore;

  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [FullscreenConfigComponent] }).compileComponents();
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('clicking the header X button emits closed after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = make(2.1);
      let closed = false;
      fixture.componentInstance.closed.subscribe(() => (closed = true));
      (fixture.nativeElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('edits the band that contains the input ratio', () => {
    const fixture = make(2.1); // mini
    expect(fixture.componentInstance.editingBand().id).toBe('mini');
  });

  it('re-selects the band when the ratio input changes', () => {
    const fixture = make(2.1);
    fixture.componentRef.setInput('ratio', 0.46); // phone
    fixture.detectChanges();
    expect(fixture.componentInstance.editingBand().id).toBe('phone');
  });

  it('moving the Time size slider updates that band sections.time.sizeScale', () => {
    const fixture = make(2.1);
    const slider = fixture.nativeElement.querySelector('[data-knob="time-size"]') as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(store.config('mini').sections.time.sizeScale).toBeCloseTo(1.5);
  });

  it('moving the Date size slider sets sizeScale on all four date parts of the band', () => {
    const fixture = make(2.1);
    const slider = fixture.nativeElement.querySelector('[data-knob="date-size"]') as HTMLInputElement;
    slider.value = '1.3';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const f = store.config('mini');
    expect(f.sections.weekday.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.month.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.day.sizeScale).toBeCloseTo(1.3);
    expect(f.sections.gmt.sizeScale).toBeCloseTo(1.3);
  });

  it('does not render the visibility toggles (they moved to the Display panel)', () => {
    const fixture = make(2.1);
    expect(fixture.nativeElement.querySelector('[data-knob="weekday-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="gmt-visible"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-knob="bar-visible"]')).toBeNull();
  });
});
