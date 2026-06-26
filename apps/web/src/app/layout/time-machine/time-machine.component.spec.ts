import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '@core/clock.service';
import { SHEET_ANIMATION_MS } from '@core/animation-timing';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('TimeMachineComponent', () => {
  let clock: ClockService;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
    // Reset the singleton ClockService between tests so state does not leak.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [TimeMachineComponent] }).compileComponents();
    clock = TestBed.inject(ClockService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Zone-aware tests (zone-refactor) ──────────────────────────────────────

  it('interprets the datetime field in the selected zone (UTC, not local)', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00');
    expect(clock.now().toISOString()).toBe('2026-06-25T12:00:00.000Z'); // 12:00 UTC, not 12:00 local
  });

  it('move mode keeps the typed time and moves the instant on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC
    c.zoneChangeMode.set('move');
    c.onTimeZone('Asia/Seoul');
    // digits stay 12:00, now in Seoul → 03:00 UTC instant
    expect(clock.now().toISOString()).toBe('2026-06-25T03:00:00.000Z');
  });

  it('freeze mode keeps the instant and relabels on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC instant
    const before = clock.now().toISOString();
    c.zoneChangeMode.set('freeze');
    c.onTimeZone('Asia/Seoul');
    expect(clock.now().toISOString()).toBe(before); // instant unchanged
    expect(c.draft()).toBe('2026-06-25T21:00'); // 12:00 UTC = 21:00 Seoul
  });

  // ── Panel open/close ──────────────────────────────────────────────────────

  it('togglePanel() opens the sheet and seeds a non-empty draft', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    expect(c.panelOpen()).toBe(false);
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.panelOpen()).toBe(true);
    expect(c.draft()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
    expect(el.querySelector('.sheet-backdrop')).toBeTruthy();
  });

  it('togglePanel() a second time closes via the sheet (panelOpen becomes false after animation)', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.panelOpen()).toBe(true);
    // Second toggle: initiates close
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(c.panelOpen()).toBe(false);
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('cancel() closes via the sheet (X button)', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  // ── Live / Mock indicator ─────────────────────────────────────────────────

  it('shows a Live indicator when not mocked and Mock after scrubbing', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const liveBtn = () => el.querySelector('.tm-live-btn') as HTMLElement;
    expect(liveBtn().textContent?.trim()).toBe('Live');
    expect(liveBtn().classList.contains('is-live')).toBe(true);

    fixture.componentInstance.onTimeSlider('600');
    fixture.detectChanges();
    expect(liveBtn().textContent?.trim()).toBe('Mock');
    expect(liveBtn().classList.contains('is-live')).toBe(false);
  });

  it('the tm-button gains the active class when mocked', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.componentInstance.onDateTime('2020-03-04T09:15');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);
    expect(el.querySelector('button.tm-button')?.classList.contains('active')).toBe(true);
  });

  // ── toggleLive() ──────────────────────────────────────────────────────────

  it('toggleLive() from live freezes at the current time without closing', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(false);

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.mock()).not.toBeNull();
    // Panel stays open.
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('toggleLive() from live re-seeds the draft to a valid datetime string', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(c.draft()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('toggleLive() from mock returns to live time', () => {
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(false);
  });

  it('toggleLive() from mock with a zone override returns the zone to local', () => {
    clock.setTimeZone('Asia/Seoul');
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe(localTz);
    expect(clock.isMocked()).toBe(false);
  });

  // ── Sliders ───────────────────────────────────────────────────────────────

  it('onTimeSlider("600") mocks to 10:00 in the TM zone', () => {
    clock.setTimeZone('UTC');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('600'); // 600 minutes = 10:00
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    // In UTC zone: wall-clock hour must be 10, minute 0.
    const now = clock.now();
    expect(now.getUTCHours()).toBe(10);
    expect(now.getUTCMinutes()).toBe(0);
    // Panel stays open while scrubbing.
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('onTimeSlider scrubs the clock live (570 = 09:30 in TM zone)', () => {
    clock.setTimeZone('UTC');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570'); // 09:30
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getUTCHours()).toBe(9);
    expect(clock.now().getUTCMinutes()).toBe(30);
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('onDaySlider scrubs to a chosen day of the year', () => {
    clock.setTimeZone('UTC');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Day 60 of 2026 is March 1 (2026 is not a leap year).
    fixture.componentInstance.onDaySlider('60');
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getUTCMonth()).toBe(2); // March = 2
    expect(clock.now().getUTCDate()).toBe(1);
  });

  // ── onDateTime ────────────────────────────────────────────────────────────

  it('onDateTime mocks the clock live and keeps it on X close', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    clock.setTimeZone('UTC');
    fixture.componentInstance.onDateTime('2020-03-04T09:15');
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getFullYear()).toBe(2020);

    // Close via X: mock is kept.
    (el.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getFullYear()).toBe(2020);

    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  // ── Backdrop / Escape dismissal ───────────────────────────────────────────

  it('keeps the scrubbed time when closing via the backdrop', () => {
    clock.setTimeZone('UTC');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570'); // 09:30
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('.sheet-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getUTCHours()).toBe(9);
    expect(clock.now().getUTCMinutes()).toBe(30);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('keeps the scrubbed time when dismissed via Escape', () => {
    clock.setTimeZone('UTC');
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onDaySlider('200');
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    // Closing accepts the scrub (day 200 of 2020), not the pre-open mock.
    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getUTCFullYear()).toBe(2020);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('keeps the scrubbed time when the X is clicked', () => {
    clock.setTimeZone('UTC');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570'); // 09:30
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  // ── onTimeZone ────────────────────────────────────────────────────────────

  it('onTimeZone live-applies a chosen time zone', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Seoul');
    fixture.detectChanges();

    expect(clock.timeZone()).toBe('Asia/Seoul');
    expect(clock.isMocked()).toBe(true);
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('keeps the picked zone when dismissed via the backdrop', () => {
    clock.setTimeZone('Europe/Paris');
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('.sheet-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe('Asia/Tokyo');
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('keeps the picked zone when the X is clicked', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe('Asia/Tokyo');
  });

  // ── Tz picker sub-panel ───────────────────────────────────────────────────

  it('openTzPicker() shows the tz picker panel', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(c.tzPickerOpen()).toBe(false);
    expect(el.querySelector('.tm-tzpicker')).toBeNull();

    c.openTzPicker();
    fixture.detectChanges();

    expect(c.tzPickerOpen()).toBe(true);
    expect(el.querySelector('.tm-tzpicker')).toBeTruthy();
  });

  it('closeTzPicker() hides the tz picker panel', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    c.openTzPicker();
    fixture.detectChanges();
    expect(c.tzPickerOpen()).toBe(true);

    c.closeTzPicker();
    fixture.detectChanges();

    expect(c.tzPickerOpen()).toBe(false);
    expect(el.querySelector('.tm-tzpicker')).toBeNull();
  });

  it('the tz button in the controls panel opens the tz picker via click', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('button.tm-tz') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(c.tzPickerOpen()).toBe(true);
  });

  it('the Cancel button in the tz picker closes it', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = fixture.componentInstance;
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    c.openTzPicker();
    fixture.detectChanges();

    (el.querySelector('button.tm-tz-back') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(c.tzPickerOpen()).toBe(false);
  });

  // ── zoneOptions catalog ───────────────────────────────────────────────────

  it('zoneOptions has entries with offset-formatted labels sorted by offset', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    const opts = c.zoneOptions;
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => /[+−]\d{2}:\d{2}/.test(o.label))).toBe(true);
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i].offset).toBeGreaterThanOrEqual(opts[i - 1].offset);
    }
  });
});
