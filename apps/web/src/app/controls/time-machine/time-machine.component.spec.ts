import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '../../services/clock.service';
import { SHEET_ANIMATION_MS } from '../../config/animation-timing';

describe('TimeMachineComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
    // Reset the singleton ClockService between tests so a mock applied in one
    // test does not leak into the next via the providedIn: 'root' instance.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TimeMachineComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create() {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('opens the bottom sheet when the button is clicked', () => {
    const { fixture, el } = create();
    expect(el.querySelector('.tm-sheet')).toBeNull();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
    expect(el.querySelector('.sheet-backdrop')).toBeTruthy();
  });

  it('shows a Live indicator when not mocked and Mock after scrubbing', () => {
    const { fixture, el } = create();
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

  it('applies the drafted time as a mock and marks the button active', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.draft.set('2020-03-04T09:15');
    (el.querySelector('button.tm-corner-apply') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Clock side-effect is immediate.
    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getFullYear()).toBe(2020);
    expect(el.querySelector('button.tm-button')?.classList.contains('active')).toBe(true);

    // The sheet slides out, then unmounts after the animation.
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('scrubs the clock live when the time slider moves', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // 09:30 === 570 minutes into the day.
    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getHours()).toBe(9);
    expect(clock.now().getMinutes()).toBe(30);
    // Sheet stays open while scrubbing.
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('scrubs to a chosen day of the year via the day slider', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Day 60 of 2026 is March 1.
    fixture.componentInstance.onDaySlider('60');
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getMonth()).toBe(2);
    expect(clock.now().getDate()).toBe(1);
  });

  it('keeps the scrubbed time and closes when clicking the backdrop', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('.sheet-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    // Closing accepts: the scrubbed mock is kept.
    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getHours()).toBe(9);
    expect(clock.now().getMinutes()).toBe(30);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('keeps the scrubbed time when dismissed via Escape', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onDaySlider('200');
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    // Closing accepts the scrub (day 200 of 2020), not the pre-open mock.
    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getFullYear()).toBe(2020);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('returns to live time via the Live button', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(false);
  });

  it('live-applies a chosen time zone via onTimeZone', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Seoul');
    fixture.detectChanges();

    expect(clock.timeZone()).toBe('Asia/Seoul');
    expect(clock.isMocked()).toBe(true);
    // Sheet stays open while picking.
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('returns the zone to local via the Live button', () => {
    const clock = TestBed.inject(ClockService);
    const localTz = clock.timeZone();
    clock.setTimeZone('Asia/Seoul');
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe(localTz);
    expect(clock.isMocked()).toBe(false);
  });

  it('keeps the picked zone when dismissed via the backdrop', () => {
    const clock = TestBed.inject(ClockService);
    clock.setTimeZone('Europe/Paris');
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('.sheet-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    // Closing accepts the picked zone.
    expect(clock.timeZone()).toBe('Asia/Tokyo');
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('keeps the picked zone when the X is clicked', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('button.tm-corner-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe('Asia/Tokyo');
  });

  it('freezes at the current time when the Live switch is toggled to mock, without closing', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(false);

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Now frozen (mocked) and the panel stays open.
    expect(clock.isMocked()).toBe(true);
    expect(clock.mock()).not.toBeNull();
    expect(el.querySelector('.tm-sheet')).toBeTruthy();
  });

  it('syncs the zone combobox back to local when toggled to live', () => {
    const clock = TestBed.inject(ClockService);
    const localTz = clock.timeZone();
    clock.setTimeZone('Asia/Seoul');
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.tzDraft()).toBe('Asia/Seoul');

    (el.querySelector('.tm-live-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe(localTz);
    expect(fixture.componentInstance.tzDraft()).toBe(localTz);
  });

  it('labels zone options with their offset and sorts them by offset', () => {
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const opts = fixture.componentInstance.timeZoneOptions();
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => /[+−]\d{2}:\d{2}/.test(o.label))).toBe(true);
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i].offset).toBeGreaterThanOrEqual(opts[i - 1].offset);
    }
  });

  it('searches and picks a zone from the Time Zone picker', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.openTzPicker();
    fixture.detectChanges();
    expect(el.querySelector('.tm-tzpicker')).toBeTruthy();

    fixture.componentInstance.tzQuery.set('Seoul');
    fixture.detectChanges();
    const filtered = fixture.componentInstance.filteredZones();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((z) => z.label.toLowerCase().includes('seoul'))).toBe(true);

    fixture.componentInstance.pickTimeZone('Asia/Seoul');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Seoul');
    expect(fixture.componentInstance.tzPickerOpen()).toBe(false);
  });

  it('keeps the scrubbed time when the X is clicked', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('button.tm-corner-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Closing accepts: the mock is kept.
    expect(clock.isMocked()).toBe(true);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });
});
