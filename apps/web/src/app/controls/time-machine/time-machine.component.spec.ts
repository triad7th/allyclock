import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '../../services/clock.service';

// Matches CLOSE_MS in the component: the slide-out before the sheet unmounts.
const CLOSE_MS = 280;

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
    expect(el.querySelector('.tm-backdrop')).toBeTruthy();
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
    vi.advanceTimersByTime(CLOSE_MS);
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

  it('restores live time and closes when clicking the backdrop after scrubbing', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('.tm-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    // Rollback is immediate; the sheet unmounts after the slide-out.
    expect(clock.isMocked()).toBe(false);
    vi.advanceTimersByTime(CLOSE_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('restores the prior mock when dismissed via Escape without applying', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onDaySlider('200');
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().toISOString()).toBe('2020-03-04T09:15:00.000Z');
    vi.advanceTimersByTime(CLOSE_MS);
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

  it('restores the prior zone when dismissed via the backdrop', () => {
    const clock = TestBed.inject(ClockService);
    clock.setTimeZone('Europe/Paris');
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('.tm-backdrop') as HTMLElement).click();
    fixture.detectChanges();

    // Rollback to the zone captured on open is immediate.
    expect(clock.timeZone()).toBe('Europe/Paris');
    vi.advanceTimersByTime(CLOSE_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });

  it('clears the zone on cancel when none was set before opening', () => {
    const clock = TestBed.inject(ClockService);
    const localTz = clock.timeZone();
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeZone('Asia/Tokyo');
    fixture.detectChanges();
    expect(clock.timeZone()).toBe('Asia/Tokyo');

    (el.querySelector('button.tm-corner-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.timeZone()).toBe(localTz);
    expect(clock.isMocked()).toBe(false);
  });

  it('cancels and rolls back when the X button is clicked', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    (el.querySelector('button.tm-corner-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Rollback is immediate; the sheet unmounts after the slide-out.
    expect(clock.isMocked()).toBe(false);
    vi.advanceTimersByTime(CLOSE_MS);
    fixture.detectChanges();
    expect(el.querySelector('.tm-sheet')).toBeNull();
  });
});
