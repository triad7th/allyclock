import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SCREEN_ID } from '@core/screens/screen-id';
import { FullscreenFaceComponent } from './fullscreen-face.component';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { ClockService } from '@core/clock.service';

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

describe('FullscreenFaceComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [FullscreenFaceComponent],
      providers: [{ provide: SCREEN_ID, useValue: 1 }, FullscreenConfigStore],
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
    const store = TestBed.inject(FullscreenConfigStore);
    // Kolkata has no DST, so its compact offset is a stable "+5:30".
    store.setTimeZoneAll('Asia/Kolkata');
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // weekday, month, day, gmt spans are all present in the .date section
    expect(el.querySelector('.date .weekday')).toBeTruthy();
    expect(el.querySelector('.date .month')).toBeTruthy();
    expect(el.querySelector('.date .day')).toBeTruthy();
    const gmt = el.querySelector('.date .gmt');
    // The literal "GMT" prefix is replaced by a globe icon + compact offset.
    expect(gmt?.querySelector('app-icon.gmt-globe')).toBeTruthy();
    expect(gmt?.textContent).not.toContain('GMT');
    expect(gmt?.textContent?.trim()).toBe('+5:30');
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

  it('shows the zone flag in the date row only when the Flag toggle is on', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    // Seoul maps to a real country (KR), so the trailing flag renders.
    store.setTimeZoneAll('Asia/Seoul');
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date app-flag')).toBeNull();

    store.setFlagVisibleAll(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date app-flag')).toBeTruthy();
  });

  it('omits the trailing flag for a countryless zone, leaving only the GMT globe', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    // UTC has no country, so the trailing flag (which would fall back to a globe)
    // is suppressed to avoid a second globe colliding with the GMT-prefix globe.
    store.setTimeZoneAll('UTC');
    store.setFlagVisibleAll(true);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.date app-flag')).toBeNull();
    // Exactly one globe icon on the row: the GMT prefix, never a duplicate.
    expect(el.querySelectorAll('.date app-icon').length).toBe(1);
    expect(el.querySelector('.date .gmt-globe')).toBeTruthy();
  });

  it('shows the zone city before GMT only when the Zone toggle is on', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    store.setTimeZoneAll('America/Los_Angeles');
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.date .zone')).toBeNull();

    store.setZoneVisibleAll(true);
    fixture.detectChanges();
    const zone = el.querySelector('.date .zone');
    expect(zone?.textContent?.trim()).toBe('LOS ANGELES');
    // The zone sits ahead of the GMT offset in document order.
    const spans = Array.from(el.querySelectorAll('.date .zone, .date .gmt'));
    expect(spans.map((s) => s.className)).toEqual(['zone', 'gmt']);
  });

  it('abbreviates the zone city when the Flag toggle also shows a flag', () => {
    const store = TestBed.inject(FullscreenConfigStore);
    store.setTimeZoneAll('America/Los_Angeles');
    store.setZoneVisibleAll(true);
    store.setFlagVisibleAll(true);
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date .zone')?.textContent?.trim()).toBe('LA');
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
