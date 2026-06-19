import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenTogglesComponent } from './fullscreen-toggles.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';

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

  it('toggling Weekday writes visible to every preset', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();

    const before = store.state().presets[0].sections.weekday.visible;
    (
      fixture.nativeElement.querySelector('[data-knob="weekday-visible"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    for (const p of store.state().presets) {
      expect(p.sections.weekday.visible).toBe(!before);
    }
  });

  it('toggling GMT writes visible to every preset', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();

    const before = store.state().presets[0].sections.gmt.visible;
    (
      fixture.nativeElement.querySelector('[data-knob="gmt-visible"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    for (const p of store.state().presets) {
      expect(p.sections.gmt.visible).toBe(!before);
    }
  });

  it('toggling Bar writes visible to every preset', () => {
    const fixture = TestBed.createComponent(FullscreenTogglesComponent);
    fixture.detectChanges();

    const before = store.state().presets[0].bar.visible;
    (
      fixture.nativeElement.querySelector('[data-knob="bar-visible"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    for (const p of store.state().presets) {
      expect(p.bar.visible).toBe(!before);
    }
  });
});
