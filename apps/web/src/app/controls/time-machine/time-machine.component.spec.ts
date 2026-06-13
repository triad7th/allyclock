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
