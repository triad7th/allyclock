import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenFaceComponent } from './fullscreen-face.component';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { ClockService } from '@core/clock.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenFaceComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [FullscreenFaceComponent],
    }).compileComponents();
  });

  it('renders the time digits', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.digits')?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('displayZone follows the clock zone by default, else the per-face zone', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    const clock = TestBed.inject(ClockService);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    // default '' → follows the clock's zone
    expect(fixture.componentInstance.displayZone()).toBe(clock.timeZone());
    // a per-face zone wins (without flipping the clock to mock)
    store.setTimeZoneAll('Asia/Seoul');
    fixture.detectChanges();
    expect(fixture.componentInstance.displayZone()).toBe('Asia/Seoul');
    expect(clock.isMocked()).toBe(false);
  });

  it('renders the date line with weekday, month, and day parts', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // weekday, month, day, gmt spans are all present in the .date section
    expect(el.querySelector('.date .weekday')).toBeTruthy();
    expect(el.querySelector('.date .month')).toBeTruthy();
    expect(el.querySelector('.date .day')).toBeTruthy();
    expect(el.querySelector('.date .gmt')?.textContent).toContain('GMT');
  });

  it('resolves landscape fields for a 2.1-ratio host (no time minCqh floor)', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activeFields().bases.time.minCqh).toBeUndefined();
  });

  it('resolves phone fields for a tall portrait host (time minCqh floor present)', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 840, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activeFields().bases.time.minCqh).toBeGreaterThan(0);
  });

  it('renders the bar per mode (divider / progress / nothing)', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });

    store.setBarModeAll('divider');
    fixture.detectChanges();
    expect(host.querySelector('.bar.divider')).toBeTruthy();
    expect(host.querySelector('.bar.progress')).toBeNull();

    store.setBarModeAll('progress');
    fixture.detectChanges();
    expect(host.querySelector('.bar.progress')).toBeTruthy();
    expect(host.querySelector('.bar.divider')).toBeNull();

    store.setBarModeAll('off');
    fixture.detectChanges();
    expect(host.querySelector('.bar')).toBeNull();
  });

  it('minuteProgress reflects the (mocked) instant within the minute', () => {
    // 22:50:30.000 → 30/60 = 0.5
    TestBed.inject(ClockService).setMock(new Date('2026-06-20T22:50:30.000-07:00'));
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.minuteProgress()).toBeCloseTo(0.5, 2);
  });

  it('renders the whisper seconds by default and hides them when toggled off', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time .seconds')).toBeTruthy();

    TestBed.inject(FullscreenConfigStore).setSecondsVisibleAll(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time .seconds')).toBeNull();
  });
});
