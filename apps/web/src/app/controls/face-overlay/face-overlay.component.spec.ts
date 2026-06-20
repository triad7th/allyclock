import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FaceOverlayComponent } from './face-overlay.component';
import { ClockService } from '@core/clock.service';
import { AUTO_HIDE_MS } from '@core/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

function sizedFixture(w: number, h: number) {
  const fixture = TestBed.createComponent(FaceOverlayComponent);
  const host = fixture.nativeElement as HTMLElement;
  Object.defineProperty(host, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(host, 'clientHeight', { value: h, configurable: true });
  return fixture;
}

describe('FaceOverlayComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [FaceOverlayComponent] }).compileComponents();
  });

  it('labels the viewport size and the resolved band name', async () => {
    const fixture = sizedFixture(840, 400); // ratio 2.1 → MINI
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.label') as HTMLElement;
    expect(label.textContent).toContain('840');
    expect(label.textContent).toContain('400');
    expect(label.textContent).toContain('MINI');
  });

  it('shows LIVE (green) when the clock is not mocked', () => {
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent).toContain('LIVE');
    expect(chip.classList.contains('is-live')).toBe(true);
  });

  it('shows MOCK when the clock is mocked', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date(2026, 0, 1));
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;
    expect(chip.textContent).toContain('MOCK');
    expect(chip.classList.contains('is-mock')).toBe(true);
  });

  it('is hidden while a face config panel is open', () => {
    const fixture = sizedFixture(840, 400);
    fixture.detectChanges();
    expect(fixture.componentInstance.hidden()).toBe(false);
    fixture.componentInstance['faceConfig'].open.set(true);
    expect(fixture.componentInstance.hidden()).toBe(true);
  });

  it('is hidden while the picker sheet is open (sheetOpen input)', () => {
    const fixture = sizedFixture(840, 400);
    fixture.componentRef.setInput('sheetOpen', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.hidden()).toBe(true);
  });

  it('auto-hides after AUTO_HIDE_MS and reveal() restores it', () => {
    vi.useFakeTimers();
    try {
      const fixture = sizedFixture(840, 400);
      fixture.detectChanges();
      expect(fixture.componentInstance.visible()).toBe(true);
      vi.advanceTimersByTime(AUTO_HIDE_MS);
      expect(fixture.componentInstance.visible()).toBe(false);
      fixture.componentInstance.reveal();
      expect(fixture.componentInstance.visible()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
