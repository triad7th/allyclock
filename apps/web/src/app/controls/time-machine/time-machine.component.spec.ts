import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '../../services/clock.service';

describe('TimeMachineComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
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

  it('opens the picker panel when the button is clicked', () => {
    const { fixture, el } = create();
    expect(el.querySelector('.tm-panel')).toBeNull();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.tm-panel')).toBeTruthy();
  });

  it('shows a Live indicator when not mocked and Mock after applying', () => {
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const status = () => el.querySelector('.tm-status') as HTMLElement;
    expect(status().textContent?.trim()).toBe('Live');
    expect(status().classList.contains('mock')).toBe(false);

    fixture.componentInstance.onTimeSlider('600');
    fixture.detectChanges();
    expect(status().textContent?.trim()).toBe('Mock');
    expect(status().classList.contains('mock')).toBe(true);
  });

  it('applies the drafted time as a mock and marks the button active', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.draft.set('2020-03-04T09:15');
    (el.querySelector('button.tm-apply') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().getFullYear()).toBe(2020);
    expect(el.querySelector('.tm-panel')).toBeNull();
    expect(el.querySelector('button.tm-button')?.classList.contains('active')).toBe(true);
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
    // Panel stays open while scrubbing.
    expect(el.querySelector('.tm-panel')).toBeTruthy();
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

  it('restores live time and closes when clicking outside after scrubbing', () => {
    const clock = TestBed.inject(ClockService);
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onTimeSlider('570');
    fixture.detectChanges();
    expect(clock.isMocked()).toBe(true);

    document.dispatchEvent(new Event('pointerdown'));
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(false);
    expect(el.querySelector('.tm-panel')).toBeNull();
  });

  it('restores the prior mock when dismissed without applying', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance.onDaySlider('200');
    fixture.detectChanges();

    document.dispatchEvent(new Event('pointerdown'));
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(true);
    expect(clock.now().toISOString()).toBe('2020-03-04T09:15:00.000Z');
    expect(el.querySelector('.tm-panel')).toBeNull();
  });

  it('returns to live time via the Live button', () => {
    const clock = TestBed.inject(ClockService);
    clock.setMock(new Date('2020-03-04T09:15:00.000Z'));
    const { fixture, el } = create();
    (el.querySelector('button.tm-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('button.tm-live') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(clock.isMocked()).toBe(false);
  });
});
